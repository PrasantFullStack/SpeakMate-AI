import React, { useEffect, useState } from 'react';
import { PlanQuotaConfig, PlanTier } from '../config/languages';
import { UserOnboardingProfile } from '../utils/learningEngine';
import { ShieldCheck, Users, Database, Server, Check, Activity } from 'lucide-react';

interface AdminMetricsData {
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
}

interface PlansAndAdminViewProps {
  user: UserOnboardingProfile;
  currentPlan: PlanQuotaConfig;
  allPlans: PlanQuotaConfig[];
  usedMinutesToday: number;
  usedSessionsToday: number;
  adminMetrics: AdminMetricsData;
  onUpgradePlan: (tier: PlanTier) => Promise<void>;
  onSwitchRole: (role: 'learner' | 'admin') => Promise<void>;
}

export const PlansAndAdminView: React.FC<PlansAndAdminViewProps> = ({
  user,
  currentPlan,
  allPlans,
  usedMinutesToday,
  usedSessionsToday,
  adminMetrics,
  onUpgradePlan,
  onSwitchRole,
}) => {
  const [upgradingTier, setUpgradingTier] = useState<PlanTier | null>(null);
  const [springBlueprint, setSpringBlueprint] = useState<{
    overview: string;
    mysqlSchema: string;
    springSecurityConfig: string;
  } | null>(null);
  const [showBlueprint, setShowBlueprint] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/architecture/spring-boot')
      .then((r) => r.json())
      .then((data) => setSpringBlueprint(data))
      .catch(() => {});
  }, []);

  const handleSelectPlan = async (tier: PlanTier) => {
    setUpgradingTier(tier);
    try {
      await onUpgradePlan(tier);
    } finally {
      setUpgradingTier(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Server-Enforced Subscription Plans & Current Usage Quota */}
      <section className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-display">
              Subscription Plans & Server-Enforced Usage Quotas
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Plans enforce daily speaking minutes, session caps, and role-play scenario tiers on the backend.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <div>
              <span className="text-slate-500">Current Tier: </span>
              <span className="font-bold text-slate-900">{currentPlan.name}</span>
            </div>
            <div>
              <span className="text-slate-500">Minutes Used Today: </span>
              <span className="font-mono font-bold tabular-nums text-slate-900">
                {usedMinutesToday}m / {currentPlan.dailySpeakingMinutesLimit}m
              </span>
            </div>
            <div>
              <span className="text-slate-500">Sessions Today: </span>
              <span className="font-mono font-bold tabular-nums text-slate-900">
                {usedSessionsToday} / {currentPlan.dailySessionsLimit}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {allPlans.map((plan) => {
            const isCurrent = plan.id === currentPlan.id;
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-xl border p-6 flex flex-col justify-between ${
                  isCurrent ? 'border-blue-600 ring-1 ring-blue-600' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[#0A1128] font-display">{plan.name}</h2>
                    {isCurrent && (
                      <span className="text-xs font-semibold text-blue-700">Active Plan</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{plan.audienceLabel}</p>

                  <div className="mt-4 pb-4 border-b border-slate-200 flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                      ${plan.priceMonthlyUsd}
                    </span>
                    <span className="text-xs text-slate-500">/ month</span>
                  </div>

                  <dl className="mt-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-600">Daily Speaking Quota</dt>
                      <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                        {plan.dailySpeakingMinutesLimit} mins/day
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-600">Daily Voice Sessions</dt>
                      <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                        {plan.dailySessionsLimit} sessions/day
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-600">Unlocked Scenarios</dt>
                      <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                        {plan.allowedScenarios.length} of 6 scenarios
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-600">Saved Phrases Limit</dt>
                      <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                        {plan.maxSavedPhrases} phrases
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-600">Hindi-to-English Corrections</dt>
                      <dd className="font-semibold text-emerald-700 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Included</span>
                      </dd>
                    </div>
                  </dl>
                </div>

                <button
                  type="button"
                  disabled={isCurrent || upgradingTier === plan.id}
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`mt-6 w-full py-2.5 px-4 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-500 cursor-default'
                      : 'bg-[#0A1128] hover:bg-blue-700 text-white'
                  }`}
                >
                  {isCurrent
                    ? 'Current Active Plan'
                    : upgradingTier === plan.id
                      ? 'Updating Quota...'
                      : `Switch to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2: Authentication Profile & Admin Analytics Dashboard */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Interviews Cracker Authenticated Session · {user.email}</span>
            </div>
            <h2 className="text-lg font-bold text-[#0A1128] font-display mt-1">
              Interviews Cracker AI Administration &amp; Usage Telemetry
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Active Role:</span>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => onSwitchRole('learner')}
                className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                  user.role === 'learner' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Learner View
              </button>
              <button
                type="button"
                onClick={() => onSwitchRole('admin')}
                className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                  user.role === 'admin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Admin Console
              </button>
            </div>
          </div>
        </div>

        {/* Admin Platform Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Registered Learners</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {adminMetrics.totalRegisteredUsers.toLocaleString()}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Daily Active Speakers</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {adminMetrics.activeDailySpeakers.toLocaleString()}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Live Voice Sessions Today</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {adminMetrics.liveVoiceSessionsToday.toLocaleString()}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Monthly Recurring Rev</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              ${adminMetrics.monthlyRecurringRevenueUsd.toLocaleString()}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Server Quota Enforcements</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1">
              {adminMetrics.quotaBlocksToday}
            </div>
          </div>
        </div>

        {/* Language Share & User Quota Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-900">
              Active Learner Distribution by Target Language
            </h3>
            <div className="space-y-2.5">
              {adminMetrics.topLanguages.map((tl) => (
                <div key={tl.code} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">{tl.name}</span>
                    <span className="font-mono tabular-nums text-slate-600">
                      {tl.activeLearners} learners · {tl.sharePercent}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-600 rounded-full"
                      style={{ width: `${tl.sharePercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <h3 className="text-xs font-semibold text-slate-900">
              Recent Tenant Accounts & Server Quota Status
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3">Learner</th>
                    <th className="py-2.5 px-3">Native → Target</th>
                    <th className="py-2.5 px-3">Plan</th>
                    <th className="py-2.5 px-3 text-right">Mins Today</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {adminMetrics.recentUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500">{u.email}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {u.nativeLang} → <span className="font-medium">{u.targetLang}</span>
                      </td>
                      <td className="py-2.5 px-3 uppercase font-mono text-slate-800">{u.plan}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {u.minutesUsed}m
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {u.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Java Spring Boot + Spring Security + MySQL Architecture Blueprint */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-[#0A1128]">
                  Java Spring Boot, Spring Security &amp; MySQL Enterprise Integration Blueprint
                </h3>
                <p className="text-xs text-slate-500">
                  Production DDL schema and Spring Security 6 filter chain for synchronizing Interviews Cracker AI quotas and sessions with a Java backend.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBlueprint(!showBlueprint)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              {showBlueprint ? 'Hide SQL & Java Blueprint' : 'Inspect SQL & Spring Security Code'}
            </button>
          </div>

          {showBlueprint && springBlueprint && (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-800 mb-1.5">
                  MySQL 8.4 Schema (schema.sql)
                </div>
                <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-72">
                  {springBlueprint.mysqlSchema}
                </pre>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-800 mb-1.5">
                  Spring Security 6 & Quota Filter (SecurityConfig.java)
                </div>
                <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-72">
                  {springBlueprint.springSecurityConfig}
                </pre>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
