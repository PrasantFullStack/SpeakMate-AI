import {
  CONVERSATION_SCENARIOS,
  getLanguageConfig,
  LEARNING_OBJECTIVES,
  LanguageCode,
  LearningObjectiveId,
  PLAN_QUOTAS,
  PlanTier,
  PROFICIENCY_CONFIGS,
  ProficiencyLevel,
  ScenarioId,
} from '../config/languages';

export interface UserOnboardingProfile {
  name: string;
  email: string;
  role: 'learner' | 'admin';
  nativeLanguage: string;
  explanationLanguage: string;
  targetLanguage: LanguageCode;
  proficiency: ProficiencyLevel;
  dailyGoalMinutes: number;
  learningObjective: LearningObjectiveId;
  planTier: PlanTier;
  onboardingCompleted: boolean;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  remainingMinutes: number;
  remainingSessions: number;
  scenarioAllowed: boolean;
  requiredTierForScenario: PlanTier;
}

export interface LanguageCapabilityReport {
  languageCode: LanguageCode;
  languageName: string;
  liveVoiceModel: string;
  fallbackTextModel: string;
  ttsModel: string;
  liveVoiceSupported: boolean;
  acousticPronunciationSupported: boolean;
  evaluationDisclaimer: string;
  recommendedMode: 'gemini_live_audio' | 'hybrid_text_and_tts';
}

export interface SavedVocabItem {
  id: string;
  languageCode: LanguageCode;
  phrase: string;
  translation: string;
  explanation: string;
  naturalExample: string;
  category: string;
  masteryScore: number; // 0 to 100
  createdAt: string;
}

