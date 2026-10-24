/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  LanguageCode,
  LanguageConfig,
  LearningObjectiveId,
  PlanQuotaConfig,
  PlanTier,
  ProficiencyLevel,
  ScenarioConfig,
} from './config/languages';
import {
  evaluateDailyGoalReminder,
  SavedVocabItem,
  UserOnboardingProfile,
} from './utils/learningEngine';
import { OnboardingModal } from './components/OnboardingModal';
import { LiveTutorStudio } from './components/LiveTutorStudio';
import { HistoryRecord, LanguageProgressItem, LearnerDashboard } from './components/LearnerDashboard';
import { VocabularyVault } from './components/VocabularyVault';
import { PlansAndAdminView } from './components/PlansAndAdminView';
import { DailyGoalToast } from './components/DailyGoalToast';

type ActiveTab = 'studio' | 'onboarding' | 'dashboard' | 'vocabulary' | 'plans';

interface BootstrapState {
  user: UserOnboardingProfile;
  streakDays: number;
  usedMinutesToday: number;
  usedSessionsToday: number;
  currentPlan: PlanQuotaConfig;
  allPlans: PlanQuotaConfig[];
  languages: LanguageConfig[];
  learningObjectives: Array<{
    id: LearningObjectiveId;
    label: string;
    description: string;
    recommendedMinutes: number;
  }>;
  explanationLanguages: Array<{ code: string; label: string }>;
  scenarios: ScenarioConfig[];
  languageProgress: Record<LanguageCode, LanguageProgressItem>;
  totalMinutesAllLanguages: number;
  totalLessonsAllLanguages: number;
  vocabularyNotebook: SavedVocabItem[];
  conversationHistory: HistoryRecord[];
  adminMetrics: any;
}

