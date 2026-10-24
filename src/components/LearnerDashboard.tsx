import React, { useState } from 'react';
import { LanguageCode, LanguageConfig, ProficiencyLevel } from '../config/languages';
import { UserOnboardingProfile } from '../utils/learningEngine';
import { Flame, Clock, BookOpen, Award, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

export interface LanguageProgressItem {
  languageCode: LanguageCode;
  proficiency: ProficiencyLevel;
  completedLessons: number;
  speakingMinutes: number;
  masteryPercent: number;
  lastPracticedAt: string | null;
}

export interface HistoryRecord {
  id: string;
  languageCode: LanguageCode;
  languageName: string;
  proficiency: ProficiencyLevel;
  scenarioId: string;
  scenarioTitle: string;
  durationMinutes: number;
  mode: string;
  createdAt: string;
  transcript: Array<{ role: 'user' | 'tutor'; text: string; timestamp: string }>;
  evaluation: {
    grammarScore: number;
    vocabularyScore: number;
    sentenceStructureScore: number;
    fluencyScore: number;
    pronunciationScore: number | null;
    pronunciationNote: string;
    overallSummary: string;
    corrections: Array<{
      originalSentence: string;
      correctedSentence: string;
      explanation: string;
      naturalExample: string;
      category: string;
    }>;
  };
}

interface LearnerDashboardProps {
  user: UserOnboardingProfile;
  streakDays: number;
  usedMinutesToday: number;
  totalMinutesAllLanguages: number;
  totalLessonsAllLanguages: number;
  languages: LanguageConfig[];
  languageProgress: Record<LanguageCode, LanguageProgressItem>;
  conversationHistory: HistoryRecord[];
  onPracticeLanguage: (langCode: LanguageCode, prof: ProficiencyLevel) => Promise<void>;
}

export const LearnerDashboard: React.FC<LearnerDashboardProps> = ({
  user,
  streakDays,
  usedMinutesToday,
  totalMinutesAllLanguages,
  totalLessonsAllLanguages,
  languages,
  languageProgress,
  conversationHistory,
  onPracticeLanguage,
}) => {
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(
    conversationHistory[0]?.id || null
  );
  const [filterLang, setFilterLang] = useState<string>('all');

  const dailyGoalPct = Math.min(
    100,
    Math.round((usedMinutesToday / Math.max(5, user.dailyGoalMinutes)) * 100)
  );

  const filteredHistory =
    filterLang === 'all'
      ? conversationHistory
      : conversationHistory.filter((h) => h.languageCode === filterLang);

  return (
    <div className="space-y-6">
      {/* Top 4-Metric KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Active Speaking Streak</span>
            <Flame className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {streakDays} Days
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Daily target: {user.dailyGoalMinutes}m/day ({dailyGoalPct}% completed today)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Speaking Time</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {totalMinutesAllLanguages}m
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {usedMinutesToday}m practiced today across active sessions
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Completed Voice Lessons</span>
            <BookOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {totalLessonsAllLanguages}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Real-time role-play & diagnostic sessions
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Primary Focus Language</span>
            <Award className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-display text-slate-900 mt-2 truncate">
            {languages.find((l) => l.code === user.targetLanguage)?.name || 'English'}
          </div>
          <div className="text-xs text-slate-500 mt-1 capitalize">
            Level: {user.proficiency} · Explanations: {user.explanationLanguage}
          </div>
        </div>
      </div>

      {/* Progress Across All 10 Supported Languages */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display">
              Multi-Language Speaking Progress (10 Supported Languages)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track speaking minutes, completed lessons, and proficiency calibration for every language module.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Click any row to launch voice tutor
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Language</th>
                <th className="py-3 px-4">AI Tutor & Voice</th>
                <th className="py-3 px-4">Proficiency</th>
                <th className="py-3 px-4 text-right">Lessons</th>
                <th className="py-3 px-4 text-right">Speaking Mins</th>
                <th className="py-3 px-4 text-right">Mastery</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {languages.map((lang) => {
                const stat = languageProgress[lang.code] || {
                  languageCode: lang.code,
                  proficiency: 'beginner' as ProficiencyLevel,
                  completedLessons: 0,
                  speakingMinutes: 0,
                  masteryPercent: 10,
                  lastPracticedAt: null,
                };
                const isCurrent = lang.code === user.targetLanguage;
                return (
                  <tr
                    key={lang.code}
                    className={`hover:bg-slate-50 transition-colors ${
                      isCurrent ? 'bg-sky-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded bg-slate-900 text-white font-mono text-[11px] font-semibold flex items-center justify-center shrink-0">
                          {lang.monogram}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {lang.name}{' '}
                            <span className="font-normal text-slate-500">({lang.nativeName})</span>
                          </div>
                          <div className="text-[11px] text-slate-500">{lang.regionTag}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="font-medium text-slate-800">{lang.tutorName}</div>
                      <div className="text-[11px] text-slate-500">{lang.tutorPersona}</div>
                    </td>
                    <td className="py-3 px-4 capitalize font-medium text-slate-800">
                      {stat.proficiency}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                      {stat.completedLessons}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                      {stat.speakingMinutes}m
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-600 rounded-full"
                            style={{ width: `${stat.masteryPercent}%` }}
                          />
                        </div>
                        <span className="font-mono tabular-nums text-slate-800 w-8 text-right">
                          {stat.masteryPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onPracticeLanguage(lang.code, stat.proficiency)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <span>Practice</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conversation History & Past Feedback Archive */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display">
              Conversation History & Diagnostic Archive ({filteredHistory.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review full transcripts, grammar scores, and bilingual explanations from completed voice sessions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="history-lang-filter" className="text-xs text-slate-500">
              Filter Language:
            </label>
            <select
              id="history-lang-filter"
              value={filterLang}
              onChange={(e) => setFilterLang(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
            >
              <option value="all">All Languages</option>
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No completed sessions for this language filter yet. Start a voice session in the Live Tutor tab!
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item) => {
              const isExpanded = expandedHistoryId === item.id;
              return (
                <div
                  key={item.id}
                  className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/40"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                    className="w-full p-4 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-900">{item.languageName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{item.proficiency}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{item.durationMinutes}m session</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">
                        {item.scenarioTitle}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right font-mono tabular-nums">
                        <span className="text-slate-500">Grammar: </span>
                        <span className="font-semibold text-slate-900">
                          {item.evaluation.grammarScore}%
                        </span>
                        <span className="mx-2 text-slate-300">|</span>
                        <span className="text-slate-500">Fluency: </span>
                        <span className="font-semibold text-slate-900">
                          {item.evaluation.fluencyScore}%
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 bg-white border-t border-slate-200 grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
                      <div className="space-y-2.5">
                        <div className="font-semibold text-slate-900">Session Transcript</div>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {item.transcript.map((turn, tIdx) => (
                            <div
                              key={tIdx}
                              className="p-2.5 rounded-lg bg-slate-50 border border-slate-200"
                            >
                              <div className="font-semibold text-slate-800 mb-0.5">
                                {turn.role === 'tutor' ? 'AI Tutor' : user.name} ·{' '}
                                <span className="font-mono font-normal text-slate-500">
                                  {turn.timestamp}
                                </span>
                              </div>
                              <div className="text-slate-700">{turn.text}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <div className="font-semibold text-slate-900">
                          Bilingual Evaluation & Corrections
                        </div>
                        <p className="p-2.5 rounded-lg bg-sky-50/60 border border-sky-200 text-slate-800">
                          {item.evaluation.overallSummary}
                        </p>
                        {item.evaluation.corrections.map((c, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-3 rounded-lg border border-slate-200 space-y-1"
                          >
                            <div>
                              <span className="text-slate-500">Original: </span>
                              <span className="line-through text-rose-700">
                                {c.originalSentence}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Corrected: </span>
                              <span className="font-semibold text-emerald-800">
                                {c.correctedSentence}
                              </span>
                            </div>
                            <div className="text-slate-700">{c.explanation}</div>
                            <div className="text-slate-500 italic">Example: “{c.naturalExample}”</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
