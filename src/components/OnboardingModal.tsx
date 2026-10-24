import React, { useState } from 'react';
import {
  LanguageCode,
  LanguageConfig,
  LearningObjectiveId,
  ProficiencyLevel,
} from '../config/languages';
import { UserOnboardingProfile } from '../utils/learningEngine';
import { Check, Globe, Clock, Target, Sparkles, Volume2 } from 'lucide-react';

interface OnboardingModalProps {
  user: UserOnboardingProfile;
  languages: LanguageConfig[];
  explanationLanguages: Array<{ code: string; label: string }>;
  learningObjectives: Array<{
    id: LearningObjectiveId;
    label: string;
    description: string;
    recommendedMinutes: number;
  }>;
  onComplete: (updatedProfile: Partial<UserOnboardingProfile>) => Promise<void>;
  onClose?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  user,
  languages,
  explanationLanguages,
  learningObjectives,
  onComplete,
  onClose,
}) => {
  const [name, setName] = useState(user.name);
  const [nativeLanguage, setNativeLanguage] = useState(user.nativeLanguage || 'Hindi (हिन्दी)');
  const [explanationLanguage, setExplanationLanguage] = useState(user.explanationLanguage || 'hi-en');
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>(user.targetLanguage || 'en');
  const [proficiency, setProficiency] = useState<ProficiencyLevel>(user.proficiency || 'intermediate');
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(user.dailyGoalMinutes || 20);
  const [learningObjective, setLearningObjective] = useState<LearningObjectiveId>(
    user.learningObjective || 'career_growth'
  );
  const [saving, setSaving] = useState(false);

  const selectedLangObj = languages.find((l) => l.code === targetLanguage) || languages[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onComplete({
        name,
        nativeLanguage,
        explanationLanguage,
        targetLanguage,
        proficiency,
        dailyGoalMinutes,
        learningObjective,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-sky-700 tracking-wide">
            Personalized Language & Voice Calibration
          </p>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-1 font-display">
            Configure Your SpeakMate AI Studio
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Select from 10 supported spoken languages, set your current CEFR proficiency, and choose how grammar corrections are explained—including Hindi-to-English explanations for Indian learners.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="self-start lg:self-center px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Back to Studio
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-8">
        {/* Step 1: 10-Language Selection Grid */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-600" />
              <span>01. Select Target Speaking Language (10 Languages Available)</span>
            </label>
            <span className="text-xs text-slate-500">
              Active Tutor: {selectedLangObj.tutorName} · {selectedLangObj.scriptType}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {languages.map((lang) => {
              const isSelected = lang.code === targetLanguage;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setTargetLanguage(lang.code)}
                  aria-pressed={isSelected}
                  className={`text-left p-3.5 rounded-lg border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-sky-600 bg-sky-50/60 text-slate-900 ring-1 ring-sky-600'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="w-8 h-8 rounded-md bg-slate-900 text-white font-mono text-xs font-semibold flex items-center justify-center shrink-0">
                      {lang.monogram}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-sky-600 shrink-0" />}
                  </div>
                  <div className="mt-3">
                    <div className="font-semibold text-sm text-slate-900 whitespace-nowrap truncate">
                      {lang.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {lang.nativeName} · {lang.scriptType}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 truncate">
                    Tutor: {lang.tutorName}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Language Capability Banner */}
          <div className="mt-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-700">
              <span className="font-semibold text-slate-900">
                {selectedLangObj.name} ({selectedLangObj.nativeName}) Focus:
              </span>{' '}
              {selectedLangObj.defaultFocusGoal}
            </div>
            <div className="text-xs text-slate-500 font-mono shrink-0">
              Voice: {selectedLangObj.recommendedVoice} · {selectedLangObj.bcp47}
            </div>
          </div>
        </section>

        {/* Step 2: Native & Explanation Language Preference */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-slate-200">
          <div>
            <label htmlFor="learner-name" className="block text-xs font-semibold text-slate-900 mb-1.5">
              02. Your Name
            </label>
            <input
              id="learner-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Aarav Mehta"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>

          <div>
            <label htmlFor="native-language" className="block text-xs font-semibold text-slate-900 mb-1.5">
              Native / Home Language
            </label>
            <select
              id="native-language"
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
            >
              <option value="Hindi (Hindustani)">Hindi (Hindustani)</option>
              <option value="English">English</option>
              <option value="Tamil / Telugu / Kannada / Malayalam">South Indian Languages + English</option>
              <option value="Marathi / Gujarati / Bengali / Punjabi">Regional Indian Languages</option>
              <option value="Spanish (Español)">Spanish (Español)</option>
              <option value="French (Français)">French (Français)</option>
              <option value="German (Deutsch)">German (Deutsch)</option>
              <option value="Japanese (Nihongo)">Japanese (Nihongo)</option>
              <option value="Mandarin (Putonghua)">Mandarin (Putonghua)</option>
              <option value="Portuguese (Português)">Portuguese (Português)</option>
            </select>
          </div>

          <div>
            <label htmlFor="explanation-language" className="block text-xs font-semibold text-slate-900 mb-1.5">
              Preferred Correction Explanation Language
            </label>
            <select
              id="explanation-language"
              value={explanationLanguage}
              onChange={(e) => setExplanationLanguage(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
            >
              {explanationLanguages.map((exp) => (
                <option key={exp.code} value={exp.code}>
                  {exp.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Step 3: Proficiency Level & Daily Speaking Goal */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2.5">
              03. Current Spoken Proficiency Level
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  {
                    id: 'beginner',
                    title: 'Beginner',
                    cefr: 'A1 – A2',
                    desc: 'Slow pace, core phrases & guided scaffolding',
                  },
                  {
                    id: 'intermediate',
                    title: 'Intermediate',
                    cefr: 'B1 – B2',
                    desc: 'Natural workplace & travel dialogues',
                  },
                  {
                    id: 'advanced',
                    title: 'Advanced',
                    cefr: 'C1 – C2',
                    desc: 'Native speed, nuance & executive precision',
                  },
                ] as const
              ).map((lvl) => {
                const active = proficiency === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setProficiency(lvl.id)}
                    className={`p-3.5 rounded-lg border text-left transition-all ${
                      active
                        ? 'border-sky-600 bg-sky-50/60 text-slate-900 ring-1 ring-sky-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-900">{lvl.title}</span>
                      <span className="text-xs font-mono text-slate-500">{lvl.cefr}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{lvl.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2.5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>04. Daily Speaking Commitment</span>
            </label>
            <div className="grid grid-cols-4 gap-3">
              {[10, 15, 20, 30].map((mins) => {
                const active = dailyGoalMinutes === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDailyGoalMinutes(mins)}
                    className={`p-3.5 rounded-lg border text-center transition-all ${
                      active
                        ? 'border-sky-600 bg-sky-50/60 text-slate-900 ring-1 ring-sky-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
                      {mins}m
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">per day</div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-2.5">
              Grammar Focus for {selectedLangObj.name} ({proficiency}):{' '}
              <span className="text-slate-700 font-medium">
                {selectedLangObj.grammarFocusAreas[proficiency].join(' · ')}
              </span>
            </p>
          </div>
        </section>

        {/* Step 4: Learning Objective */}
        <section className="pt-4 border-t border-slate-200">
          <label className="block text-sm font-semibold text-slate-900 mb-2.5 flex items-center gap-2">
            <Target className="w-4 h-4 text-sky-600" />
            <span>05. Primary Learning Objective</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {learningObjectives.map((obj) => {
              const active = learningObjective === obj.id;
              return (
                <button
                  key={obj.id}
                  type="button"
                  onClick={() => setLearningObjective(obj.id)}
                  className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    active
                      ? 'border-sky-600 bg-sky-50/60 text-slate-900 ring-1 ring-sky-600'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{obj.label}</div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{obj.description}</p>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-3 pt-2 border-t border-slate-100">
                    Recommended · {obj.recommendedMinutes}m/day
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-600">
            Selected Profile:{' '}
            <span className="font-semibold text-slate-900">
              {selectedLangObj.name} ({proficiency.toUpperCase()})
            </span>{' '}
            · Explanations in{' '}
            <span className="font-semibold text-slate-900">
              {explanationLanguages.find((e) => e.code === explanationLanguage)?.label.split('—')[0]}
            </span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {saving ? 'Calibrating Tutor...' : 'Save Preferences & Launch Tutor Studio'}
          </button>
        </div>
      </form>
    </div>
  );
};
