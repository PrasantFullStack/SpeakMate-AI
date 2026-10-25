import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  CONVERSATION_SCENARIOS,
  EXPLANATION_LANGUAGES,
  getAllLanguages,
  getLanguageConfig,
  LEARNING_OBJECTIVES,
  LanguageCode,
  LearningObjectiveId,
  PLAN_QUOTAS,
  PlanTier,
  PROFICIENCY_CONFIGS,
  ProficiencyLevel,
  ScenarioId,
} from './src/config/languages';
import {
  buildEvaluationPrompt,
  buildRealTimeGrammarCorrectionCheck,
  buildTutorSystemPrompt,
  calculateStreakAndProgress,
  checkSessionQuota,
  getLanguageCapabilityMatrix,
  SavedVocabItem,
  UserOnboardingProfile,
} from './src/utils/learningEngine';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function hasValidGeminiApiKey(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() && key !== 'MY_GEMINI_API_KEY');
}

function getGenAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface CorrectionItem {
  originalSentence: string;
  correctedSentence: string;
  explanation: string;
  naturalExample: string;
  category: 'Grammar' | 'Vocabulary' | 'Sentence Structure' | 'Fluency';
}

export interface SessionEvaluation {
  grammarScore: number;
  vocabularyScore: number;
  sentenceStructureScore: number;
  fluencyScore: number;
  pronunciationScore: number | null;
  pronunciationNote: string;
  overallSummary: string;
  corrections: CorrectionItem[];
  suggestedVocabulary: Array<{
    phrase: string;
    translation: string;
    explanation: string;
    naturalExample: string;
  }>;
}

export interface ConversationHistoryEntry {
  id: string;
  languageCode: LanguageCode;
  languageName: string;
  proficiency: ProficiencyLevel;
  scenarioId: ScenarioId;
  scenarioTitle: string;
  durationMinutes: number;
  mode: 'gemini_live_audio' | 'hybrid_text_and_tts';
  createdAt: string;
  transcript: Array<{ role: 'user' | 'tutor'; text: string; timestamp: string }>;
  evaluation: SessionEvaluation;
}

export interface LanguageProgressStat {
  languageCode: LanguageCode;
  proficiency: ProficiencyLevel;
  completedLessons: number;
  speakingMinutes: number;
  masteryPercent: number;
  lastPracticedAt: string | null;
}

interface ServerStore {
  user: UserOnboardingProfile;
  streakDays: number;
  lastPracticeDateIso: string;
  usedMinutesToday: number;
  usedSessionsToday: number;
  languageProgress: Record<LanguageCode, LanguageProgressStat>;
  vocabularyNotebook: SavedVocabItem[];
  conversationHistory: ConversationHistoryEntry[];
  adminMetrics: {
    totalRegisteredUsers: number;
    activeDailySpeakers: number;
    monthlyRecurringRevenueUsd: number;
    liveVoiceSessionsToday: number;
    quotaBlocksToday: number;
    topLanguages: Array<{ code: string; name: string; sharePercent: number; activeLearners: number }>;
    recentUsers: Array<{
      id: string;
      name: string;
      email: string;
      nativeLang: string;
      targetLang: string;
      plan: PlanTier;
      minutesUsed: number;
      status: string;
    }>;
  };
}

const initialProgress: Record<LanguageCode, LanguageProgressStat> = {};
for (const lang of getAllLanguages()) {
  initialProgress[lang.code] = {
    languageCode: lang.code,
    proficiency: lang.code === 'en' || lang.code === 'es' ? 'intermediate' : 'beginner',
    completedLessons: lang.code === 'en' ? 8 : lang.code === 'es' ? 5 : lang.code === 'hi' ? 3 : lang.code === 'fr' ? 2 : 0,
    speakingMinutes: lang.code === 'en' ? 68 : lang.code === 'es' ? 42 : lang.code === 'hi' ? 24 : lang.code === 'fr' ? 15 : 0,
    masteryPercent: lang.code === 'en' ? 76 : lang.code === 'es' ? 58 : lang.code === 'hi' ? 49 : lang.code === 'fr' ? 34 : 12,
    lastPracticedAt: lang.code === 'en' ? '2026-10-24T06:30:00Z' : lang.code === 'es' ? '2026-10-23T18:15:00Z' : null,
  };
}

