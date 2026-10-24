export type LanguageCode =
  | 'en'
  | 'hi'
  | 'es'
  | 'fr'
  | 'de'
  | 'ja'
  | 'ko'
  | 'zh'
  | 'it'
  | 'pt'
  | string;

export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced';

export type LearningObjectiveId =
  | 'career_growth'
  | 'relocation_travel'
  | 'daily_fluency'
  | 'academic_exam'
  | 'cultural_connection';

export type ScenarioId =
  | 'daily_life'
  | 'travel'
  | 'job_interview'
  | 'business_meetings'
  | 'storytelling'
  | 'role_play';

export type PlanTier = 'free' | 'starter' | 'pro';

export type PrebuiltVoiceName = 'Zephyr' | 'Kore' | 'Puck' | 'Fenrir' | 'Charon';

export interface SampleCorrection {
  originalSentence: string;
  correctedSentence: string;
  explanationEn: string;
  explanationHi: string;
  naturalExample: string;
  category: 'Grammar' | 'Vocabulary' | 'Sentence Structure' | 'Fluency';
}

export interface LanguageConfig {
  code: LanguageCode;
  name: string;
  nativeName: string;
  regionTag: string;
  monogram: string;
  scriptType: string;
  bcp47: string;
  recommendedVoice: PrebuiltVoiceName;
  tutorName: string;
  tutorPersona: string;
  liveVoiceSupported: boolean;
  acousticPronunciationSupported: boolean;
  capabilityNote: string;
  starterPrompts: Record<ProficiencyLevel, string>;
  grammarFocusAreas: Record<ProficiencyLevel, string[]>;
  evaluationRules: string[];
  starterGreeting: string;
   starterGreetingTranslation: string;
  defaultFocusGoal: string;
  sampleCorrections: SampleCorrection[];
}

export interface ScenarioConfig {
  id: ScenarioId;
  title: string;
  category: string;
  description: string;
  minTier: PlanTier;
  rolePlaySetting: string;
  tutorRole: string;
  learnerGoal: string;
  suggestedPrompts: string[];
}

export interface PlanQuotaConfig {
  id: PlanTier;
  name: string;
  audienceLabel: string;
  priceMonthlyUsd: number;
  dailySpeakingMinutesLimit: number;
  dailySessionsLimit: number;
  allowedScenarios: ScenarioId[];
  bilingualExplanations: boolean;
  liveVoiceEnabled: boolean;
  maxSavedPhrases: number;
}

export const PROFICIENCY_CONFIGS: Record<
  ProficiencyLevel,
  {
    id: ProficiencyLevel;
    label: string;
    cefrRange: string;
    speechPaceInstruction: string;
    vocabularyComplexity: string;
    scaffoldingRule: string;
  }
> = {
  beginner: {
    id: 'beginner',
    label: 'Beginner',
    cefrRange: 'A1 – A2',
    speechPaceInstruction: 'Speak slowly and clearly with short, high-frequency sentences (6-10 words max per turn).',
    vocabularyComplexity: 'Use core everyday vocabulary and cognates; avoid obscure idioms.',
    scaffoldingRule:
      'If the learner hesitates or mixes in their native language, gently model the correct target phrase and invite them to repeat it.',
  },
  intermediate: {
    id: 'intermediate',
    label: 'Intermediate',
    cefrRange: 'B1 – B2',
    speechPaceInstruction: 'Speak at a natural, measured conversational pace using connected sentences.',
    vocabularyComplexity: 'Introduce workplace, travel, and expressive connectors while keeping register natural.',
    scaffoldingRule:
      'Challenge the learner to expand on "why" and "how" using past, present, and conditional tenses.',
  },
  advanced: {
    id: 'advanced',
    label: 'Advanced',
    cefrRange: 'C1 – C2',
    speechPaceInstruction: 'Speak at authentic native cadence with nuanced prosody and idiomatic phrasing.',
    vocabularyComplexity: 'Use domain-specific terminology, subtle register shifts, and rhetorical nuance.',
    scaffoldingRule:
      'Push for precision, diplomatic phrasing, persuasive structure, and native-level collocations.',
  },
};

export const LEARNING_OBJECTIVES: Array<{
  id: LearningObjectiveId;
  label: string;
  description: string;
  recommendedMinutes: number;
}> = [
  {
    id: 'career_growth',
    label: 'Global Career & Interviews',
    description: 'Succeed in multinational interviews, standups, and executive presentations.',
    recommendedMinutes: 20,
  },
  {
    id: 'daily_fluency',
    label: 'Everyday Conversational Fluency',
    description: 'Think on your feet in spontaneous social and neighborhood conversations.',
    recommendedMinutes: 15,
  },
  {
    id: 'relocation_travel',
    label: 'Relocation & Immersive Travel',
    description: 'Navigate transit, dining, housing, and local services without switching to English.',
    recommendedMinutes: 15,
  },
  {
    id: 'academic_exam',
    label: 'Speaking Exams & Certification',
    description: 'Build structured spoken responses for IELTS, TOEFL, DELE, DELF, or JLPT interviews.',
    recommendedMinutes: 30,
  },
  {
    id: 'cultural_connection',
    label: 'Family, Heritage & Storytelling',
    description: 'Share personal stories, humor, and cultural perspectives naturally.',
    recommendedMinutes: 15,
  },
];