export interface RevisionQuestion {
  id: string;
  vocabId: string;
  languageCode: LanguageCode;
  promptText: string;
  translationHint: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export function getLanguageCapabilityMatrix(
  languageCode: LanguageCode,
  micAvailable: boolean = true
): LanguageCapabilityReport {
  const lang = getLanguageConfig(languageCode);
  const canUseLive = lang.liveVoiceSupported && micAvailable;

  const evaluationDisclaimer = lang.acousticPronunciationSupported
    ? micAvailable
      ? `Grammar, vocabulary, sentence structure, and conversational fluency are evaluated from your real-time session. Acoustic pronunciation notes reflect ${lang.name} prosody and intelligibility.`
      : `Microphone stream was inactive during this turn; grammar, vocabulary, and sentence structure are reliably evaluated from your transcript, while acoustic pronunciation scoring is omitted.`
    : `For ${lang.name} (${lang.scriptType}), grammar, particle/measure-word usage, vocabulary, and sentence structure are reliably evaluated. Fine-grained pitch-accent or tonal acoustics are approximated via transcript context rather than raw phonetic scoring.`;

  return {
    languageCode: lang.code,
    languageName: lang.name,
    liveVoiceModel: 'gemini-3.8-live',
    fallbackTextModel: 'gemini-3.8-flash',
    ttsModel: 'gemini-3.8-flash-lite-tts',
    liveVoiceSupported: lang.liveVoiceSupported,
    acousticPronunciationSupported: lang.acousticPronunciationSupported && micAvailable,
    evaluationDisclaimer,
    recommendedMode: canUseLive ? 'gemini_live_audio' : 'hybrid_text_and_tts',
  };
}

export function checkSessionQuota(params: {
  planTier: PlanTier;
  usedMinutesToday: number;
  usedSessionsToday: number;
  scenarioId: ScenarioId;
}): QuotaCheckResult {
  const plan = PLAN_QUOTAS[params.planTier] || PLAN_QUOTAS.free;
  const scenario =
    CONVERSATION_SCENARIOS.find((s) => s.id === params.scenarioId) || CONVERSATION_SCENARIOS[0];

  const remainingMinutes = Math.max(0, plan.dailySpeakingMinutesLimit - params.usedMinutesToday);
  const remainingSessions = Math.max(0, plan.dailySessionsLimit - params.usedSessionsToday);
  const scenarioAllowed = plan.allowedScenarios.includes(scenario.id);

  if (!scenarioAllowed) {
    return {
      allowed: false,
      reason: `The "${scenario.title}" scenario requires the ${PLAN_QUOTAS[scenario.minTier].name} plan or higher.`,
      remainingMinutes,
      remainingSessions,
      scenarioAllowed: false,
      requiredTierForScenario: scenario.minTier,
    };
  }

  if (remainingSessions <= 0) {
    return {
      allowed: false,
      reason: `Daily session limit reached (${plan.dailySessionsLimit} sessions/day on ${plan.name}). Upgrade your plan for additional daily sessions.`,
      remainingMinutes,
      remainingSessions: 0,
      scenarioAllowed: true,
      requiredTierForScenario: scenario.minTier,
    };
  }

  if (remainingMinutes <= 0) {
    return {
      allowed: false,
      reason: `Daily speaking minute quota reached (${plan.dailySpeakingMinutesLimit} mins/day on ${plan.name}). Upgrade your plan to continue practicing today.`,
      remainingMinutes: 0,
      remainingSessions,
      scenarioAllowed: true,
      requiredTierForScenario: scenario.minTier,
    };
  }

  return {
    allowed: true,
    remainingMinutes,
    remainingSessions,
    scenarioAllowed: true,
    requiredTierForScenario: scenario.minTier,
  };
}

export interface RealTimeGrammarCorrection {
  originalText: string;
  correctedSentence: string;
  explanation: string;
}

export function buildRealTimeGrammarCorrectionCheck(params: {
  userText: string;
  languageCode: LanguageCode;
  explanationLanguage: string;
  enabled: boolean;
}): RealTimeGrammarCorrection | null {
  if (!params.enabled) {
    return null;
  }

  const trimmed = String(params.userText || '').trim();
  if (!trimmed) return null;

  const lang = getLanguageConfig(params.languageCode);
  const preferHindiBridge =
    params.explanationLanguage === 'hi-en' || params.explanationLanguage === 'hi';

  if (/discussed about/i.test(trimmed)) {
    return {
      originalText: trimmed,
      correctedSentence: trimmed.replace(/discussed about/gi, 'discussed'),
      explanation: preferHindiBridge
        ? 'Hinglish Note: "Discuss" ke baad "about" nahi lagta — seedhe object likhein.'
        : 'Grammar Note: The transitive verb "discuss" does not take the preposition "about".',
    };
  }

  if (/i am having/i.test(trimmed)) {
    return {
      originalText: trimmed,
      correctedSentence: trimmed.replace(/i am having/gi, 'I have'),
      explanation: preferHindiBridge
        ? 'Hinglish Note: Experience ya possession batane ke liye "I am having" ki jagah "I have" bole.'
        : 'Grammar Note: Use Simple Present "I have" for states or possession instead of "I am having".',
    };
  }

  if (/yesterday i have/i.test(trimmed)) {
    return {
      originalText: trimmed,
      correctedSentence: trimmed.replace(/yesterday i have (\w+)/gi, 'Yesterday I $1'),
      explanation: preferHindiBridge
        ? 'Hinglish Note: "Yesterday" ke saath Present Perfect ("have") nahi, Simple Past aata hai.'
        : 'Grammar Note: Use Simple Past with completed past time markers like "Yesterday".',
    };
  }

  const matchingSample = lang.sampleCorrections.find(
    (sc) => sc.originalSentence.toLowerCase() === trimmed.toLowerCase()
  );
  if (matchingSample) {
    return {
      originalText: trimmed,
      correctedSentence: matchingSample.correctedSentence,
      explanation: preferHindiBridge ? matchingSample.explanationHi : matchingSample.explanationEn,
    };
  }

  return null;
}

export function buildTutorSystemPrompt(params: {
  languageCode: LanguageCode;
  proficiency: ProficiencyLevel;
  scenarioId: ScenarioId;
  explanationLanguage: string;
  learningObjective: LearningObjectiveId;
  realTimeGrammarCorrections?: boolean;
}): string {
  const lang = getLanguageConfig(params.languageCode);
  const prof = PROFICIENCY_CONFIGS[params.proficiency] || PROFICIENCY_CONFIGS.beginner;
  const scenario =
    CONVERSATION_SCENARIOS.find((s) => s.id === params.scenarioId) || CONVERSATION_SCENARIOS[0];
  const objective =
    LEARNING_OBJECTIVES.find((o) => o.id === params.learningObjective) || LEARNING_OBJECTIVES[0];
  const enableLiveCorrections = params.realTimeGrammarCorrections !== false;

  const explanationInstruction =
    params.explanationLanguage === 'hi-en'
      ? 'If the learner asks for help or a quick clarification, explain briefly in Hindi-to-English (Hinglish / Hindi + English) so an Indian learner immediately grasps the nuance, then guide them back to speaking in the target language.'
      : params.explanationLanguage === 'hi'
        ? 'If the learner asks for clarification, provide a brief supportive hint in Hindi (हिन्दी), then return to the target language.'
        : `If the learner gets stuck, provide a brief supportive hint in ${params.explanationLanguage}, then continue in ${lang.name}.`;

  const grammarModeInstruction = enableLiveCorrections
    ? `Real-Time Grammar Corrections: ENABLED. Gently recast or briefly point out grammatical mistakes in real time before continuing your conversational reply.`
    : `Real-Time Grammar Corrections: DISABLED (Uninterrupted Fluency Mode). Do NOT correct grammar mistakes mid-conversation; focus purely on natural conversational flow and reserve all grammar corrections for the post-session report.`;

  return [
    `You are ${lang.tutorName}, an expert AI language tutor on SpeakMate AI (${lang.tutorPersona}).`,
    `Target Language: ${lang.name} (${lang.nativeName}, BCP-47: ${lang.bcp47}).`,
    `Learner Proficiency: ${prof.label} (${prof.cefrRange}).`,
    `Speech & Pace Rule: ${prof.speechPaceInstruction}`,
    `Vocabulary Rule: ${prof.vocabularyComplexity}`,
    `Scaffolding Rule: ${prof.scaffoldingRule}`,
    `Primary Learning Objective: ${objective.label} — ${objective.description}`,
    `Active Scenario: "${scenario.title}" (${scenario.category}).`,
    `Role-Play Setting: ${scenario.rolePlaySetting}`,
    `Your Role: ${scenario.tutorRole}.`,
    `Learner's Goal in this Scenario: ${scenario.learnerGoal}`,
    `Grammar Focus Areas for this level: ${lang.grammarFocusAreas[params.proficiency].join(', ')}.`,
    `Explanation Preference: ${explanationInstruction}`,
    grammarModeInstruction,
    `CRITICAL CONVERSATION RULES:`,
    `1. Conduct the conversation primarily in ${lang.name} at the ${prof.label} level.`,
    `2. Keep each spoken turn concise (1 to 3 sentences max) so the learner gets maximum speaking time.`,
    `3. Always end your turn with a natural open question or role-play prompt to keep the two-way conversation flowing.`,
  ].join('\n');
}

export function buildEvaluationPrompt(params: {
  languageCode: LanguageCode;
  proficiency: ProficiencyLevel;
  explanationLanguage: string;
  scenarioId: ScenarioId;
  transcript: Array<{ role: 'user' | 'tutor'; text: string }>;
  usedVoiceAudio: boolean;
}): string {
  const lang = getLanguageConfig(params.languageCode);
  const prof = PROFICIENCY_CONFIGS[params.proficiency] || PROFICIENCY_CONFIGS.beginner;
  const capability = getLanguageCapabilityMatrix(params.languageCode, params.usedVoiceAudio);

  const explanationLangDirective =
    params.explanationLanguage === 'hi-en'
      ? 'Write all explanations and overall summary in clear Hindi-to-English (both Hindi Devanagari and accessible Hinglish/English bridge explanations specifically tailored for Indian learners).'
      : params.explanationLanguage === 'hi'
        ? 'Write all explanations and overall summary in clear Hindi (हिन्दी).'
        : `Write all explanations and overall summary in ${params.explanationLanguage}.`;

  const userTurns = params.transcript
    .filter((t) => t.role === 'user')
    .map((t, idx) => `Learner Turn ${idx + 1}: "${t.text}"`)
    .join('\n');

  const fullDialogue = params.transcript
    .map((t) => `${t.role === 'tutor' ? lang.tutorName : 'Learner'}: ${t.text}`)
    .join('\n');

  return [
    `Evaluate this ${lang.name} (${lang.nativeName}) speaking practice session for a ${prof.label} (${prof.cefrRange}) learner.`,
    `Language-Specific Evaluation Rules:\n- ${lang.evaluationRules.join('\n- ')}`,
    `Capability & Honesty Constraint: ${capability.evaluationDisclaimer}`,
    `Explanation Language Requirement: ${explanationLangDirective}`,
    `Full Conversation Transcript:\n${fullDialogue}`,
    `Learner Utterances to Analyze:\n${userTurns || '(Learner listened to the opening prompt)'}`,
    `For each learner mistake or area of improvement, return the exact originalSentence, the natural correctedSentence in ${lang.name}, a clear explanation in the learner's preferred explanation language, and a naturalExample in ${lang.name}.`,
  ].join('\n\n');
}

export function calculateStreakAndProgress(params: {
  currentStreakDays: number;
  lastPracticeDateIso: string | null;
  todayDateIso: string;
  completedSessionMinutes: number;
  previousTotalMinutes: number;
  previousLessonsCompleted: number;
}): {
  updatedStreakDays: number;
  updatedTotalMinutes: number;
  updatedLessonsCompleted: number;
  streakIncremented: boolean;
} {
  const today = params.todayDateIso.slice(0, 10);
  const lastDate = params.lastPracticeDateIso ? params.lastPracticeDateIso.slice(0, 10) : null;

  let updatedStreakDays = params.currentStreakDays;
  let streakIncremented = false;

  if (!lastDate) {
    updatedStreakDays = 1;
    streakIncremented = true;
  } else if (lastDate === today) {
    updatedStreakDays = Math.max(1, params.currentStreakDays);
  } else {
    const d1 = new Date(`${lastDate}T00:00:00Z`).getTime();
    const d2 = new Date(`${today}T00:00:00Z`).getTime();
    const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      updatedStreakDays = params.currentStreakDays + 1;
      streakIncremented = true;
    } else if (diffDays > 1) {
      updatedStreakDays = 1;
      streakIncremented = true;
    }
  }