export default function App() {
  const [appState, setAppState] = useState<BootstrapState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [goalToastDismissed, setGoalToastDismissed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      return 'studio';
    }
    return 'studio';
  });

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setAppState(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleCompleteOnboarding = async (updatedProfile: Partial<UserOnboardingProfile>) => {
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedProfile),
    });
    if (res.ok) {
      await fetchState();
      setGoalToastDismissed(false);
      setActiveTab('studio');
    }
  };

  const handleSelectLanguageAndProficiency = async (
    targetLanguage: LanguageCode,
    proficiency: ProficiencyLevel
  ) => {
    if (!appState) return;
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...appState.user,
        targetLanguage,
        proficiency,
      }),
    });
    await fetchState();
    setGoalToastDismissed(false);
  };

  const handleSaveVocab = async (item: Partial<SavedVocabItem>) => {
    await fetch('/api/vocabulary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    await fetchState();
  };

  const handleDeleteVocab = async (id: string) => {
    await fetch(`/api/vocabulary/${id}`, { method: 'DELETE' });
    await fetchState();
  };

  const handleBoostMastery = async (vocabId: string, delta: number) => {
    await fetch('/api/vocabulary/mastery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vocabId, delta }),
    });
    await fetchState();
  };

  const handleUpgradePlan = async (planTier: PlanTier) => {
    await fetch('/api/subscription/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planTier }),
    });
    await fetchState();
  };

  const handleSwitchRole = async (role: 'learner' | 'admin') => {
    await fetch('/api/auth/switch-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    await fetchState();
    setGoalToastDismissed(false);
  };

  if (loading || !appState) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="text-lg font-bold font-display text-slate-900">SpeakMate AI</div>
          <p className="text-xs text-slate-500">Loading multi-language voice studio...</p>
        </div>
      </div>
    );
  }

  // Calculate today's speaking minutes specifically for the active target language
  const todayIsoPrefix = new Date().toISOString().slice(0, 10);
  const targetLangMinutesFromHistory = appState.conversationHistory
    .filter(
      (h) =>
        h.languageCode === appState.user.targetLanguage &&
        h.createdAt.slice(0, 10) === todayIsoPrefix
    )
    .reduce((sum, h) => sum + h.durationMinutes, 0);

  const practicedMinutesForTarget =
    targetLangMinutesFromHistory > 0
      ? targetLangMinutesFromHistory
      : appState.user.targetLanguage === 'en'
        ? appState.usedMinutesToday
        : 0;

  const dailyGoalReminder = evaluateDailyGoalReminder({
    targetLanguage: appState.user.targetLanguage,
    dailyGoalMinutes: appState.user.dailyGoalMinutes,
    practicedMinutesToday: practicedMinutesForTarget,
    userName: appState.user.name,
  });

  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'studio', label: 'Live Tutor' },
    { id: 'onboarding', label: 'Languages' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'vocabulary', label: 'Vocabulary' },
    { id: 'plans', label: 'Plans & Admin' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white border-b border-slate-200">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('studio');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0"
        >
          SpeakMate AI
        </a>

        {/* Zone 2: 5 clean single-line text navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(item.id);
                }}
                className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                  isActive
                    ? 'text-slate-900 border-sky-600 font-semibold'
                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() =>
              setActiveTab(activeTab === 'onboarding' ? 'studio' : 'onboarding')
            }
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {activeTab === 'onboarding' ? 'Open Voice Studio' : 'Configure Languages'}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Bar (Visible on narrow viewports only) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden grid grid-cols-5 gap-1 px-2 py-2 bg-white border-b border-slate-200"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`px-1.5 py-1.5 text-[11px] font-medium rounded-md text-center truncate ${
                isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {!goalToastDismissed && dailyGoalReminder.shouldShowReminder && (
          <DailyGoalToast
            reminder={dailyGoalReminder}
            streakDays={appState.streakDays}
            onStartSpeaking={() => {
              setActiveTab('studio');
              const inputEl = document.querySelector<HTMLInputElement>(
                'input[aria-label="Speak or type your response in the conversation"]'
              );
              if (inputEl) {
                inputEl.focus();
              }
            }}
            onDismiss={() => setGoalToastDismissed(true)}
          />
        )}
        {activeTab === 'onboarding' && (
          <OnboardingModal
            user={appState.user}
            languages={appState.languages}
            explanationLanguages={appState.explanationLanguages}
            learningObjectives={appState.learningObjectives}
            onComplete={handleCompleteOnboarding}
            onClose={() => setActiveTab('studio')}
          />
        )}

        {activeTab === 'studio' && (
          <LiveTutorStudio
            user={appState.user}
            languages={appState.languages}
            scenarios={appState.scenarios}
            currentPlan={appState.currentPlan}
            usedMinutesToday={appState.usedMinutesToday}
            usedSessionsToday={appState.usedSessionsToday}
            onSelectLanguageAndProficiency={handleSelectLanguageAndProficiency}
            onSaveVocab={handleSaveVocab}
            onSessionEvaluated={fetchState}
            onNavigateToPlans={() => setActiveTab('plans')}
          />
        )}

        {activeTab === 'dashboard' && (
          <LearnerDashboard
            user={appState.user}
            streakDays={appState.streakDays}
            usedMinutesToday={appState.usedMinutesToday}
            totalMinutesAllLanguages={appState.totalMinutesAllLanguages}
            totalLessonsAllLanguages={appState.totalLessonsAllLanguages}
            languages={appState.languages}
            languageProgress={appState.languageProgress}
            conversationHistory={appState.conversationHistory}
            onPracticeLanguage={async (langCode, prof) => {
              await handleSelectLanguageAndProficiency(langCode, prof);
              setActiveTab('studio');
            }}
          />
        )}

        {activeTab === 'vocabulary' && (
          <VocabularyVault
            languages={appState.languages}
            vocabularyNotebook={appState.vocabularyNotebook}
            defaultLanguage={appState.user.targetLanguage}
            onAddVocab={handleSaveVocab}
            onDeleteVocab={handleDeleteVocab}
            onBoostMastery={handleBoostMastery}
          />
        )}

        {activeTab === 'plans' && (
          <PlansAndAdminView
            user={appState.user}
            currentPlan={appState.currentPlan}
            allPlans={appState.allPlans}
            usedMinutesToday={appState.usedMinutesToday}
            usedSessionsToday={appState.usedSessionsToday}
            adminMetrics={appState.adminMetrics}
            onUpgradePlan={handleUpgradePlan}
            onSwitchRole={handleSwitchRole}
          />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          SpeakMate AI · Multi-Language Voice Learning Platform · 10 Supported Languages
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('onboarding')}
            className="hover:text-slate-900 cursor-pointer"
          >
            Language Calibration
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setActiveTab('plans')}
            className="hover:text-slate-900 cursor-pointer"
          >
            Plans & Spring Boot Architecture
          </button>
        </div>
      </footer>
    </div>
  );
}