export const CONVERSATION_SCENARIOS: ScenarioConfig[] = [
  {
    id: 'daily_life',
    title: 'Morning Coffee & Neighborhood Catch-Up',
    category: 'Daily Life',
    description: 'Order artisanal coffee, chat about weekend plans, and handle casual small talk with a local barista.',
    minTier: 'free',
    rolePlaySetting: 'A bustling neighborhood café during morning rush hour.',
    tutorRole: 'Friendly local barista and neighborhood regular',
    learnerGoal: 'Order a customized drink, ask for a local recommendation, and share your plans for the day.',
    suggestedPrompts: [
      'Could I get an iced oat latte, less sweet please?',
      'What pastry do you recommend fresh out of the oven today?',
      'I am exploring the neighborhood this afternoon—any quiet parks nearby?',
    ],
  },
  {
    id: 'travel',
    title: 'High-Speed Rail & Hotel Concierge',
    category: 'Travel',
    description: 'Resolve a missed train connection, rebook seats, and request late hotel check-in smoothly.',
    minTier: 'free',
    rolePlaySetting: 'Central railway station ticketing desk & boutique hotel reception.',
    tutorRole: 'Station transit officer & hotel concierge',
    learnerGoal: 'Explain why you missed the connection, request the next express departure, and confirm luggage storage.',
    suggestedPrompts: [
      'My connecting flight was delayed by forty minutes; can I transfer my ticket to the next express train?',
      'Do I need a new seat reservation for car four?',
      'Could we store our bags at the concierge desk until 3 PM?',
    ],
  },
  {
    id: 'job_interview',
    title: 'Behavioral & Technical Hiring Interview',
    category: 'Job Interviews',
    description: 'Articulate your past achievements, leadership decisions, and problem-solving approach under pressure.',
    minTier: 'starter',
    rolePlaySetting: 'Final-round video interview with a hiring director at an international technology firm.',
    tutorRole: 'Senior Engineering & Product Hiring Director',
    learnerGoal: 'Deliver structured STAR-method answers, clarify ambiguous requirements, and ask insightful questions.',
    suggestedPrompts: [
      'In my previous role, I led the migration of our checkout service, which reduced latency by 35%.',
      'When priorities conflicted between engineering and design, I aligned the team around user retention metrics.',
      'How does your team measure success during the first ninety days in this role?',
    ],
  },
  {
    id: 'business_meetings',
    title: 'Quarterly Roadmap & Stakeholder Negotiation',
    category: 'Business Meetings',
    description: 'Present quarterly KPIs, push back diplomatically on scope creep, and align cross-functional leads.',
    minTier: 'starter',
    rolePlaySetting: 'Executive boardroom strategy review with regional stakeholders.',
    tutorRole: 'VP of Operations questioning timeline trade-offs',
    learnerGoal: 'Propose a realistic delivery schedule, defend resource trade-offs politely, and secure sign-off.',
    suggestedPrompts: [
      'If we accelerate the mobile launch to October, we will need to defer the analytics redesign to Q1.',
      'Let us look at the conversion data from the pilot market before committing additional budget.',
      'Can we agree on locking the core scope by Friday so engineering can begin sprint planning?',
    ],
  },
  {
    id: 'storytelling',
    title: 'Personal Narrative & Cultural Storytelling',
    category: 'Storytelling',
    description: 'Narrate a memorable travel mishap or turning point using vivid descriptive transitions and past tenses.',
    minTier: 'pro',
    rolePlaySetting: 'Evening dinner table conversation with close international friends.',
    tutorRole: 'Curious host who asks engaging follow-up questions about details and emotions',
    learnerGoal: 'Tell a cohesive 4-part story with setting, unexpected complication, resolution, and reflection.',
    suggestedPrompts: [
      'Last autumn, I took a night bus through the mountains without realizing the festival had closed the main road.',
      'Just when we thought we were stranded, a local baker invited us in for warm tea.',
      'Looking back, that detour taught me to trust spontaneity when traveling.',
    ],
  },
  {
    id: 'role_play',
    title: 'Apartment Lease & Utility Negotiation',
    category: 'Role-Play',
    description: 'Inspect an apartment, negotiate lease terms and maintenance repairs, and clarify deposit clauses.',
    minTier: 'pro',
    rolePlaySetting: 'Walkthrough of a sunlit city apartment with the property manager.',
    tutorRole: 'Pragmatic property manager open to reasonable negotiation',
    learnerGoal: 'Ask about heating costs, request window seal repairs before move-in, and negotiate a 12-month rate.',
    suggestedPrompts: [
      'Are high-speed fiber internet and central heating included in the monthly maintenance fee?',
      'I noticed a slight draft near the balcony door—could that seal be replaced before the first of the month?',
      'If I sign an eighteen-month lease today, would the owner consider keeping the rent at the current rate?',
    ],
  },
];

