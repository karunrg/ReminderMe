/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Inbox,
  Volume2,
  Radio,
  Bell,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { Task, AgentSettings, UrgencyLevel, ReminderLog, AgentPersona } from './types';
import { Header } from './components/Header';
import { QuickAddBar } from './components/QuickAddBar';
import { ActiveNagBanner } from './components/ActiveNagBanner';
import { TaskCard } from './components/TaskCard';
import { TaskModal } from './components/TaskModal';
import { StatsBar } from './components/StatsBar';
import {
  playAlertSound,
  playSuccessSound,
  playSnoozeSound,
  speakAgentMessage,
  stopAllSpeech,
} from './services/soundService';
import { sendBrowserNotification } from './services/notificationService';
import {
  parseCadenceMs,
  calculateEscalatedCadenceMs,
  determineUrgencyLevel,
  getQuickNagMessage,
} from './services/nagEngine';

const LOCAL_STORAGE_KEY = 'tasksentinel_tasks_v1';
const SETTINGS_STORAGE_KEY = 'tasksentinel_settings_v1';

const DEFAULT_SETTINGS: AgentSettings = {
  persona: 'assertive_assistant',
  soundEnabled: true,
  voiceEnabled: true,
  notificationsEnabled: true,
  autoSpeak: true,
  voiceName: 'Kore',
};