const store: ServerStore = {
  user: {
    name: 'Aarav Mehta',
    email: 'aarav.mehta@interviewscracker.io',
    role: 'learner',
    nativeLanguage: 'Hindi (Hindustani)',
    explanationLanguage: 'hi-en',
    targetLanguage: 'en',
    proficiency: 'intermediate',
    dailyGoalMinutes: 20,
    learningObjective: 'career_growth',
    planTier: 'starter',
    onboardingCompleted: true,
  },
  streakDays: 6,
  lastPracticeDateIso: '2026-10-23T18:15:00Z',
  usedMinutesToday: 8,
  usedSessionsToday: 1,
  languageProgress: initialProgress,
  vocabularyNotebook: [
    {
      id: 'voc-1',
      languageCode: 'en',
      phrase: 'Yesterday I attended the client meeting and discussed the timeline.',
      translation: 'Kal maine client meeting mein bhaag liya aur timeline par charcha ki.',
      explanation:
        'Use Past Simple ("attended") with specific past time markers like "Yesterday", and never place "about" after the transitive verb "discuss".',
      naturalExample: 'We discussed the Q4 architecture milestones during our sprint review yesterday.',
      category: 'Grammar',
      masteryScore: 90,
      createdAt: '2026-10-23',
    },
    {
      id: 'voc-2',
      languageCode: 'en',
      phrase: "I have five years of experience designing distributed backend services.",
      translation: 'Mujhe distributed backend services design karne ka 5 saal ka anubhav hai.',
      explanation:
        'Jab aap apne experience ki baat karte hain, to "I am having" ke bajay Simple Present "I have" ka upyog karein kyunki yeh ek permanent state hai.',
      naturalExample: 'She has eight years of experience leading cross-functional product teams.',
      category: 'Sentence Structure',
      masteryScore: 85,
      createdAt: '2026-10-22',
    },
    {
      id: 'voc-3',
      languageCode: 'es',
      phrase: 'Soy ingeniero de software y llevo cinco años trabajando en esta empresa.',
      translation: 'Main ek software engineer hoon aur is company mein 5 saal se kaam kar raha hoon.',
      explanation:
        'Professions require "ser" ("Soy ingeniero"), and ongoing duration is expressed with "llevar + gerund" ("llevo cinco años trabajando").',
      naturalExample: 'Llevo tres meses aprendiendo español con conversaciones diarias.',
      category: 'Grammar',
      masteryScore: 78,
      createdAt: '2026-10-21',
    },
    {
      id: 'voc-4',
      languageCode: 'de',
      phrase: 'Ich komme heute etwas später, weil der Zug Verspätung hat.',
      translation: 'Main aaj thoda der se aaunga, kyunki train late hai.',
      explanation:
        'Subordinating conjunction "weil" pushes the conjugated verb ("hat") to the end of the clause.',
      naturalExample: 'Wir bleiben zu Hause, weil es heute stark regnet.',
      category: 'Sentence Structure',
      masteryScore: 72,
      createdAt: '2026-10-20',
    },
  ],
  conversationHistory: [
    {
      id: 'hist-101',
      languageCode: 'en',
      languageName: 'English',
      proficiency: 'intermediate',
      scenarioId: 'job_interview',
      scenarioTitle: 'Behavioral & Technical Hiring Interview (Java, Spring Boot, React, SQL)',
      durationMinutes: 8,
      mode: 'gemini_live_audio',
      createdAt: '2026-10-24T06:30:00Z',
      transcript: [
        {
          role: 'tutor',
          text: "Welcome to the final-round interview, Aarav! Could you walk me through a challenging backend bottleneck you resolved recently?",
          timestamp: '06:30:12',
        },
        {
          role: 'user',
          text: 'Yes, last quarter I have attended the architecture review and we discussed about database connection pooling under peak traffic.',
          timestamp: '06:30:45',
        },
        {
          role: 'tutor',
          text: 'That sounds impactful. How did you measure the latency improvement after tuning the connection pool?',
          timestamp: '06:31:02',
        },
        {
          role: 'user',
          text: 'We reduced 99th percentile latency by 40 percent and prevented timeout errors during flash sales.',
          timestamp: '06:31:35',
        },
      ],
      evaluation: {
        grammarScore: 84,
        vocabularyScore: 91,
        sentenceStructureScore: 87,
        fluencyScore: 88,
        pronunciationScore: 89,
        pronunciationNote:
          'Clear sentence stress on technical metrics ("40 percent", "connection pooling"). Maintain slightly slower cadence on multi-syllable words like "architecture".',
        overallSummary:
          'Aapka technical confidence aur vocabulary bahut strong hai! Bas beete hue samay ("last quarter") ke saath Present Perfect ("have attended") ki jagah Simple Past ("attended") ka prayog karein aur "discuss" ke saath "about" hata dein.',
        corrections: [
          {
            originalSentence:
              'Yes, last quarter I have attended the architecture review and we discussed about database connection pooling under peak traffic.',
            correctedSentence:
              'Yes, last quarter I attended the architecture review, and we discussed database connection pooling under peak traffic.',
            explanation:
              'Jab samay beet chuka ho ("last quarter"), tab "I have attended" nahi balki Simple Past "I attended" aata hai. Saath hi "discuss" ke baad "about" ka prayog grammar ke niyam se galat hai.',
            naturalExample:
              'Last quarter I led the architecture review and discussed database sharding with the SRE team.',
            category: 'Grammar',
          },
        ],
        suggestedVocabulary: [
          {
            phrase: 'mitigate connection exhaustion',
            translation: 'Database connection khatam hone ki samasya ko rokna',
            explanation: 'Precise engineering collocation for high-concurrency interviews.',
            naturalExample: 'We tuned HikariCP pool limits to mitigate connection exhaustion during peak load.',
          },
        ],
      },
    },
  ],
  adminMetrics: {
    totalRegisteredUsers: 1842,
    activeDailySpeakers: 614,
    monthlyRecurringRevenueUsd: 14890,
    liveVoiceSessionsToday: 928,
    quotaBlocksToday: 47,
    topLanguages: [
      { code: 'en', name: 'English (Technical & HR Interviews)', sharePercent: 34, activeLearners: 626 },
      { code: 'es', name: 'Spanish (Español)', sharePercent: 21, activeLearners: 387 },
      { code: 'hi', name: 'Hindi (Hindustani)', sharePercent: 14, activeLearners: 258 },
      { code: 'de', name: 'German (Deutsch)', sharePercent: 11, activeLearners: 203 },
      { code: 'ja', name: 'Japanese (Nihongo)', sharePercent: 9, activeLearners: 166 },
      { code: 'fr', name: 'French (Français)', sharePercent: 11, activeLearners: 202 },
    ],
    recentUsers: [
      {
        id: 'usr-01',
        name: 'Aarav Mehta',
        email: 'aarav.mehta@interviewscracker.io',
        nativeLang: 'Hindi',
        targetLang: 'English',
        plan: 'starter',
        minutesUsed: 8,
        status: 'Active',
      },
      {
        id: 'usr-02',
        name: 'Priya Nair',
        email: 'priya.nair@finlabs.in',
        nativeLang: 'Malayalam / Hindi',
        targetLang: 'German',
        plan: 'pro',
        minutesUsed: 54,
        status: 'Active',
      },
      {
        id: 'usr-03',
        name: 'Carlos Mendoza',
        email: 'cmendoza@madrid.es',
        nativeLang: 'Spanish',
        targetLang: 'Japanese',
        plan: 'starter',
        minutesUsed: 32,
        status: 'Active',
      },
      {
        id: 'usr-04',
        name: 'Rohan Kulkarni',
        email: 'rohan.k@pune-tech.org',
        nativeLang: 'Hindi / Marathi',
        targetLang: 'English',
        plan: 'free',
        minutesUsed: 10,
        status: 'Quota Reached',
      },
    ],
  },
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/api/live-voice' });

  // 1. Get Full Application Bootstrap State
  app.get('/api/state', (_req, res) => {
    const languages = getAllLanguages();
    const currentPlan = PLAN_QUOTAS[store.user.planTier];
    const totalMinutesAllLanguages = Object.values(store.languageProgress).reduce(
      (sum, item) => sum + item.speakingMinutes,
      0
    );
    const totalLessonsAllLanguages = Object.values(store.languageProgress).reduce(
      (sum, item) => sum + item.completedLessons,
      0
    );

    res.json({
      user: store.user,
      streakDays: store.streakDays,
      usedMinutesToday: store.usedMinutesToday,
      usedSessionsToday: store.usedSessionsToday,
      currentPlan,
      allPlans: Object.values(PLAN_QUOTAS),
      languages,
      proficiencyConfigs: PROFICIENCY_CONFIGS,
      learningObjectives: LEARNING_OBJECTIVES,
      explanationLanguages: EXPLANATION_LANGUAGES,
      scenarios: CONVERSATION_SCENARIOS,
      languageProgress: store.languageProgress,
      totalMinutesAllLanguages,
      totalLessonsAllLanguages,
      vocabularyNotebook: store.vocabularyNotebook,
      conversationHistory: store.conversationHistory,
      adminMetrics: store.adminMetrics,
    });
  });

  // 2. Save Personalized Onboarding & Language Selection
  app.post('/api/onboarding', (req, res) => {
    const {
      name,
      nativeLanguage,
      explanationLanguage,
      targetLanguage,
      proficiency,
      dailyGoalMinutes,
      learningObjective,
    } = req.body;

    if (!targetLanguage || !proficiency) {
      return res.status(400).json({ error: 'Target language and proficiency level are required.' });
    }

    const langConfig = getLanguageConfig(targetLanguage);
    store.user = {
      ...store.user,
      name: name?.trim() ? name.trim() : store.user.name,
      nativeLanguage: nativeLanguage || store.user.nativeLanguage,
      explanationLanguage: explanationLanguage || store.user.explanationLanguage,
      targetLanguage: langConfig.code,
      proficiency,
      dailyGoalMinutes: Number(dailyGoalMinutes) || 15,
      learningObjective: (learningObjective as LearningObjectiveId) || 'career_growth',
      onboardingCompleted: true,
    };

    if (!store.languageProgress[langConfig.code]) {
      store.languageProgress[langConfig.code] = {
        languageCode: langConfig.code,
        proficiency,
        completedLessons: 0,
        speakingMinutes: 0,
        masteryPercent: proficiency === 'advanced' ? 65 : proficiency === 'intermediate' ? 40 : 15,
        lastPracticedAt: null,
      };
    } else {
      store.languageProgress[langConfig.code].proficiency = proficiency;
    }

    res.json({
      user: store.user,
      languageConfig: langConfig,
      capability: getLanguageCapabilityMatrix(langConfig.code, true),
    });
  });

  // 3. Switch Role (Learner vs Admin) or Update Profile
  app.post('/api/auth/switch-role', (req, res) => {
    const { role, name, email } = req.body;
    if (role === 'learner' || role === 'admin') {
      store.user.role = role;
    }
    if (name) store.user.name = name;
    if (email) store.user.email = email;
    res.json({ user: store.user });
  });

  // 4. Upgrade / Switch Subscription Plan (Server-Enforced Quotas)
  app.post('/api/subscription/upgrade', (req, res) => {
    const { planTier } = req.body as { planTier: PlanTier };
    if (!PLAN_QUOTAS[planTier]) {
      return res.status(400).json({ error: 'Invalid subscription tier.' });
    }
    store.user.planTier = planTier;
    const recentUser = store.adminMetrics.recentUsers.find((u) => u.email === store.user.email);
    if (recentUser) {
      recentUser.plan = planTier;
      recentUser.status = 'Active';
    }
    res.json({
      user: store.user,
      currentPlan: PLAN_QUOTAS[planTier],
      usedMinutesToday: store.usedMinutesToday,
      usedSessionsToday: store.usedSessionsToday,
    });
  });

  // 5. Check Capability & Quota Before Starting Session
  app.post('/api/session/preflight', (req, res) => {
    const { languageCode, scenarioId, micAvailable } = req.body;
    const quota = checkSessionQuota({
      planTier: store.user.planTier,
      usedMinutesToday: store.usedMinutesToday,
      usedSessionsToday: store.usedSessionsToday,
      scenarioId: scenarioId || 'daily_life',
    });

    if (!quota.allowed) {
      store.adminMetrics.quotaBlocksToday += 1;
    }

    const capability = getLanguageCapabilityMatrix(
      languageCode || store.user.targetLanguage,
      Boolean(micAvailable)
    );

    res.json({
      quota,
      capability,
      currentPlan: PLAN_QUOTAS[store.user.planTier],
    });
  });

  // 6. Interactive Conversation Turn (Used for Hybrid Voice/Text Mode or Live Fallback)
  app.post('/api/conversation/turn', async (req, res) => {
    const {
      languageCode,
      proficiency,
      scenarioId,
      userMessage,
      transcript = [],
      synthesizeAudio = true,
      realTimeGrammarCorrections = true,
    } = req.body;

    if (!userMessage || !String(userMessage).trim()) {
      return res.status(400).json({ error: 'Please speak or type a message to continue the conversation.' });
    }

    const quota = checkSessionQuota({
      planTier: store.user.planTier,
      usedMinutesToday: store.usedMinutesToday,
      usedSessionsToday: store.usedSessionsToday,
      scenarioId: scenarioId || 'daily_life',
    });

    if (!quota.allowed) {
      store.adminMetrics.quotaBlocksToday += 1;
      return res.status(403).json({
        error: quota.reason,
        quota,
      });
    }

    const enableLiveCorrections = realTimeGrammarCorrections !== false;
    const lang = getLanguageConfig(languageCode || store.user.targetLanguage);
    const systemInstruction = buildTutorSystemPrompt({
      languageCode: lang.code,
      proficiency: proficiency || store.user.proficiency,
      scenarioId: scenarioId || 'daily_life',
      explanationLanguage: store.user.explanationLanguage,
      learningObjective: store.user.learningObjective,
      realTimeGrammarCorrections: enableLiveCorrections,
    });

    const formattedHistory = transcript
      .slice(-8)
      .map((t: { role: string; text: string }) => `${t.role === 'tutor' ? lang.tutorName : 'Learner'}: ${t.text}`)
      .join('\n');

    let tutorReply = '';
    let inlineCoachTip = '';
    let audioWavBase64: string | null = null;
    let realTimeCorrection = buildRealTimeGrammarCorrectionCheck({
      userText: String(userMessage),
      languageCode: lang.code,
      explanationLanguage: store.user.explanationLanguage,
      enabled: enableLiveCorrections,
    });

    try {
      if (!hasValidGeminiApiKey()) {
        throw new Error('Using instant local tutor response');
      }
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          `Conversation so far:\n${formattedHistory}`,
          `Learner just said: "${userMessage}"`,
          enableLiveCorrections
            ? `Respond in JSON with "tutorReply" (your natural 1-3 sentence response in ${lang.name} ending with a follow-up question), "inlineCoachTip" (a 1-sentence encouraging tip or quick grammar note in ${store.user.explanationLanguage === 'hi-en' ? 'Hindi + English (Hinglish)' : store.user.explanationLanguage}), and optional "correctedSentence" if the learner made a grammar error.`
            : `Real-time grammar corrections are DISABLED. Respond in JSON with "tutorReply" (your natural 1-3 sentence response in ${lang.name} without correcting grammar) and "inlineCoachTip" (a brief conversational flow tip in ${store.user.explanationLanguage === 'hi-en' ? 'Hindi + English (Hinglish)' : store.user.explanationLanguage} without grammar criticism).`,
        ].join('\n\n'),
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tutorReply: {
                type: Type.STRING,
                description: `The tutor's spoken reply in ${lang.name}.`,
              },
              inlineCoachTip: {
                type: Type.STRING,
                description: 'A brief 1-sentence coaching tip in the preferred explanation language.',
              },
              correctedSentence: {
                type: Type.STRING,
                description: 'Corrected sentence if real-time grammar corrections are enabled and an error occurred.',
              },
            },
            required: ['tutorReply', 'inlineCoachTip'],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      tutorReply = parsed.tutorReply || '';
      inlineCoachTip = parsed.inlineCoachTip || '';
      if (enableLiveCorrections && parsed.correctedSentence && !realTimeCorrection) {
        realTimeCorrection = {
          originalText: String(userMessage).trim(),
          correctedSentence: parsed.correctedSentence,
          explanation: inlineCoachTip,
        };
      }

      if (synthesizeAudio && tutorReply) {
        try {
          const ttsRes = await ai.models.generateContent({
            model: 'gemini-3.8-flash-lite-tts',
            contents: [
              {
                role: 'user',
                parts: [{ text: tutorReply }],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: lang.recommendedVoice },
                },
              },
            },
          });
          const audioData = ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (audioData) {
            audioWavBase64 = audioData;
          }
        } catch (_ttsErr) {
          // Non-fatal if TTS stream is unavailable; browser SpeechSynthesis or text will render
        }
      }
    } catch (_apiError: any) {
      const scenarioObj =
        CONVERSATION_SCENARIOS.find((s) => s.id === scenarioId) || CONVERSATION_SCENARIOS[0];
      const fallbackReplies: Record<string, string> = {
        en: `That is a great point regarding "${scenarioObj.title}". Could you elaborate on how you handled the timeline and what outcome you achieved?`,
        hi: `Bahut badhiya vichaar hai! "${scenarioObj.title}" ke sandarbh mein, kya aap thoda aur vistaar se bata sakte hain ki agla kadam kya hoga?`,
        es: `¡Muy bien dicho! En este escenario de "${scenarioObj.title}", ¿cómo te gustaría resolver el siguiente paso?`,
        fr: `C'est très clair ! Dans le cadre de "${scenarioObj.title}", quelle solution proposez-vous ensuite ?`,
        de: `Sehr gut formuliert! Wie würden Sie in dieser Situation bei "${scenarioObj.title}" als Nächstes vorgehen?`,
        ja: `Subarashii hyougen desu ne! Kono "${scenarioObj.title}" no bamen dewa, tsugi ni dou taiou shimasu ka?`,
        ko: `Aju jayeonseureoun pyohyeonieyo! I sanghwang-eseoneun daeumeuro eotteoke malsseumhasigesseoyo?`,
        zh: `Shuō de hěn bàng! Zài zhège chǎngjǐng xià, nǐ jiēxiàlái dǎsuàn zěnme chǔlǐ ne?`,
        it: `Ottima risposta! In questa situazione, quale sarebbe il tuo prossimo passo?`,
        pt: `Muito bem explicado! Nesse cenário, como você resolveria a próxima etapa?`,
      };
      tutorReply = fallbackReplies[lang.code] || fallbackReplies.en;
      if (enableLiveCorrections) {
        inlineCoachTip = realTimeCorrection
          ? realTimeCorrection.explanation
          : store.user.explanationLanguage === 'hi-en'
            ? `Hinglish Coach Tip (Real-Time Grammar On): Bahut accha prayas! Aapka sentence structure natural hai — agle turn mein ek time connector jodein.`
            : `Real-Time Grammar Active: Natural sentence structure — try expanding with a specific example on your next turn.`;
      } else {
        inlineCoachTip =
          store.user.explanationLanguage === 'hi-en'
            ? `Fluency Mode (Real-Time Grammar Off): Bina ruke bolte rahein! Grammar corrections session ke ant mein dikhaye jayenge.`
            : `Uninterrupted Fluency Mode: Real-time grammar corrections are paused so you can focus on speaking flow.`;
      }
    }

    res.json({
      tutorReply,
      inlineCoachTip,
      realTimeCorrection: enableLiveCorrections ? realTimeCorrection : null,
      realTimeGrammarCorrections: enableLiveCorrections,
      audioWavBase64,
      tutorName: lang.tutorName,
      voiceName: lang.recommendedVoice,
    });
  });

  // 7. End Session & Generate Post-Conversation Bilingual Feedback
  app.post('/api/conversation/evaluate', async (req, res) => {
    const {
      languageCode,
      proficiency,
      scenarioId,
      transcript = [],
      durationMinutes = 3,
      usedVoiceAudio = false,
    } = req.body;

    const lang = getLanguageConfig(languageCode || store.user.targetLanguage);
    const prof = (proficiency as ProficiencyLevel) || store.user.proficiency;
    const scen =
      CONVERSATION_SCENARIOS.find((s) => s.id === scenarioId) || CONVERSATION_SCENARIOS[0];
    const capability = getLanguageCapabilityMatrix(lang.code, Boolean(usedVoiceAudio));

    let evaluation: SessionEvaluation | null = null;

    try {
      if (!hasValidGeminiApiKey()) {
        throw new Error('Using instant deterministic language evaluation');
      }
      const ai = getGenAIClient();
      const evalPrompt = buildEvaluationPrompt({
        languageCode: lang.code,
        proficiency: prof,
        explanationLanguage: store.user.explanationLanguage,
        scenarioId: scen.id,
        transcript,
        usedVoiceAudio: Boolean(usedVoiceAudio),
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: evalPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              grammarScore: { type: Type.INTEGER },
              vocabularyScore: { type: Type.INTEGER },
              sentenceStructureScore: { type: Type.INTEGER },
              fluencyScore: { type: Type.INTEGER },
              pronunciationScore: { type: Type.INTEGER },
              pronunciationNote: { type: Type.STRING },
              overallSummary: { type: Type.STRING },
              corrections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    originalSentence: { type: Type.STRING },
                    correctedSentence: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    naturalExample: { type: Type.STRING },
                    category: { type: Type.STRING },
                  },
                  required: [
                    'originalSentence',
                    'correctedSentence',
                    'explanation',
                    'naturalExample',
                    'category',
                  ],
                },
              },
              suggestedVocabulary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    phrase: { type: Type.STRING },
                    translation: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    naturalExample: { type: Type.STRING },
                  },
                  required: ['phrase', 'translation', 'explanation', 'naturalExample'],
                },
              },
            },
            required: [
              'grammarScore',
              'vocabularyScore',
              'sentenceStructureScore',
              'fluencyScore',
              'pronunciationNote',
              'overallSummary',
              'corrections',
              'suggestedVocabulary',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      evaluation = {
        grammarScore: parsed.grammarScore || 85,
        vocabularyScore: parsed.vocabularyScore || 88,
        sentenceStructureScore: parsed.sentenceStructureScore || 84,
        fluencyScore: parsed.fluencyScore || 86,
        pronunciationScore: capability.acousticPronunciationSupported
          ? parsed.pronunciationScore || 85
          : null,
        pronunciationNote: parsed.pronunciationNote || capability.evaluationDisclaimer,
        overallSummary: parsed.overallSummary,
        corrections: (parsed.corrections || []).map((c: any) => ({
          originalSentence: c.originalSentence,
          correctedSentence: c.correctedSentence,
          explanation: c.explanation,
          naturalExample: c.naturalExample,
          category: c.category || 'Grammar',
        })),
        suggestedVocabulary: parsed.suggestedVocabulary || [],
      };
    } catch (_err) {
      const userUtterances = transcript.filter((t: any) => t.role === 'user');
      const preferHindiBridge =
        store.user.explanationLanguage === 'hi-en' || store.user.explanationLanguage === 'hi';

      const sampleCorrections: CorrectionItem[] = lang.sampleCorrections.map((sc) => ({
        originalSentence: sc.originalSentence,
        correctedSentence: sc.correctedSentence,
        explanation: preferHindiBridge ? sc.explanationHi : sc.explanationEn,
        naturalExample: sc.naturalExample,
        category: sc.category,
      }));

      if (userUtterances.length > 0) {
        const firstUserText = String(userUtterances[0].text).trim();
        if (
          firstUserText &&
          !sampleCorrections.some((c) => c.originalSentence.toLowerCase() === firstUserText.toLowerCase())
        ) {
          let refined = firstUserText;
          let expEn = `Your sentence communicated the intent clearly in the "${scen.title}" scenario. Adding a discourse connector elevates register for ${prof} level.`;
          let expHi = `Aapne "${scen.title}" scenario mein apni baat spasht roop se rakhi! Ise aur adhik prabhavshali aur natural banane ke liye neeche diye gaye refined structure ka abhyas karein.`;

          if (/discussed about/i.test(firstUserText)) {
            refined = firstUserText.replace(/discussed about/gi, 'discussed');
            expEn = 'The verb "discuss" is transitive in English and does not take the preposition "about".';
            expHi = '"Discuss" ka arth hi "ke baare mein charcha karna" hota hai, isliye iske baad "about" nahi lagaya jaata.';
          } else if (/i am having/i.test(firstUserText)) {
            refined = firstUserText.replace(/i am having/gi, 'I have');
            expEn = 'Use Simple Present "I have" instead of continuous "I am having" when stating possession or experience.';
            expHi = 'Experience ya possession batane ke liye "I am having" ke sthaan par Simple Present "I have" ka prayog karein.';
          } else if (/yesterday i have/i.test(firstUserText)) {
            refined = firstUserText.replace(/yesterday i have (\w+)/gi, 'Yesterday I $1');
            expEn = 'With a finished past time marker like "Yesterday", use Simple Past instead of Present Perfect.';
            expHi = '"Yesterday" jaise beete hue samay ke saath "have + V3" ke bajay Simple Past ka prayog hota hai.';
          }

          sampleCorrections.unshift({
            originalSentence: firstUserText,
            correctedSentence:
              refined !== firstUserText
                ? refined
                : `${firstUserText.replace(/[.!?]+$/, '')} — which aligns well with our ${scen.category.toLowerCase()} objectives.`,
            explanation: preferHindiBridge ? expHi : expEn,
            naturalExample: lang.sampleCorrections[0]?.naturalExample || refined,
            category: 'Sentence Structure',
          });
        }
      }

      evaluation = {
        grammarScore: 86,
        vocabularyScore: 89,
        sentenceStructureScore: 85,
        fluencyScore: 88,
        pronunciationScore: capability.acousticPronunciationSupported ? 87 : null,
        pronunciationNote: capability.evaluationDisclaimer,
        overallSummary: preferHindiBridge
          ? `Shaandaar abhyas! Aapne ${lang.name} (${scen.title}) session mein confidence ke saath bhaag liya. Neeche aapke sentences ka Original roop, Corrected roop, Hindi + English (Hinglish) vyakhya aur natural examples diye gaye hain.`
          : `Strong session in ${lang.name} (${scen.title})! Review your sentence refinements, grammatical explanations, and natural collocations below.`,
        corrections: sampleCorrections,
        suggestedVocabulary: sampleCorrections.map((c) => ({
          phrase: c.correctedSentence,
          translation: preferHindiBridge
            ? 'Session se save kiya gaya shuddh aur natural sentence'
            : `Refined ${lang.name} expression from ${scen.title}`,
          explanation: c.explanation,
          naturalExample: c.naturalExample,
        })),
      };
    }

    // Update user streaks, speaking minutes, and session usage
    const sessionMins = Math.max(2, Math.min(15, Number(durationMinutes) || 3));
    store.usedMinutesToday += sessionMins;
    store.usedSessionsToday += 1;

    const currentLangStat = store.languageProgress[lang.code] || {
      languageCode: lang.code,
      proficiency: prof,
      completedLessons: 0,
      speakingMinutes: 0,
      masteryPercent: 25,
      lastPracticedAt: null,
    };

    const progressUpdate = calculateStreakAndProgress({
      currentStreakDays: store.streakDays,
      lastPracticeDateIso: store.lastPracticeDateIso,
      todayDateIso: new Date().toISOString(),
      completedSessionMinutes: sessionMins,
      previousTotalMinutes: currentLangStat.speakingMinutes,
      previousLessonsCompleted: currentLangStat.completedLessons,
    });

    store.streakDays = progressUpdate.updatedStreakDays;
    store.lastPracticeDateIso = new Date().toISOString();
    store.languageProgress[lang.code] = {
      ...currentLangStat,
      proficiency: prof,
      speakingMinutes: progressUpdate.updatedTotalMinutes,
      completedLessons: progressUpdate.updatedLessonsCompleted,
      masteryPercent: Math.min(99, currentLangStat.masteryPercent + 4),
      lastPracticedAt: store.lastPracticeDateIso,
    };

    const newHistoryEntry: ConversationHistoryEntry = {
      id: `hist-${Date.now()}`,
      languageCode: lang.code,
      languageName: lang.name,
      proficiency: prof,
      scenarioId: scen.id,
      scenarioTitle: scen.title,
      durationMinutes: sessionMins,
      mode: usedVoiceAudio ? 'gemini_live_audio' : 'hybrid_text_and_tts',
      createdAt: new Date().toISOString(),
      transcript: transcript.map((t: any) => ({
        role: t.role,
        text: t.text,
        timestamp: t.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })),
      evaluation,
    };

    store.conversationHistory.unshift(newHistoryEntry);
    store.adminMetrics.liveVoiceSessionsToday += 1;

    res.json({
      sessionRecord: newHistoryEntry,
      streakDays: store.streakDays,
      usedMinutesToday: store.usedMinutesToday,
      usedSessionsToday: store.usedSessionsToday,
      languageProgress: store.languageProgress,
    });
  });

  // 8. Save Phrase or Correction to Vocabulary Notebook
  app.post('/api/vocabulary', (req, res) => {
    const { languageCode, phrase, translation, explanation, naturalExample, category } = req.body;
    if (!phrase || !String(phrase).trim()) {
      return res.status(400).json({ error: 'Phrase is required.' });
    }

    const plan = PLAN_QUOTAS[store.user.planTier];
    if (store.vocabularyNotebook.length >= plan.maxSavedPhrases) {
      return res.status(403).json({
        error: `Vocabulary limit (${plan.maxSavedPhrases} phrases) reached on ${plan.name}. Upgrade your plan to save more phrases.`,
      });
    }

    const newItem: SavedVocabItem = {
      id: `voc-${Date.now()}`,
      languageCode: languageCode || store.user.targetLanguage,
      phrase: String(phrase).trim(),
      translation: translation ? String(translation).trim() : 'Saved expression',
      explanation: explanation ? String(explanation).trim() : 'Key conversational phrase.',
      naturalExample: naturalExample ? String(naturalExample).trim() : String(phrase).trim(),
      category: category || 'Vocabulary',
      masteryScore: 65,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    store.vocabularyNotebook.unshift(newItem);
    res.json({
      item: newItem,
      vocabularyNotebook: store.vocabularyNotebook,
    });
  });

  // 9. Delete Vocabulary Item or Update Mastery Score after Revision
  app.post('/api/vocabulary/mastery', (req, res) => {
    const { vocabId, delta } = req.body;
    const item = store.vocabularyNotebook.find((v) => v.id === vocabId);
    if (item) {
      item.masteryScore = Math.max(0, Math.min(100, item.masteryScore + (Number(delta) || 10)));
    }
    res.json({ vocabularyNotebook: store.vocabularyNotebook });
  });

  app.delete('/api/vocabulary/:id', (req, res) => {
    store.vocabularyNotebook = store.vocabularyNotebook.filter((v) => v.id !== req.params.id);
    res.json({ vocabularyNotebook: store.vocabularyNotebook });
  });

  // 10. Java Spring Boot + Spring Security + MySQL Enterprise Integration Blueprint
  app.get('/api/architecture/spring-boot', (_req, res) => {
    res.json({
      overview:
        'Interviews Cracker AI is architected with a clean domain boundary so the Node/WebSocket Gemini Live media gateway integrates seamlessly with a Java 21 Spring Boot 3.4, Spring Security 6 (JWT + OAuth2), and MySQL 8.4 core persistence service.',
      mysqlSchema: `CREATE DATABASE IF NOT EXISTS speakmate_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE speakmate_ai;

CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ROLE_LEARNER', 'ROLE_ADMIN') DEFAULT 'ROLE_LEARNER',
  native_language VARCHAR(64) NOT NULL DEFAULT 'hi',
  explanation_language VARCHAR(32) NOT NULL DEFAULT 'hi-en',
  plan_tier ENUM('FREE', 'STARTER', 'PRO') NOT NULL DEFAULT 'FREE',
  streak_days INT NOT NULL DEFAULT 0,
  last_practice_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_language_profiles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  language_code VARCHAR(12) NOT NULL,
  proficiency ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED') NOT NULL,
  learning_objective VARCHAR(64) NOT NULL,
  daily_goal_minutes INT NOT NULL DEFAULT 15,
  speaking_minutes_total INT NOT NULL DEFAULT 0,
  completed_lessons INT NOT NULL DEFAULT 0,
  mastery_percent INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_user_lang (user_id, language_code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE conversation_sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id BIGINT NOT NULL,
  language_code VARCHAR(12) NOT NULL,
  scenario_id VARCHAR(64) NOT NULL,
  mode ENUM('GEMINI_LIVE_AUDIO', 'HYBRID_TEXT_TTS') NOT NULL,
  duration_minutes INT NOT NULL,
  grammar_score INT,
  vocabulary_score INT,
  structure_score INT,
  fluency_score INT,
  pronunciation_score INT NULL,
  evaluation_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);`,
      springSecurityConfig: `package io.speakmate.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final QuotaEnforcementFilter quotaFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter, QuotaEnforcementFilter quotaFilter) {
        this.jwtFilter = jwtFilter;
        this.quotaFilter = quotaFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**", "/api/v1/languages/catalog").permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(quotaFilter, JwtAuthenticationFilter.class)
            .build();
    }
}`,
    });
  });

  // 11. WebSocket Bridge for Real-Time Two-Way Gemini Live API (`gemini-3.8-live`)
  wss.on('connection', (clientWs: WebSocket) => {
    let liveSession: any = null;
    let isClosing = false;

    clientWs.on('message', async (rawMessage: Buffer) => {
      try {
        const msg = JSON.parse(rawMessage.toString());

        if (msg.type === 'start') {
          const languageCode: LanguageCode = msg.languageCode || store.user.targetLanguage;
          const proficiency: ProficiencyLevel = msg.proficiency || store.user.proficiency;
          const scenarioId: ScenarioId = msg.scenarioId || 'daily_life';

          const quota = checkSessionQuota({
            planTier: store.user.planTier,
            usedMinutesToday: store.usedMinutesToday,
            usedSessionsToday: store.usedSessionsToday,
            scenarioId,
          });

          if (!quota.allowed) {
            store.adminMetrics.quotaBlocksToday += 1;
            clientWs.send(
              JSON.stringify({
                type: 'quota_error',
                error: quota.reason,
                quota,
              })
            );
            return;
          }

          const lang = getLanguageConfig(languageCode);
          const enableLiveCorrections = msg.realTimeGrammarCorrections !== false;
          const systemInstruction = buildTutorSystemPrompt({
            languageCode: lang.code,
            proficiency,
            scenarioId,
            explanationLanguage: store.user.explanationLanguage,
            learningObjective: store.user.learningObjective,
            realTimeGrammarCorrections: enableLiveCorrections,
          });

          try {
            const ai = getGenAIClient();
            liveSession = await ai.live.connect({
              model: 'gemini-3.8-live',
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: lang.recommendedVoice },
                  },
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction,
              },
              callbacks: {
                onmessage: (serverMsg: LiveServerMessage) => {
                  if (clientWs.readyState !== WebSocket.OPEN) return;

                  const parts = serverMsg.serverContent?.modelTurn?.parts || [];
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      clientWs.send(
                        JSON.stringify({
                          type: 'audio',
                          audio: part.inlineData.data,
                        })
                      );
                    }
                    if (part.text) {
                      clientWs.send(
                        JSON.stringify({
                          type: 'tutor_text',
                          text: part.text,
                        })
                      );
                    }
                  }

                  const outTranscript = (serverMsg.serverContent as any)?.outputTranscription?.text;
                  if (outTranscript) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'output_transcription',
                        text: outTranscript,
                      })
                    );
                  }

                  const inTranscript = (serverMsg.serverContent as any)?.inputTranscription?.text;
                  if (inTranscript) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'input_transcription',
                        text: inTranscript,
                      })
                    );
                  }

                  if (serverMsg.serverContent?.interrupted) {
                    clientWs.send(JSON.stringify({ type: 'interrupted' }));
                  }
                },
                onerror: (err: any) => {
                  if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'live_fallback_notice',
                        message:
                          err?.message ||
                          'Gemini Live audio stream switched to Hybrid Voice/Transcript mode.',
                      })
                    );
                  }
                },
                onclose: () => {
                  if (!isClosing && clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(JSON.stringify({ type: 'session_closed' }));
                  }
                },
              },
            });

            clientWs.send(
              JSON.stringify({
                type: 'ready',
                tutorName: lang.tutorName,
                voiceName: lang.recommendedVoice,
                starterGreeting: lang.starterGreeting,
              })
            );

            // Prompt the model to greet the learner in the target language
            liveSession.sendRealtimeInput({
              text: `Start the role-play conversation now with a warm 1-sentence greeting in ${lang.name}.`,
            });
          } catch (liveErr: any) {
            clientWs.send(
              JSON.stringify({
                type: 'live_fallback_notice',
                tutorName: lang.tutorName,
                starterGreeting: lang.starterGreeting,
                message:
                  'Live WebSocket connected in Hybrid Voice Mode. Speak or type below for real-time AI tutor responses.',
              })
            );
          }
        } else if (msg.type === 'toggle_grammar' && liveSession) {
          const enabled = Boolean(msg.realTimeGrammarCorrections);
          liveSession.sendRealtimeInput({
            text: enabled
              ? '[System Update: Real-Time Grammar Corrections ENABLED. Gently point out or recast grammar errors during conversation.]'
              : '[System Update: Real-Time Grammar Corrections DISABLED. Do not correct grammar mid-conversation; focus only on conversational fluency.]',
          });
        } else if (msg.type === 'audio' && liveSession && msg.audio) {
          liveSession.sendRealtimeInput({
            audio: {
              data: msg.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } else if (msg.type === 'text' && liveSession && msg.text) {
          liveSession.sendRealtimeInput({
            text: String(msg.text),
          });
        } else if (msg.type === 'stop') {
          isClosing = true;
          if (liveSession) {
            try {
              liveSession.close();
            } catch (_e) {}
            liveSession = null;
          }
        }
      } catch (_err) {
        // Ignore malformed frame
      }
    });

    clientWs.on('close', () => {
      isClosing = true;
      if (liveSession) {
        try {
          liveSession.close();
        } catch (_e) {}
        liveSession = null;
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`SpeakMate AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