export const PLAN_QUOTAS: Record<PlanTier, PlanQuotaConfig> = {
  free: {
    id: 'free',
    name: 'Free Explorer',
    audienceLabel: 'For casual learners testing real-time voice practice',
    priceMonthlyUsd: 0,
    dailySpeakingMinutesLimit: 10,
    dailySessionsLimit: 3,
    allowedScenarios: ['daily_life', 'travel'],
    bilingualExplanations: true,
    liveVoiceEnabled: true,
    maxSavedPhrases: 25,
  },
  starter: {
    id: 'starter',
    name: 'Starter Fluency',
    audienceLabel: 'For career & travel learners building a daily speaking habit',
    priceMonthlyUsd: 14,
    dailySpeakingMinutesLimit: 45,
    dailySessionsLimit: 12,
    allowedScenarios: ['daily_life', 'travel', 'job_interview', 'business_meetings'],
    bilingualExplanations: true,
    liveVoiceEnabled: true,
    maxSavedPhrases: 200,
  },
  pro: {
    id: 'pro',
    name: 'Pro Polyglot Studio',
    audienceLabel: 'For intensive professionals & multi-language mastery',
    priceMonthlyUsd: 29,
    dailySpeakingMinutesLimit: 180,
    dailySessionsLimit: 50,
    allowedScenarios: [
      'daily_life',
      'travel',
      'job_interview',
      'business_meetings',
      'storytelling',
      'role_play',
    ],
    bilingualExplanations: true,
    liveVoiceEnabled: true,
    maxSavedPhrases: 2000,
  },
};