const INITIAL_DEMO_TASKS: Task[] = [
  {
    id: 'demo-1',
    title: 'Review and reply to client urgent proposal',
    description: 'Check budget breakdown and confirm deliverable milestones.',
    category: 'Work',
    priority: 'urgent',
    dueDateTime: Date.now() + 1.5 * 60 * 1000, // Due in 90 seconds!
    nagCadence: '2m',
    soundAlert: true,
    voiceAlert: true,
    browserNotification: true,
    completed: false,
    createdAt: Date.now() - 10 * 60 * 1000,
    reminderCount: 0,
    snoozeCount: 0,
    logs: [],
  },
  {
    id: 'demo-2',
    title: 'Drink 500ml water and stretch',
    description: 'Stay hydrated during work sprints.',
    category: 'Health',
    priority: 'medium',
    dueDateTime: Date.now() + 15 * 60 * 1000,
    nagCadence: '5m',
    soundAlert: true,
    voiceAlert: true,
    browserNotification: true,
    completed: false,
    createdAt: Date.now(),
    reminderCount: 0,
    snoozeCount: 0,
    logs: [],
  },
  {
    id: 'demo-3',
    title: 'Submit monthly utility invoice receipt',
    category: 'Finance',
    priority: 'high',
    dueDateTime: Date.now() - 5 * 60 * 1000, // Already overdue!
    nagCadence: '1m',
    soundAlert: true,
    voiceAlert: true,
    browserNotification: true,
    completed: false,
    createdAt: Date.now() - 30 * 60 * 1000,
    reminderCount: 2,
    snoozeCount: 0,
    logs: [
      {
        id: 'log-1',
        timestamp: Date.now() - 4 * 60 * 1000,
        message: 'Invoice is due. Please upload the receipt now.',
        level: 'gentle',
      },
      {
        id: 'log-2',
        timestamp: Date.now() - 2 * 60 * 1000,
        message: 'Second notice for utility receipt. Do not let late fees apply.',
        level: 'firm',
      },
    ],
  },
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error loading localStorage:', e);
    }
    return INITIAL_DEMO_TASKS;
  });

  const [settings, setSettings] = useState<AgentSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Error loading settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  const [filter, setFilter] = useState<'all' | 'nagging' | 'upcoming' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Active Nagging tasks state (tasks currently alarming)
  const [naggingQueue, setNaggingQueue] = useState<
    { task: Task; nagMessage: string; urgency: UrgencyLevel }[]
  >([]);

  // Sound & speech throttling refs
  const lastSoundPlayedRef = useRef<number>(0);
  const isSpeakingRef = useRef<boolean>(false);
  const tasksRef = useRef<Task[]>(tasks);
  tasksRef.current = tasks;
  const settingsRef = useRef<AgentSettings>(settings);
  settingsRef.current = settings;

  // Persist tasks to localStorage and backend
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
      // Sync to backend file store asynchronously
      fetch('/api/tasks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      }).catch(() => {});
    } catch (e) {
      console.error('Failed to save tasks:', e);
    }
  }, [tasks]);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {}
  }, [settings]);

  // Trigger celebration on complete
  const celebrateDone = (taskTitle: string) => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899'],
      });
    } catch (e) {}
  };

  /**
   * The Relentless Reminder Sentinel Engine
   * Ticks every second to monitor task deadlines and intervals
   */
  useEffect(() => {
    const interval = setInterval(async () => {
      const currentTasks = tasksRef.current;
      const currentSettings = settingsRef.current;
      const now = Date.now();

      const newNaggingList: { task: Task; nagMessage: string; urgency: UrgencyLevel }[] = [];
      let updatedAnyTask = false;
      const updatedTasks = [...currentTasks];

      for (let i = 0; i < updatedTasks.length; i++) {
        const task = updatedTasks[i];
        if (task.completed) continue;

        const isOverdue = now >= task.dueDateTime;
        const isSnoozed = !!task.snoozedUntil && task.snoozedUntil > now;

        if (isOverdue && !isSnoozed) {
          // Check cadence
          let cadenceMs = parseCadenceMs(task.nagCadence);
          if (task.nagCadence === 'escalating') {
            cadenceMs = calculateEscalatedCadenceMs(task.reminderCount);
          }

          const timeSinceLastNag = task.lastRemindedAt ? now - task.lastRemindedAt : Infinity;

          if (timeSinceLastNag >= cadenceMs) {
            // It's time to nag!
            updatedAnyTask = true;
            const overdueMin = Math.max(0, (now - task.dueDateTime) / 60000);
            const urgency = determineUrgencyLevel(overdueMin, task.reminderCount + 1);
            const message = getQuickNagMessage(
              task.title,
              currentSettings.persona,
              urgency,
              overdueMin,
              task.reminderCount + 1
            );

            // Create log entry
            const newLog: ReminderLog = {
              id: `log-${Date.now()}-${Math.random()}`,
              timestamp: now,
              message,
              level: urgency,
            };

            const updatedTask: Task = {
              ...task,
              reminderCount: task.reminderCount + 1,
              lastRemindedAt: now,
              logs: [newLog, ...(task.logs || [])].slice(0, 30),
            };

            updatedTasks[i] = updatedTask;

            newNaggingList.push({
              task: updatedTask,
              nagMessage: message,
              urgency,
            });

            // Audio Alert
            if (
              task.soundAlert &&
              currentSettings.soundEnabled &&
              now - lastSoundPlayedRef.current > 4000
            ) {
              lastSoundPlayedRef.current = now;
              playAlertSound(urgency);
            }

            // Voice Nag
            if (
              task.voiceAlert &&
              currentSettings.voiceEnabled &&
              !isSpeakingRef.current
            ) {
              isSpeakingRef.current = true;
              speakAgentMessage(message, currentSettings.voiceName).finally(() => {
                isSpeakingRef.current = false;
              });
            }

            // Browser Notification
            if (task.browserNotification && currentSettings.notificationsEnabled) {
              sendBrowserNotification(
                `⚠️ Task Overdue: ${task.title}`,
                message,
                `task-${task.id}`
              );
            }
          } else {
            // Still in nagging state, keep in banner if recently reminded within this cadence cycle
            const overdueMin = Math.max(0, (now - task.dueDateTime) / 60000);
            const urgency = determineUrgencyLevel(overdueMin, task.reminderCount);
            const lastLogMsg = task.logs[0]?.message || `Task "${task.title}" is overdue!`;
            newNaggingList.push({
              task,
              nagMessage: lastLogMsg,
              urgency,
            });
          }
        }
      }

      if (updatedAnyTask) {
        setTasks(updatedTasks);
      }

      setNaggingQueue(newNaggingList);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Action: Mark task Done
  const handleToggleComplete = useCallback(
    (id: string) => {
      stopAllSpeech();
      const current = tasks.find((t) => t.id === id);
      if (!current) return;

      const isMarkingDone = !current.completed;

      if (isMarkingDone) {
        playSuccessSound();
        celebrateDone(current.title);

        if (settings.voiceEnabled) {
          const praises = [
            `Outstanding! "${current.title}" marked done. Sentinel stands down.`,
            `Task completed! Great execution on "${current.title}".`,
            `Relieving alarm for "${current.title}". Well done!`,
          ];
          const chosen = praises[Math.floor(Math.random() * praises.length)];
          speakAgentMessage(chosen, settings.voiceName);
        }
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                completed: isMarkingDone,
                completedAt: isMarkingDone ? Date.now() : undefined,
                snoozedUntil: undefined,
              }
            : t
        )
      );

      // Remove from nagging queue
      setNaggingQueue((prev) => prev.filter((item) => item.task.id !== id));
    },
    [tasks, settings]
  );

  // Action: Snooze
  const handleSnooze = useCallback(
    (id: string, minutes: number) => {
      stopAllSpeech();
      playSnoozeSound();
      const snoozeUntil = Date.now() + minutes * 60 * 1000;

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            const snoozeLog: ReminderLog = {
              id: `log-snooze-${Date.now()}`,
              timestamp: Date.now(),
              message: `Snoozed for ${minutes} minutes.`,
              level: 'gentle',
              snoozedUntil: snoozeUntil,
            };
            return {
              ...t,
              snoozedUntil: snoozeUntil,
              snoozeCount: t.snoozeCount + 1,
              logs: [snoozeLog, ...t.logs],
            };
          }
          return t;
        })
      );

      setNaggingQueue((prev) => prev.filter((item) => item.task.id !== id));
    },
    []
  );

  // Action: Dismiss ringing sound for current cycle
  const handleDismissAlarm = useCallback((taskId: string) => {
    stopAllSpeech();
    // Temporarily sets lastRemindedAt to now so it doesn't immediately re-chime
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, lastRemindedAt: Date.now() } : t))
    );
  }, []);

  // Action: Add new task
  const handleAddTask = (taskData: Partial<Task>) => {
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      category: taskData.category || 'Work',
      priority: taskData.priority || 'high',
      dueDateTime: taskData.dueDateTime || Date.now() + 15 * 60 * 1000,
      nagCadence: taskData.nagCadence || '5m',
      soundAlert: taskData.soundAlert ?? true,
      voiceAlert: taskData.voiceAlert ?? true,
      browserNotification: taskData.browserNotification ?? true,
      completed: false,
      createdAt: Date.now(),
      reminderCount: 0,
      snoozeCount: 0,
      logs: [],
    };

    setTasks((prev) => [newTask, ...prev]);

    if (settings.voiceEnabled) {
      speakAgentMessage(
        `Scheduled "${newTask.title}". I will remind you until it is marked done.`,
        settings.voiceName
      );
    }
  };

  // Action: Save edited task
  const handleSaveModal = (updated: Partial<Task>) => {
    if (editingTask) {
      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? ({ ...t, ...updated } as Task) : t))
      );
      setEditingTask(null);
    } else {
      handleAddTask(updated);
    }
  };

  // Action: Delete task
  const handleDeleteTask = (id: string) => {
    stopAllSpeech();
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setNaggingQueue((prev) => prev.filter((item) => item.task.id !== id));
  };

  // Action: Trigger nag immediately for manual test
  const handleTriggerNagNow = async (task: Task) => {
    const now = Date.now();
    const overdueMin = Math.max(0, (now - task.dueDateTime) / 60000);
    const urgency = determineUrgencyLevel(overdueMin, task.reminderCount + 1);

    const message = getQuickNagMessage(
      task.title,
      settings.persona,
      urgency,
      overdueMin,
      task.reminderCount + 1
    );

    playAlertSound(urgency);
    if (task.voiceAlert && settings.voiceEnabled) {
      speakAgentMessage(message, settings.voiceName);
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              reminderCount: t.reminderCount + 1,
              lastRemindedAt: now,
              snoozedUntil: undefined,
              logs: [
                {
                  id: `log-${now}`,
                  timestamp: now,
                  message,
                  level: urgency,
                },
                ...t.logs,
              ],
            }
          : t
      )
    );
  };

  // Action: Generate AI Micro-Steps
  const handleFetchMicroSteps = async (task: Task) => {
    // Optimistic UI state
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, isGeneratingSteps: true } : t))
    );

    try {
      const res = await fetch('/api/agent/micro-steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: task.title,
          taskDescription: task.description,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate steps');
      const data = await res.json();

      if (data.result?.steps) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  microSteps: data.result.steps,
                  isGeneratingSteps: false,
                }
              : t
          )
        );
      }
    } catch (e) {
      // Fallback 3 practical steps
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                microSteps: [
                  'Step 1: Open workspace and clear any distraction tabs.',
                  `Step 2: Spend just 60 seconds on the very first sub-part of "${t.title}".`,
                  'Step 3: Keep going or finish up and check it done right here!',
                ],
                isGeneratingSteps: false,
              }
            : t
        )
      );
    }
  };

  // Toggle individual task audio alert
  const handleToggleAudio = (task: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, soundAlert: !t.soundAlert } : t))
    );
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      task.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;

    if (!matchesSearch || !matchesCategory) return false;

    const now = Date.now();
    const isOverdue = !task.completed && task.dueDateTime <= now;

    if (filter === 'nagging') return isOverdue;
    if (filter === 'upcoming') return !task.completed && !isOverdue;
    if (filter === 'completed') return task.completed;
    return true; // 'all'
  });

  // Extract distinct categories
  const allCategories = ['all', ...Array.from(new Set(tasks.map((t) => t.category)))];

  const now = Date.now();
  const totalNaggingNow = tasks.filter(
    (t) => !t.completed && t.dueDateTime <= now && (!t.snoozedUntil || t.snoozedUntil <= now)
  ).length;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Top Header */}
      <Header
        settings={settings}
        onUpdateSettings={(partial) => setSettings((prev) => ({ ...prev, ...partial }))}
        activeNagCount={totalNaggingNow}
        totalActiveTasks={tasks.filter((t) => !t.completed).length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Active Nag Alert Banner (Floats when tasks are overdue & nagging right now) */}
        <ActiveNagBanner
          naggingTasks={naggingQueue}
          onMarkDone={handleToggleComplete}
          onSnooze={handleSnooze}
          onDismissAlarm={handleDismissAlarm}
          onAskMicroSteps={handleFetchMicroSteps}
        />

        {/* Quick Add Bar with Natural Language AI */}
        <QuickAddBar
          onAddTask={handleAddTask}
          onOpenDetailedModal={() => {
            setEditingTask(null);
            setIsModalOpen(true);
          }}
        />

        {/* Overview Stats */}
        <StatsBar tasks={tasks} />

        {/* Task List Controls: Filter Tabs, Search & Category Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Filter Tabs (Interactive segmented buttons allowed by design constitution) */}
          <div className="flex items-center gap-1 p-1 bg-stone-900 border border-stone-800 rounded-xl overflow-x-auto text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 font-medium rounded-lg transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              All Tasks ({tasks.length})
            </button>
            <button
              onClick={() => setFilter('nagging')}
              className={`px-3 py-1.5 font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                filter === 'nagging'
                  ? 'bg-red-500 text-white font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span>Nagging Now</span>
              {totalNaggingNow > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping inline-block" />
              )}
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-3 py-1.5 font-medium rounded-lg transition-colors whitespace-nowrap ${
                filter === 'upcoming'
                  ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Upcoming ({tasks.filter((t) => !t.completed && t.dueDateTime > now).length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 font-medium rounded-lg transition-colors whitespace-nowrap ${
                filter === 'completed'
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Done ({tasks.filter((t) => t.completed).length})
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-amber-500/80"
              />
            </div>

            {allCategories.length > 2 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-amber-500/80 cursor-pointer"
              >
                {allCategories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All Categories' : c}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Task Cards List */}
        {filteredTasks.length === 0 ? (
          <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-stone-800/80 flex items-center justify-center mx-auto text-stone-400">
              <Inbox className="w-6 h-6" />
            </div>
            <h4 className="text-base font-semibold text-stone-200">
              No tasks found in this view
            </h4>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              {filter === 'nagging'
                ? 'No overdue tasks currently nagging! You are all caught up.'
                : 'Add a new task using the smart input above to have your agent guard it.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onSnooze={handleSnooze}
                onDelete={handleDeleteTask}
                onEdit={(t) => {
                  setEditingTask(t);
                  setIsModalOpen(true);
                }}
                onTriggerNagNow={handleTriggerNagNow}
                onFetchMicroSteps={handleFetchMicroSteps}
                onToggleAudio={handleToggleAudio}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800/80 bg-stone-950 py-4 px-4 text-center text-xs text-stone-400">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TaskSentinel AI Reminder Agent · Guards deadlines until marked done</span>
          <div className="flex items-center gap-4 text-stone-400">
            <span>Real-time Audio Alerting</span>
            <span aria-hidden="true">·</span>
            <span>Gemini TTS &amp; Web Speech</span>
            <span aria-hidden="true">·</span>
            <span>Persistent Cadence Nudging</span>
          </div>
        </div>
      </footer>

      {/* Task Modal for Detailed Add / Edit */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveModal}
        initialTask={editingTask}
      />
    </div>
  );
}