  return {
    updatedStreakDays,
    updatedTotalMinutes: params.previousTotalMinutes + Math.max(1, Math.round(params.completedSessionMinutes)),
    updatedLessonsCompleted: params.previousLessonsCompleted + 1,
    streakIncremented,
  };
}

export function generateRevisionQuestions(vocabList: SavedVocabItem[]): RevisionQuestion[] {
  if (!vocabList || vocabList.length === 0) return [];

  const distractorsPool = [
    'Yesterday I have attended the meeting about the project.',
    'Ich komme später, weil der Zug hat Verspätung.',
    'Estoy un ingeniero de software en Madrid.',
    'J’ai visité mon ami hier soir.',
  ];

  return vocabList.slice(0, 6).map((item, index) => {
    const otherPhrases = vocabList
      .filter((v) => v.id !== item.id)
      .map((v) => v.phrase);
    const distractors = [...otherPhrases, ...distractorsPool]
      .filter((p) => p !== item.phrase)
      .slice(0, 2);

    // Deterministic rotation of options based on index
    const options = [item.phrase, ...distractors];
    const rotated =
      index % 2 === 0
        ? options
        : [options[1] || item.phrase, item.phrase, ...(options.slice(2))];

    return {
      id: `rev-${item.id}`,
      vocabId: item.id,
      languageCode: item.languageCode,
      promptText: `Select the most natural, grammatically accurate ${getLanguageConfig(item.languageCode).name} expression:`,
      translationHint: item.translation,
      options: Array.from(new Set(rotated)),
      correctAnswer: item.phrase,
      explanation: item.explanation,
    };
  });
}

