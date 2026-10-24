import React from 'react';
import { DailyGoalReminderStatus } from '../utils/learningEngine';
import { Flame, Mic, X } from 'lucide-react';

interface DailyGoalToastProps {
  reminder: DailyGoalReminderStatus;
  streakDays: number;
  onStartSpeaking: () => void;
  onDismiss: () => void;
}

export const DailyGoalToast: React.FC<DailyGoalToastProps> = ({
  reminder,
  streakDays,
  onStartSpeaking,
  onDismiss,
}) => {
  if (!reminder.shouldShowReminder) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="daily-goal-toast"
      className="bg-slate-900 text-white border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4"
    >
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
          <Flame className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="font-semibold text-amber-300">Daily Goal Reminder</span>
            <span aria-hidden="true">·</span>
            <span>Target Language: {reminder.targetLanguageName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{streakDays}-Day Streak Active</span>
          </div>
          <h2 className="text-sm sm:text-base font-bold font-display text-white">
            {reminder.headline}
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">{reminder.subtext}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
        <div className="min-w-[160px]">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400">Today&apos;s Goal</span>
            <span className="font-mono font-semibold tabular-nums text-white">
              {reminder.practicedMinutesToday}m / {reminder.dailyGoalMinutes}m (
              {reminder.progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-300"
              style={{ width: `${reminder.progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onStartSpeaking}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Practice {reminder.targetLanguageName} Now</span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss daily goal reminder"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