const INITIAL_LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    regionTag: 'Global · US / UK / IN',
    monogram: 'EN',
    scriptType: 'Latin',
    bcp47: 'en-US',
    recommendedVoice: 'Zephyr',
    tutorName: 'Clara Vance',
    tutorPersona: 'Executive Communication & Fluency Coach',
    liveVoiceSupported: true,
    acousticPronunciationSupported: true,
    capabilityNote:
      'Full Gemini Live bidirectional audio + live transcript evaluation. Ideal for Indian and global learners mastering workplace & interview English.',
    starterGreeting: "Hi there! I'm Clara. Ready to practice natural, confident English together today?",
    starterGreetingTranslation: 'Namaste! Main Clara hoon. Kya aap aaj confidence ke saath natural English bolne ki practice ke liye taiyaar hain?',
    defaultFocusGoal: 'Eliminate filler words, master article usage, and speak with crisp workplace confidence.',
    starterPrompts: {
      beginner: 'Greet the learner warmly, ask how their day is going in simple English, and invite a 1-sentence answer.',
      intermediate: 'Engage the learner in a realistic workplace or daily conversation, encouraging idiomatic phrasing.',
      advanced: 'Conduct a high-level executive or interview dialogue, testing nuance, hedging, and persuasive structure.',
    },
    grammarFocusAreas: {
      beginner: ['Present simple vs. continuous', 'Articles (a/an/the)', 'Prepositions of time and place'],
      intermediate: ['Present perfect vs. past simple', 'Conditional clauses', 'Polite workplace requests'],
      advanced: ['Subtle modal hedging', 'Inversion and emphasis', 'Idiomatic phrasal verbs'],
    },
    evaluationRules: [
      'Check for common Indian-English and global L2 patterns (e.g., "I am having two brothers" -> "I have two brothers", "discuss about" -> "discuss", "revert back" -> "reply").',
      'Evaluate tense consistency between past simple and present perfect.',
      'Provide clear, encouraging explanations in the learner preferred language (including Hindi-to-English explanations when requested).',
    ],
    sampleCorrections: [
      {
        originalSentence: 'Yesterday I have attended the client meeting and discussed about the timeline.',
        correctedSentence: 'Yesterday I attended the client meeting and discussed the timeline.',
        explanationEn:
          'When you specify a finished past time like "Yesterday", use Past Simple ("attended") instead of Present Perfect ("have attended"). Also, the verb "discuss" is transitive and never takes "about".',
        explanationHi:
          'Jab samay spasht roop se beeta hua ho (jaise "Yesterday"), tab "have attended" ki jagah Simple Past ("attended") ka prayog karein. Saath hi "discuss" ke baad "about" nahi lagta kyunki "discuss" ka arth hi "ke baare mein charcha karna" hai.',
        naturalExample: 'We discussed the Q4 product roadmap during our standup yesterday.',
        category: 'Grammar',
      },
      {
        originalSentence: 'Myself Rohan and I am having five years experience in backend development.',
        correctedSentence: "I'm Rohan, and I have five years of experience in backend development.",
        explanationEn:
          'Avoid starting introductions with reflexive pronoun "Myself". Also, possession/experience is a state, so use "I have" instead of continuous "I am having".',
        explanationHi:
          'Apna parichay dete samay "Myself" se sentence shuru na karein—iske bajay "I am" ya "My name is" kahein. Experience batane ke liye "I am having" nahi balki Simple Present "I have" ka prayog hota hai.',
        naturalExample: 'I have over six years of experience building distributed Java microservices.',
        category: 'Sentence Structure',
      },
    ],
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'Hindustani / Devanagari',
    regionTag: 'India · Delhi & Mumbai',
    monogram: 'HI',
    scriptType: 'Devanagari & Roman',
    bcp47: 'hi-IN',
    recommendedVoice: 'Kore',
    tutorName: 'Aarav Sharma',
    tutorPersona: 'Conversational Hindi & Cultural Mentor',
    liveVoiceSupported: true,
    acousticPronunciationSupported: true,
    capabilityNote:
      'Supports Gemini Live audio conversation in Hindi with Romanized & Devanagari pronunciation guidance.',
    starterGreeting: 'Namaste! Main Aarav hoon. Aaj hum kis vishay par Hindi mein baatcheet shuru karein?',
    starterGreetingTranslation: 'Hello! I am Aarav. What topic should we talk about in Hindi today?',
    defaultFocusGoal: 'Master gendered verb endings, postpositions (ne/ko/se), and natural polite honorifics (Aap).',
    starterPrompts: {
      beginner: 'Use friendly everyday Hindi with occasional English glosses if needed. Focus on polite "Aap" forms.',
      intermediate: 'Converse naturally in spoken Hindustani/Hindi used in Delhi and Mumbai workplaces and markets.',
      advanced: 'Engage in rich cultural, business, and narrative Hindi with refined vocabulary and idioms (Muhavare).',
    },
    grammarFocusAreas: {
      beginner: ['Noun gender agreement', 'Polite pronouns (Aap / Tum)', 'Basic postpositions (mein, par, se)'],
      intermediate: ['Ergative "ne" in past tense', 'Oblique case before postpositions', 'Compound verbs'],
      advanced: ['Subjunctive mood', 'Idiomatic expressions (Muhavare)', 'Formal vs. colloquial register'],
    },
    evaluationRules: [
      'Verify correct verb gender/number agreement and ergative "ne" usage in transitive past sentences.',
      'Highlight natural spoken phrasing vs overly literal English-to-Hindi translations.',
    ],
    sampleCorrections: [
      {
        originalSentence: 'Kal main bazaar gaya aur ek nayi kitaab kharida.',
        correctedSentence: 'Kal main bazaar gaya aur maine ek nayi kitaab kharidi.',
        explanationEn:
          'In Hindi past tense, transitive verbs like "kharidna" (to buy) require the ergative marker "ne" ("maine"), and the verb agrees in gender with the object "kitaab" (feminine -> "kharidi").',
        explanationHi:
          'Past tense mein "kharidna" jaisi transitive verb ke saath karta mein "ne" ("maine") lagta hai, aur verb object "kitaab" (feminine) ke anusaar "kharidi" ho jaati hai.',
        naturalExample: 'Maine pichhle hafte Dilli pustak mele se do nayi kitaabein kharidin.',
        category: 'Grammar',
      },
    ],
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    regionTag: 'Spain & Latin America',
    monogram: 'ES',
    scriptType: 'Latin',
    bcp47: 'es-ES',
    recommendedVoice: 'Puck',
    tutorName: 'Mateo Rivera',
    tutorPersona: 'Madrid & Bogotá Immersion Specialist',
    liveVoiceSupported: true,
    acousticPronunciationSupported: true,
    capabilityNote: 'Full Gemini Live two-way voice support with ser/estar and subjunctive diagnostics.',
    starterGreeting: '¡Hola! Soy Mateo. ¿Listo para practicar español con una conversación real hoy?',
    starterGreetingTranslation: 'Hello! I am Mateo. Ready to practice Spanish with a real conversation today?',
    defaultFocusGoal: 'Distinguish ser vs. estar effortlessly and converse smoothly in past tenses.',
    starterPrompts: {
      beginner: 'Speak clear, warm Spanish at a measured pace. Focus on present tense and everyday greetings.',
      intermediate: 'Practice preterite vs. imperfect storytelling and workplace/travel problem solving.',
      advanced: 'Incorporate subjunctive mood triggers, conditional clauses, and authentic regional expressions.',
    },
    grammarFocusAreas: {
      beginner: ['Ser vs. Estar', 'Gender & number agreement', 'Regular present conjugations'],
      intermediate: ['Por vs. Para', 'Preterite vs. Imperfect', 'Reflexive verbs'],
      advanced: ['Present & imperfect subjunctive', 'Idiomatic connectors', 'Indirect object pronoun stacking'],
    },
    evaluationRules: [
      'Check accuracy of ser vs. estar, por vs. para, and preterite vs. imperfect tense choices.',
      'Ensure gender/number agreement between nouns and adjectives.',
    ],
    sampleCorrections: [
      {
        originalSentence: 'Estoy un ingeniero de software y trabajo para cinco años en esta empresa.',
        correctedSentence: 'Soy ingeniero de software y llevo cinco años trabajando en esta empresa.',
        explanationEn:
          'Professions use "ser" ("Soy ingeniero", without the article "un"), and ongoing duration is expressed naturally with "llevar + gerund" or "hace + time", not "para".',
        explanationHi:
          'Spanish mein profession batane ke liye "estar" nahi balki "ser" ("Soy ingeniero") ka prayog hota hai. Saath hi samay ki avadhi batane ke liye "llevo cinco años trabajando" sabse natural tarika hai.',
        naturalExample: 'Soy diseñadora de producto y llevo tres años viviendo en Barcelona.',
        category: 'Grammar',
      },
    ],
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    regionTag: 'France · Québec · Europe',
    monogram: 'FR',
    scriptType: 'Latin',
    bcp47: 'fr-FR',
    recommendedVoice: 'Charon',
    tutorName: 'Camille Laurent',
    tutorPersona: 'Parisian Cultural & Business Tutor',
    liveVoiceSupported: true,
    acousticPronunciationSupported: true,
    capabilityNote: 'Full Gemini Live voice conversation with liaison, register (tu/vous), and tense feedback.',
    starterGreeting: "Bonjour ! Je m'appelle Camille. De quoi aimeriez-vous discuter en français aujourd'hui ?",
    starterGreetingTranslation: 'Hello! My name is Camille. What would you like to discuss in French today?',
    defaultFocusGoal: 'Master passé composé vs. imparfait, partitive articles, and natural spoken connectors.',
    starterPrompts: {
      beginner: 'Speak clear, encouraging French using polite "vous" or friendly "tu" as appropriate.',
      intermediate: 'Practice café, transit, and office dialogues using passé composé and imparfait.',
      advanced: 'Explore nuanced debate, subjunctive clauses, and professional diplomatic French.',
    },
    grammarFocusAreas: {
      beginner: ['Definite/indefinite/partitive articles (du, de la)', 'Avoir vs. Être expressions', 'Present verbs'],
      intermediate: ['Passé composé vs. Imparfait', 'Direct & indirect pronouns (le, lui, y, en)', 'Polite conditionals'],
      advanced: ['Subjonctif présent', 'Logical discourse markers (cependant, néanmoins)', 'Register shifts'],
    },
    evaluationRules: [
      'Check auxiliary selection (avoir vs. être) and past participle agreement in passé composé.',
      'Flag literal translations of age or physical feelings that require "avoir" in French.',
    ],
    sampleCorrections: [
      {
        originalSentence: "J'ai visité mon ami hier soir et nous sommes parlé du projet.",
        correctedSentence: "J'ai rendu visite à mon ami hier soir et nous avons parlé du projet.",
        explanationEn:
          'In French, "visiter" is used for places/museums; for people, use "rendre visite à". Also, "parler" takes the auxiliary "avoir" ("nous avons parlé"), not "être".',
        explanationHi:
          'French mein kisi sthaan ko dekhne ke liye "visiter" aata hai, lekin kisi vyakti se milne jaane ke liye "rendre visite à" ka prayog karein. Saath hi "parler" ke saath "avoir" ("nous avons parlé") lagta hai.',
        naturalExample: "Je vais rendre visite à mes collègues de Lyon la semaine prochaine.",
        category: 'Vocabulary',
      },
    ],
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    regionTag: 'Germany · Austria · Switzerland',
    monogram: 'DE',
    scriptType: 'Latin',
    bcp47: 'de-DE',
    recommendedVoice: 'Fenrir',
    tutorName: 'Lukas Weber',
    tutorPersona: 'Munich Engineering & Daily Life Coach',
    liveVoiceSupported: true,
    acousticPronunciationSupported: true,
    capabilityNote: 'Full Gemini Live voice support with V2 word-order and case system (Nominativ/Akkusativ/Dativ) checks.',
    starterGreeting: 'Hallo! Ich bin Lukas. Wollen wir heute zusammen dein gesprochenes Deutsch trainieren?',
    starterGreetingTranslation: 'Hello! I am Lukas. Shall we train your spoken German together today?',
    defaultFocusGoal: 'Build automatic verb-second (V2) main clauses and verb-final subordinate clauses.',
    starterPrompts: {
      beginner: 'Use clear High German (Hochdeutsch) with short sentences and everyday vocabulary.',
      intermediate: 'Practice Perfekt past tense, modal verbs, and subordinate clauses (weil, dass, obwohl).',
      advanced: 'Conduct professional engineering/business discussions using Konjunktiv II and precise connectors.',
    },
    grammarFocusAreas: {
      beginner: ['Articles & gender (der/die/das)', 'Verb-second (V2) word order', 'Separable prefix verbs'],
      intermediate: ['Akkusativ vs. Dativ prepositions', 'Subordinate clause verb-final rule', 'Perfekt tense'],
      advanced: ['Konjunktiv II politeness & hypotheticals', 'Noun-verb collocations', 'Genitive constructions'],
    },
    evaluationRules: [
      'Strictly verify verb position (V2 in main clauses, verb-final after weil/dass/wenn).',
      'Check case endings after two-way prepositions (in, an, auf) and dative verbs.',
    ],
    sampleCorrections: [
      {
        originalSentence: 'Ich komme heute ein bisschen später, weil der Zug hat Verspätung.',
        correctedSentence: 'Ich komme heute ein bisschen später, weil der Zug Verspätung hat.',
        explanationEn:
          'In German, the subordinating conjunction "weil" (because) sends the conjugated verb ("hat") to the very end of the clause.',
        explanationHi:
          'German bhasha mein "weil" (kyunki) se judne wale clause mein mukhya verb ("hat") sentence ke bilkul ant mein jaati hai.',
        naturalExample: 'Wir arbeiten heute von zu Hause aus, weil es stark schneit.',
        category: 'Sentence Structure',
      },
    ],
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: 'Nihongo (Romaji & Kana)',
    regionTag: 'Japan · Tokyo Standard',
    monogram: 'JA',
    scriptType: 'Kanji / Kana',
    bcp47: 'ja-JP',
    recommendedVoice: 'Kore',
    tutorName: 'Haruka Sato',
    tutorPersona: 'Tokyo Business Keigo & Daily Conversation Tutor',
    liveVoiceSupported: true,
    acousticPronunciationSupported: false,
    capabilityNote:
      'Gemini Live voice conversation supported; pitch-accent acoustics are approximated, so feedback focuses on particle precision (wa/ga/wo/ni/de) and politeness levels (Desu/Masu & Keigo).',
    starterGreeting: 'Konnichiwa! Sato Haruka desu. Kyou mo tanoshiku Nihongo de kaiwa no renshuu wo shimashou!',
    starterGreetingTranslation: 'Hello! I am Haruka Sato. Let us enjoy practicing Japanese conversation today!',
    defaultFocusGoal: 'Use particles (wa, ga, wo, ni, de) accurately and switch smoothly between polite and casual speech.',
    starterPrompts: {
      beginner: 'Use polite Desu/Masu form with simple vocabulary and clear sentence endings.',
      intermediate: 'Practice te-form connections, giving reasons (~kara/~node), and everyday travel/work situations.',
      advanced: 'Practice business Japanese (Sonkeigo & Kenjougo) and nuanced workplace consensus-building.',
    },
    grammarFocusAreas: {
      beginner: ['Core particles (wa, ga, wo, ni, de)', 'Polite Desu/Masu conjugations', 'Adjective tenses (i / na)'],
      intermediate: ['Te-form requests & sequences', 'Potential & volitional forms', 'Giving/receiving (ageru/kureru/morau)'],
      advanced: ['Honorific & humble Keigo', 'Contextual subject omission', 'Nuanced sentence-final expressions'],
    },
    evaluationRules: [
      'Check particle accuracy (especially wa vs ga and ni vs de).',
      'Check politeness consistency and natural omission of redundant pronouns (watashi/anata).',
    ],
    sampleCorrections: [
      {
        originalSentence: 'Watashi wa kinou, Tokyo-eki ni tomodachi wo aimashita.',
        correctedSentence: 'Kinou, Tokyo-eki de tomodachi ni aimashita.',
        explanationEn:
          'In Japanese, the location of an action takes "de" (Tokyo-eki de), and the person you meet with "au" takes the particle "ni" or "to" (tomodachi ni aimashita), never "wo". Also, "Watashi wa" can be omitted when obvious.',
        explanationHi:
          'Japanese mein kisi sthaan par action hone ke liye "de" (Tokyo-eki de) lagta hai, aur kisi vyakti se milne ("au") ke liye "ni" ya "to" (tomodachi ni) ka prayog hota hai, "wo" ka nahi.',
        naturalExample: 'Shuumatsu, Shibuya no kafe de daigaku no senpai ni aimashita.',
        category: 'Grammar',
      },
    ],
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: 'Hangugeo (Hangul)',
    regionTag: 'South Korea · Seoul Standard',
    monogram: 'KO',
    scriptType: 'Hangul & Roman',
    bcp47: 'ko-KR',
    recommendedVoice: 'Zephyr',
    tutorName: 'Ji-hoon Park',
    tutorPersona: 'Seoul Tech & Culture Conversation Coach',
    liveVoiceSupported: true,
    acousticPronunciationSupported: false,
    capabilityNote:
      'Gemini Live voice conversation supported; feedback focuses on speech levels (Haeyo-che vs Hapsyo-che), topic/subject markers, and natural verb connectors.',
    starterGreeting: 'Annyeonghaseyo! Park Ji-hoon imnida. Oneul eotteon jujero Hangugeo daehwareul nanwobolkka-yo?',
    starterGreetingTranslation: 'Hello! I am Ji-hoon Park. What topic shall we talk about in Korean today?',
    defaultFocusGoal: 'Master polite Haeyo-che endings and topic/subject particles (eun/neun vs i/ga).',
    starterPrompts: {
      beginner: 'Use friendly polite Haeyo-che (~ayo/eoyo) with clear, short everyday sentences.',
      intermediate: 'Practice clausal connectors (~haeseo, ~neunde, ~gi ttaemune) in daily and workplace scenarios.',
      advanced: 'Use formal Hapsyo-che and idiomatic Seoul workplace expressions with accurate honorifics (~si~).',
    },
    grammarFocusAreas: {
      beginner: ['Polite Haeyo-che conjugation', 'Particles eun/neun, i/ga, eul/reul', 'Location markers e vs eseo'],
      intermediate: ['Honorific infix -(eu)si-', 'Sequential & causal connectors', 'Future/intention -(eu)l geoyeyo'],
      advanced: ['Formal presentation endings (-seumnida)', 'Indirect quotation (-dago hada)', 'Nuanced discourse endings (-geodeunyo)'],
    },
    evaluationRules: [
      'Verify e vs eseo location marker usage and honorific consistency.',
      'Ensure natural Korean SOV word order and appropriate speech level.',
    ],
    sampleCorrections: [
      {
        originalSentence: 'Eoje doseogwan-e Hangugeo-reul gongbuhaesseoyo.',
        correctedSentence: 'Eoje doseogwan-eseo Hangugeo-reul gongbuhaesseoyo.',
        explanationEn:
          'When performing a dynamic action like studying ("gongbuhada") at a place, use the action-location particle "-eseo" (doseogwan-eseo) rather than static "-e".',
        explanationHi:
          'Jab kisi sthaan par koi dynamic action (jaise padhai karna "gongbuhada") kiya jaata hai, to "-e" ke bajay "-eseo" (doseogwan-eseo) particle ka upyog hota hai.',
        naturalExample: 'Oneul achim geuncheo kafe-eseo keopi-reul masimyeo imeil-eul hwaginhaesseoyo.',
        category: 'Grammar',
      },
    ],
  },
  {
    code: 'zh',
    name: 'Mandarin Chinese',
    nativeName: 'Putonghua / Pinyin',
    regionTag: 'Mandarin · Pinyin & Simplified',
    monogram: 'ZH',
    scriptType: 'Hanzi + Pinyin',
    bcp47: 'zh-CN',
    recommendedVoice: 'Puck',
    tutorName: 'Lin Wei',
    tutorPersona: 'Shanghai Business & Daily Mandarin Tutor',
    liveVoiceSupported: true,
    acousticPronunciationSupported: false,
    capabilityNote:
      'Gemini Live voice conversation supported; lexical tone contour grading is provided with Pinyin tone marks alongside measure-word and aspect-particle (le/guo/zhe) evaluation.',
    starterGreeting: 'Nǐ hǎo! Wǒ shì Lín Wēi. Jīntiān wǒmen yīqǐ yòng Zhōngwén liáo diǎn shénme ne?',
    starterGreetingTranslation: 'Hello! I am Lin Wei. What shall we chat about in Mandarin today?',
    defaultFocusGoal: 'Master time-before-place word order, measure words, and aspect particle le.',
    starterPrompts: {
      beginner: 'Speak clear standard Mandarin with short sentences. Include helpful context cues.',
      intermediate: 'Practice Time-Location-Verb word order, bǎ constructions, and workplace/travel dialogues.',
      advanced: 'Incorporate four-character idioms (chéngyǔ) and professional business negotiation phrasing.',
    },
    grammarFocusAreas: {
      beginner: ['Measure words (gè, běn, bēi, jiā)', 'Time expressions before verb', 'Yes/no & wh-questions'],
      intermediate: ['Completion particle le vs experience guo', 'Resultative complements', 'Bǎ sentence structure'],
      advanced: ['Formal business connectors (jǐnguǎn…dànshì…)', 'Common chéngyǔ idioms', 'Nuanced modal particles'],
    },
    evaluationRules: [
      'Check Mandarin word order: Subject + Time + Place + Verb + Object.',
      'Check measure word selection and avoid overusing "shì" before adjectives (use hěn instead).',
    ],
    sampleCorrections: [
      {
        originalSentence: 'Wǒ zuótiān gōngzuò zài bàngōngshì dào wǎnshàng bā diǎn.',
        correctedSentence: 'Wǒ zuótiān zài bàngōngshì gōngzuò dào wǎnshàng bā diǎn.',
        explanationEn:
          'In Mandarin Chinese, the location phrase ("zài bàngōngshì" - at the office) generally comes BEFORE the main verb ("gōngzuò" - work), unlike English.',
        explanationHi:
          'Mandarin Chinese mein sthaan batane wala phrase ("zài bàngōngshì" - office mein) mukhya verb ("gōngzuò" - kaam karna) se pehle aata hai.',
        naturalExample: 'Wǒmen míngtiān shàngwǔ shí diǎn zài sān lóu huìyìshì kāihuì.',
        category: 'Sentence Structure',
      },
    ],
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    regionTag: 'Italy · Milan & Rome',
    monogram: 'IT',
    scriptType: 'Latin',
    bcp47: 'it-IT',
    recommendedVoice: 'Fenrir',
    tutorName: 'Sofia Conti',
    tutorPersona: 'Milan Design, Gastronomy & Business Coach',
    liveVoiceSupported: true,
    acousticPronunciationSupported: true,
    capabilityNote: 'Full Gemini Live two-way voice conversation with preposition contraction and congiuntivo feedback.',
    starterGreeting: 'Ciao! Sono Sofia. Sei pronto a fare pratica di conversazione in italiano oggi?',
    starterGreetingTranslation: 'Hi! I am Sofia. Are you ready to practice Italian conversation today?',
    defaultFocusGoal: 'Master articulated prepositions (nel, sul, al), passato prossimo, and expressive Italian phrasing.',
    starterPrompts: {
      beginner: 'Speak warm, melodic Italian with clear pronunciation and everyday expressions.',
      intermediate: 'Practice passato prossimo vs imperfetto and polite requests in travel and work.',
      advanced: 'Use congiuntivo (subjunctive), pronomi combinati, and persuasive professional Italian.',
    },
    grammarFocusAreas: {
      beginner: ['Definite articles (il, lo, la, gli, le)', 'Preposizioni articolate', 'Present tense irregulars'],
      intermediate: ['Passato prossimo (avere vs essere)', 'Pronomi diretti e indiretti', 'Condizionale'],
      advanced: ['Congiuntivo presente e passato', 'Periodo ipotetico', 'Idiomatic particles (ci / ne)'],
    },
    evaluationRules: [
      'Verify essere vs avere auxiliary choice in passato prossimo and articulated prepositions.',
      'Encourage natural Italian double-consonant rhythm and expressive connectors.',
    ],
    sampleCorrections: [
      {
        originalSentence: 'Ieri ho andato a Milano per incontrare il cliente.',
        correctedSentence: 'Ieri sono andato a Milano per incontrare il cliente.',
        explanationEn:
          'Verbs of motion like "andare" (to go) require the auxiliary verb "essere" ("sono andato/a") in the passato prossimo, never "avere".',
        explanationHi:
          'Italian mein "andare" (jaana) jaisi motion verbs ke saath past tense (passato prossimo) mein "avere" nahi balki "essere" ("sono andato") ka upyog hota hai.',
        naturalExample: 'Siamo arrivati in stazione dieci minuti prima della partenza del treno.',
        category: 'Grammar',
      },
    ],
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    regionTag: 'Brazil & Portugal',
    monogram: 'PT',
    scriptType: 'Latin',
    bcp47: 'pt-BR',
    recommendedVoice: 'Charon',
    tutorName: 'Lucas Almeida',
    tutorPersona: 'São Paulo & Lisbon Conversational Tutor',
    liveVoiceSupported: true,
    acousticPronunciationSupported: true,
    capabilityNote: 'Full Gemini Live voice conversation supporting personal infinitive and future subjunctive nuances.',
    starterGreeting: 'Olá! Eu sou o Lucas. Vamos praticar português com uma conversa natural hoje?',
    starterGreetingTranslation: 'Hello! I am Lucas. Shall we practice Portuguese with a natural conversation today?',
    defaultFocusGoal: 'Use ser/estar/ficar accurately and master the Portuguese personal infinitive.',
    starterPrompts: {
      beginner: 'Speak clear, welcoming Brazilian/Continental Portuguese at a comfortable pace.',
      intermediate: 'Practice ser/estar/ficar distinctions, past tenses, and workplace interactions.',
      advanced: 'Incorporate future subjunctive (quando você chegar) and personal infinitive structures.',
    },
    grammarFocusAreas: {
      beginner: ['Ser, Estar, and Ficar', 'Preposition contractions (no, na, do, da)', 'Present continuous'],
      intermediate: ['Pretérito perfeito vs. imperfeito', 'Personal infinitive (infinitivo pessoal)', 'Por vs. Para'],
      advanced: ['Future subjunctive (futuro do subjuntivo)', 'Colloquial vs. formal pronoun placement', 'Business idioms'],
    },
    evaluationRules: [
      'Check correct usage of ser vs estar vs ficar and future subjunctive after "quando" / "se".',
      'Check preposition contractions with articles.',
    ],
    sampleCorrections: [
      {
        originalSentence: 'Quando eu chego no escritório amanhã, eu te ligo.',
        correctedSentence: 'Quando eu chegar ao escritório amanhã, eu te ligo.',
        explanationEn:
          'In Portuguese, future time clauses introduced by "quando" (when) or "se" (if) require the Future Subjunctive ("quando eu chegar"), not the simple present.',
        explanationHi:
          'Portuguese bhasha mein future ki kisi ghatna ke liye "quando" (jab) ya "se" (yadi) ke baad Future Subjunctive ("quando eu chegar") ka prayog hota hai, simple present ka nahi.',
        naturalExample: 'Se você tiver alguma dúvida sobre o contrato, me avise.',
        category: 'Grammar',
      },
    ],
  },
];