export interface DailyGoalReminderStatus {
  shouldShowReminder: boolean;
  targetLanguageCode: LanguageCode;
  targetLanguageName: string;
  tutorName: string;
  dailyGoalMinutes: number;
  practicedMinutesToday: number;
  remainingMinutesToday: number;
  progressPercent: number;
  headline: string;
  subtext: string;
}

export function evaluateDailyGoalReminder(params: {
  targetLanguage: LanguageCode;
  dailyGoalMinutes: number;
  practicedMinutesToday: number;
  userName?: string;
}): DailyGoalReminderStatus {
  const lang = getLanguageConfig(params.targetLanguage);
  const goal = Math.max(5, Number(params.dailyGoalMinutes) || 15);
  const practiced = Math.max(0, Number(params.practicedMinutesToday) || 0);
  const remaining = Math.max(0, goal - practiced);
  const progressPercent = Math.min(100, Math.round((practiced / goal) * 100));
  const shouldShowReminder = remaining > 0;

  const firstName = (params.userName || 'Learner').split(' ')[0];

  return {
    shouldShowReminder,
    targetLanguageCode: lang.code,
    targetLanguageName: lang.name,
    tutorName: lang.tutorName,
    dailyGoalMinutes: goal,
    practicedMinutesToday: practiced,
    remainingMinutesToday: remaining,
    progressPercent,
    headline: shouldShowReminder
      ? `Welcome back, ${firstName} — ${remaining}m left to reach your daily ${lang.name} speaking goal`
      : `Daily ${lang.name} speaking goal achieved!`,
    subtext: shouldShowReminder
      ? `You have completed ${practiced}m of your ${goal}m daily target (${progressPercent}%). Continue practicing with ${lang.tutorName} to keep your streak growing.`
      : `You have completed ${practiced}m today and met your ${goal}m daily target.`,
  };
}

