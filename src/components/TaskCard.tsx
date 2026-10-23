import React, { useState } from 'react';
import {
  Check,
  Clock,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Play,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  History,
  Trash2,
  Edit2,
  Loader2,
  ListOrdered,
  AlertCircle,
} from 'lucide-react';
import { Task, UrgencyLevel } from '../types';
import { determineUrgencyLevel } from '../services/nagEngine';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onTriggerNagNow: (task: Task) => void;
  onFetchMicroSteps: (task: Task) => void;
  onToggleAudio: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onSnooze,
  onDelete,
  onEdit,
  onTriggerNagNow,
  onFetchMicroSteps,
  onToggleAudio,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

  const now = Date.now();
  const isOverdue = !task.completed && task.dueDateTime <= now;
  const isSnoozed = !task.completed && !!task.snoozedUntil && task.snoozedUntil > now;
  const overdueMinutes = Math.max(0, (now - task.dueDateTime) / 60000);
  const urgency: UrgencyLevel = determineUrgencyLevel(overdueMinutes, task.reminderCount);

  // Formatting due text & countdown
  const formatTimeRemaining = () => {
    if (task.completed) {
      return task.completedAt
        ? `Completed ${new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'Completed';
    }

    if (isSnoozed && task.snoozedUntil) {
      const remainingMs = task.snoozedUntil - now;
      const min = Math.ceil(remainingMs / 60000);
      return `Snoozed for ${min}m`;
    }

    if (isOverdue) {
      const min = Math.floor(overdueMinutes);
      const hours = Math.floor(min / 60);
      if (hours > 0) {
        return `Overdue by ${hours}h ${min % 60}m`;
      }
      return `Overdue by ${min}m`;
    }

    const diffMs = task.dueDateTime - now;
    const diffMin = Math.ceil(diffMs / 60000);
    if (diffMin < 60) {
      return `Due in ${diffMin}m`;
    }
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) {
      return `Due in ${diffHours}h ${diffMin % 60}m`;
    }
    const days = Math.floor(diffHours / 24);
    return `Due in ${days}d`;
  };

  const priorityColors: Record<Task['priority'], string> = {
    urgent: 'text-rose-400 font-bold',
    high: 'text-orange-400 font-semibold',
    medium: 'text-amber-400 font-medium',
    low: 'text-stone-400',
  };

  return (
    <div
      className={`relative bg-stone-900 border rounded-2xl p-4 sm:p-5 transition-all duration-200 ${
        isOverdue && !isSnoozed
          ? 'border-red-500/50 shadow-md shadow-red-950/20'
          : isSnoozed
          ? 'border-stone-800 bg-stone-900/60'
          : 'border-stone-800 hover:border-stone-700'
      } ${task.completed ? 'opacity-65' : ''}`}
    >
      <div className="flex items-start gap-3.5">
        {/* Completion Checkbox */}
        <button
          onClick={() => onToggleComplete(task.id)}
          className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
            task.completed
              ? 'bg-emerald-500 border-emerald-500 text-stone-950'
              : isOverdue && !isSnoozed
              ? 'border-red-500 hover:border-red-400 hover:bg-red-500/10'
              : 'border-stone-600 hover:border-amber-400 hover:bg-stone-800'
          }`}
          title={task.completed ? 'Mark uncompleted' : 'Mark done & silence reminders'}
        >
          {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
        </button>

        {/* Content Details */}
        <div className="flex-1 min-w-0">
          {/* Unboxed Metadata row (zero pills) */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-stone-400 mb-1">
            <span className={priorityColors[task.priority]}>
              {task.priority.toUpperCase()}
            </span>
            <span aria-hidden="true" className="text-stone-600">·</span>
            <span>{task.category}</span>
            <span aria-hidden="true" className="text-stone-600">·</span>
            <span
              className={`flex items-center gap-1 font-medium ${
                isOverdue && !isSnoozed
                  ? 'text-red-400 animate-pulse'
                  : isSnoozed
                  ? 'text-amber-400/80'
                  : 'text-stone-300'
              }`}
            >
              <Clock className="w-3 h-3" />
              {formatTimeRemaining()}
            </span>
            <span aria-hidden="true" className="text-stone-600">·</span>
            <span>Nags every {task.nagCadence}</span>
            {task.reminderCount > 0 && (
              <>
                <span aria-hidden="true" className="text-stone-600">·</span>
                <span className="text-stone-400">
                  {task.reminderCount} nudge{task.reminderCount > 1 ? 's' : ''} sent
                </span>
              </>
            )}
          </div>

          {/* Title & Notes */}
          <h4
            className={`text-base font-semibold tracking-tight text-stone-100 ${
              task.completed ? 'line-through text-stone-500' : ''
            }`}
          >
            {task.title}
          </h4>

          {task.description && (
            <p className="text-xs text-stone-400 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Micro-Steps (AI Breakdown to beat procrastination) */}
          {task.microSteps && task.microSteps.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-stone-950 border border-stone-800/80">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Quick Micro-Steps (Under 2 Mins):</span>
              </div>
              <ul className="space-y-1.5 text-xs text-stone-300">
                {task.microSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-500 font-mono font-medium">{idx + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Row */}
          <div className="mt-3 pt-2.5 border-t border-stone-800/60 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Snooze button & menu */}
              {!task.completed && (
                <div className="relative">
                  <button
                    onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 transition-colors"
                  >
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>Snooze</span>
                    <ChevronDown className="w-3 h-3 text-stone-500" />
                  </button>

                  {showSnoozeMenu && (
                    <div className="absolute left-0 bottom-full mb-1 w-32 bg-stone-900 border border-stone-700 rounded-xl shadow-xl py-1 z-30">
                      {[
                        { label: '2 Minutes', min: 2 },
                        { label: '5 Minutes', min: 5 },
                        { label: '15 Minutes', min: 15 },
                        { label: '30 Minutes', min: 30 },
                        { label: '1 Hour', min: 60 },
                      ].map((item) => (
                        <button
                          key={item.min}
                          onClick={() => {
                            onSnooze(task.id, item.min);
                            setShowSnoozeMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-stone-200 hover:bg-stone-800 transition-colors"
                        >
                          +{item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AI Micro-Steps trigger */}
              {!task.completed && (
                <button
                  onClick={() => onFetchMicroSteps(task)}
                  disabled={task.isGeneratingSteps}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 transition-colors disabled:opacity-50"
                  title="Generate 3 micro-steps to get started right now"
                >
                  {task.isGeneratingSteps ? (
                    <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  )}
                  <span>{task.microSteps?.length ? 'Regen Steps' : 'Unstick Me'}</span>
                </button>
              )}

              {/* Force Nag / Test Reminder */}
              {!task.completed && (
                <button
                  onClick={() => onTriggerNagNow(task)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-400 hover:text-amber-400 transition-colors"
                  title="Test or trigger the reminder agent immediately"
                >
                  <Play className="w-3 h-3" />
                  <span>Nudge Now</span>
                </button>
              )}

              {/* Sound alert toggle per task */}
              <button
                onClick={() => onToggleAudio(task)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  task.soundAlert
                    ? 'border-stone-800 text-amber-400 bg-stone-950 hover:bg-stone-800'
                    : 'border-stone-800 text-stone-600 bg-stone-950 hover:text-stone-400'
                }`}
                title={task.soundAlert ? 'Sound alert enabled' : 'Sound alert disabled'}
              >
                {task.soundAlert ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Right side: History & Edit / Delete */}
            <div className="flex items-center gap-1">
              {task.logs.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-200 px-2 py-1 rounded hover:bg-stone-800 transition-colors"
                  title="View reminder log history"
                >
                  <History className="w-3 h-3" />
                  <span>{task.logs.length}</span>
                  {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}

              <button
                onClick={() => onEdit(task)}
                className="p-1.5 text-stone-500 hover:text-stone-300 rounded hover:bg-stone-800 transition-colors"
                title="Edit task"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onDelete(task.id)}
                className="p-1.5 text-stone-500 hover:text-rose-400 rounded hover:bg-stone-800 transition-colors"
                title="Delete task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* History Accordion */}
          {showHistory && task.logs.length > 0 && (
            <div className="mt-3 pt-3 border-t border-stone-800 space-y-2">
              <span className="text-[11px] font-semibold text-stone-400 block">
                Reminder Audit Trail:
              </span>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {task.logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between gap-2 text-xs bg-stone-950/70 p-2 rounded-lg border border-stone-800/60"
                  >
                    <div>
                      <span className="text-[10px] text-amber-500/80 uppercase font-mono block">
                        [{log.level}] · {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <p className="text-stone-300 mt-0.5">{log.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