// Extensible registry so new languages can be added dynamically at runtime or config time
const languageRegistry = new Map<LanguageCode, LanguageConfig>(
  INITIAL_LANGUAGES.map((lang) => [lang.code, lang])
);

export function getAllLanguages(): LanguageConfig[] {
  return Array.from(languageRegistry.values());
}

export function getLanguageConfig(code: LanguageCode): LanguageConfig {
  return languageRegistry.get(code) || languageRegistry.get('en')!;
}

export function registerLanguageConfig(config: LanguageConfig): void {
  if (!config.code || !config.name) {
    throw new Error('Language code and name are required to register a language.');
  }
  languageRegistry.set(config.code, config);
}

export const EXPLANATION_LANGUAGES = [
  { code: 'hi-en', label: 'Hindi + English (Hinglish Bridge) — Recommended for Indian Learners' },
  { code: 'en', label: 'English (Standard Detailed Explanations)' },
  { code: 'hi', label: 'Hindi (Bilingual Grammar Explanations)' },
  { code: 'es', label: 'Spanish (Explicaciones en Español)' },
  { code: 'fr', label: 'French (Explications en Français)' },
  { code: 'de', label: 'German (Erklärungen auf Deutsch)' },
  { code: 'ja', label: 'Japanese (Nihongo Explanations)' },
  { code: 'pt', label: 'Portuguese (Explicações em Português)' },
];
