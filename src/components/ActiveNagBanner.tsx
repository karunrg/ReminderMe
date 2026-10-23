import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, VolumeX, Sparkles, Flame } from 'lucide-react';
import { Task, UrgencyLevel } from '../types';

interface ActiveNagBannerProps {
  naggingTasks: {
    task: Task;
    nagMessage: string;
    urgency: UrgencyLevel;
  }[];
  onMarkDone: (taskId: string) => void;
  onSnooze: (taskId: string, minutes: number) => void;
  onDismissAlarm: (taskId: string) => void;
  onAskMicroSteps: (task: Task) => void;
}

export const ActiveNagBanner: React.FC<ActiveNagBannerProps> = ({
  naggingTasks,
  onMarkDone,
  onSnooze,
  onDismissAlarm,
  onAskMicroSteps,
}) => {
  if (naggingTasks.length === 0) return null;

  const current = naggingTasks[0]; // Lead active nag
  const remainingCount = naggingTasks.length - 1;

  const urgencyStyles: Record<
    UrgencyLevel,
    { border: string; bg: string; text: string; badge: string; iconBg: string }
  > = {
    gentle: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-950/40',
      text: 'text-amber-200',
      badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      iconBg: 'bg-amber-500/20 text-amber-300',
    },
    firm: {
      border: 'border-orange-500/40',
      bg: 'bg-orange-950/40',
      text: 'text-orange-200',
      badge: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      iconBg: 'bg-orange-500/20 text-orange-300',
    },
    urgent: {
      border: 'border-red-500/50',
      bg: 'bg-red-950/40',
      text: 'text-red-200',
      badge: 'text-red-400 bg-red-500/10 border-red-500/20',
      iconBg: 'bg-red-500/20 text-red-300',
    },
    relentless: {
      border: 'border-rose-600',
      bg: 'bg-rose-950/60',
      text: 'text-rose-100',
      badge: 'text-rose-300 bg-rose-500/20 border-rose-500/40 font-bold',
      iconBg: 'bg-rose-600/30 text-rose-200 animate-pulse',
    },
  };

  const style = urgencyStyles[current.urgency];
  const overdueMin = Math.max(
    1,
    Math.round((Date.now() - current.task.dueDateTime) / 60000)
  );

  return (
    <aside
      aria-label="Active Task Reminder"
      className={`border ${style.border} ${style.bg} backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-3`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left info & AI message */}
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl ${style.iconBg} flex-shrink-0 mt-0.5`}>
            {current.urgency === 'relentless' ? (
              <Flame className="w-6 h-6 animate-bounce" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className={`px-2 py-0.5 rounded border ${style.badge} uppercase tracking-wider font-semibold text-[10px]`}>
                {current.urgency} REMINDER
              </span>
              <span className="text-stone-400">
                Overdue by {overdueMin}m
              </span>
              <span aria-hidden="true" className="text-stone-600">·</span>
              <span className="text-stone-400">
                Nudge #{current.task.reminderCount}
              </span>
              {remainingCount > 0 && (
                <span className="text-amber-400 font-medium">
                  (+{remainingCount} more overdue)
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold text-white mt-1">
              {current.task.title}
            </h2>

            <p className={`text-sm mt-1 font-medium ${style.text}`}>
              &ldquo;{current.nagMessage}&rdquo;
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2 lg:flex-nowrap justify-end">
          {/* Micro-steps AI helper */}
          <button
            onClick={() => onAskMicroSteps(current.task)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-stone-200 transition-colors"
            title="Get 3 ultra-small micro-steps from AI to beat procrastination"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Unstick Me</span>
          </button>

          {/* Quick Snooze options */}
          <div className="flex items-center bg-stone-900/90 border border-stone-700 rounded-xl p-1 text-xs">
            <span className="text-stone-400 px-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Snooze:</span>
            </span>
            <button
              onClick={() => onSnooze(current.task.id, 2)}
              className="px-2 py-1 hover:bg-stone-800 text-stone-200 rounded font-medium transition-colors"
            >
              2m
            </button>
            <button
              onClick={() => onSnooze(current.task.id, 5)}
              className="px-2 py-1 hover:bg-stone-800 text-stone-200 rounded font-medium transition-colors"
            >
              5m
            </button>
            <button
              onClick={() => onSnooze(current.task.id, 15)}
              className="px-2 py-1 hover:bg-stone-800 text-stone-200 rounded font-medium transition-colors"
            >
              15m
            </button>
          </div>

          {/* Mute button */}
          <button
            onClick={() => onDismissAlarm(current.task.id)}
            className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-stone-400 hover:text-stone-200 transition-colors"
            title="Mute alarm sound for this cycle (will re-nag on next cadence)"
          >
            <VolumeX className="w-4 h-4" />
          </button>

          {/* Mark as Done: Primary Action */}
          <button
            onClick={() => onMarkDone(current.task.id)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 transition-all active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark Done & Silence</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
