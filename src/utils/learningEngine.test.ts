import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAllLanguages,
  getLanguageConfig,
  registerLanguageConfig,
} from '../config/languages';
import {
  buildEvaluationPrompt,
  buildRealTimeGrammarCorrectionCheck,
  buildTutorSystemPrompt,
  calculateStreakAndProgress,
  checkSessionQuota,
  evaluateDailyGoalReminder,
  generateRevisionQuestions,
  getLanguageCapabilityMatrix,
} from './learningEngine';

test('supports all 10 core languages and allows extensible registration', () => {
  const langs = getAllLanguages();
  const codes = langs.map((l) => l.code);
  const expected = ['en', 'hi', 'es', 'fr', 'de', 'ja', 'ko', 'zh', 'it', 'pt'];
  for (const code of expected) {
    assert.equal(codes.includes(code), true, `Missing language code: ${code}`);
  }

  registerLanguageConfig({
    ...getLanguageConfig('en'),
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
  });
  assert.equal(getLanguageConfig('ar').name, 'Arabic');
});

test('enforces Free, Starter, and Pro server quotas and scenario tiers', () => {
  // Free plan trying to access a Pro scenario (storytelling)
  const blockedScenario = checkSessionQuota({
    planTier: 'free',
    usedMinutesToday: 2,
    usedSessionsToday: 1,
    scenarioId: 'storytelling',
  });
  assert.equal(blockedScenario.allowed, false);
  assert.equal(blockedScenario.scenarioAllowed, false);
  assert.equal(blockedScenario.requiredTierForScenario, 'pro');

  // Free plan exceeding daily minutes (10 min limit)
  const blockedMinutes = checkSessionQuota({
    planTier: 'free',
    usedMinutesToday: 10,
    usedSessionsToday: 1,
    scenarioId: 'daily_life',
  });
  assert.equal(blockedMinutes.allowed, false);
  assert.equal(blockedMinutes.remainingMinutes, 0);

  // Starter plan accessing job_interview within limits
  const allowedStarter = checkSessionQuota({
    planTier: 'starter',
    usedMinutesToday: 15,
    usedSessionsToday: 2,
    scenarioId: 'job_interview',
  });
  assert.equal(allowedStarter.allowed, true);
  assert.equal(allowedStarter.remainingMinutes, 30);
});

test('builds tutor system prompt with Hindi-to-English explanations for Indian users', () => {
  const prompt = buildTutorSystemPrompt({
    languageCode: 'en',
    proficiency: 'intermediate',
    scenarioId: 'job_interview',
    explanationLanguage: 'hi-en',
    learningObjective: 'career_growth',
  });

  assert.equal(prompt.includes('Hindi-to-English'), true);
  assert.equal(prompt.includes('Behavioral & Technical Hiring Interview'), true);
  assert.equal(prompt.includes('Intermediate (B1 – B2)'), true);
});

test('toggles real-time grammar corrections in tutor prompt and inline turn analyzer', () => {
  const enabledPrompt = buildTutorSystemPrompt({
    languageCode: 'en',
    proficiency: 'intermediate',
    scenarioId: 'daily_life',
    explanationLanguage: 'hi-en',
    learningObjective: 'daily_conversation',
    realTimeGrammarCorrections: true,
  });
  assert.equal(enabledPrompt.includes('Real-Time Grammar Corrections: ENABLED'), true);

  const disabledPrompt = buildTutorSystemPrompt({
    languageCode: 'en',
    proficiency: 'intermediate',
    scenarioId: 'daily_life',
    explanationLanguage: 'hi-en',
    learningObjective: 'daily_conversation',
    realTimeGrammarCorrections: false,
  });
  assert.equal(disabledPrompt.includes('Real-Time Grammar Corrections: DISABLED'), true);

  const liveCorrectionWhenOn = buildRealTimeGrammarCorrectionCheck({
    userText: 'We discussed about the project timeline.',
    languageCode: 'en',
    explanationLanguage: 'hi-en',
    enabled: true,
  });
  assert.notEqual(liveCorrectionWhenOn, null);
  assert.equal(liveCorrectionWhenOn?.correctedSentence, 'We discussed the project timeline.');

  const liveCorrectionWhenOff = buildRealTimeGrammarCorrectionCheck({
    userText: 'We discussed about the project timeline.',
    languageCode: 'en',
    explanationLanguage: 'hi-en',
    enabled: false,
  });
  assert.equal(liveCorrectionWhenOff, null);
});

test('reports honest model capabilities and fallback modes per language and mic state', () => {
  const jpWithMic = getLanguageCapabilityMatrix('ja', true);
  assert.equal(jpWithMic.liveVoiceSupported, true);
  assert.equal(jpWithMic.acousticPronunciationSupported, false);
  assert.equal(jpWithMic.recommendedMode, 'gemini_live_audio');

  const esWithoutMic = getLanguageCapabilityMatrix('es', false);
  assert.equal(esWithoutMic.recommendedMode, 'hybrid_text_and_tts');
  assert.equal(esWithoutMic.acousticPronunciationSupported, false);
});

test('calculates streaks and speaking progress accurately across consecutive days', () => {
  const consecutive = calculateStreakAndProgress({
    currentStreakDays: 4,
    lastPracticeDateIso: '2026-10-23T10:00:00Z',
    todayDateIso: '2026-10-24T08:00:00Z',
    completedSessionMinutes: 12,
    previousTotalMinutes: 50,
    previousLessonsCompleted: 5,
  });

  assert.equal(consecutive.updatedStreakDays, 5);
  assert.equal(consecutive.updatedTotalMinutes, 62);
  assert.equal(consecutive.updatedLessonsCompleted, 6);
  assert.equal(consecutive.streakIncremented, true);
});

test('generates interactive revision exercises from saved vocabulary', () => {
  const questions = generateRevisionQuestions([
    {
      id: 'v1',
      languageCode: 'en',
      phrase: 'Yesterday I attended the client meeting and discussed the timeline.',
      translation: 'कल मैंने क्लाइंट मीटिंग में भाग लिया और समय-सीमा पर चर्चा की।',
      explanation: 'Use simple past with Yesterday; "discuss" does not take "about".',
      naturalExample: 'We discussed the roadmap yesterday.',
      category: 'Grammar',
      masteryScore: 80,
      createdAt: '2026-10-24',
    },
  ]);

  assert.equal(questions.length, 1);
  assert.equal(
    questions[0].correctAnswer,
    'Yesterday I attended the client meeting and discussed the timeline.'
  );
  assert.equal(questions[0].options.includes(questions[0].correctAnswer), true);
});

test('evaluates daily speaking goal reminder on login for unmet vs met goals', () => {
  const unmet = evaluateDailyGoalReminder({
    targetLanguage: 'en',
    dailyGoalMinutes: 20,
    practicedMinutesToday: 8,
    userName: 'Aarav Mehta',
  });
  assert.equal(unmet.shouldShowReminder, true);
  assert.equal(unmet.remainingMinutesToday, 12);
  assert.equal(unmet.progressPercent, 40);
  assert.equal(unmet.targetLanguageName, 'English');

  const met = evaluateDailyGoalReminder({
    targetLanguage: 'es',
    dailyGoalMinutes: 15,
    practicedMinutesToday: 18,
    userName: 'Aarav Mehta',
  });
  assert.equal(met.shouldShowReminder, false);
  assert.equal(met.remainingMinutesToday, 0);
  assert.equal(met.progressPercent, 100);
});

