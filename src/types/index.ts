export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export type NagCadence = '1m' | '2m' | '5m' | '10m' | '15m' | '30m' | '1h' | 'escalating';

export type AgentPersona =
  | 'drill_sergeant'
  | 'assertive_assistant'
  | 'supportive_coach'
  | 'witty_roaster'
  | 'zen_monk';

export type UrgencyLevel = 'gentle' | 'firm' | 'urgent' | 'relentless';

export interface ReminderLog {
  id: string;
  timestamp: number;
  message: string;
  level: UrgencyLevel;
  snoozedUntil?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: TaskPriority;
  dueDateTime: number; // ms timestamp
  nagCadence: NagCadence;
  soundAlert: boolean;
  voiceAlert: boolean;
  browserNotification: boolean;
  completed: boolean;
  completedAt?: number;
  createdAt: number;
  lastRemindedAt?: number;
  reminderCount: number;
  snoozedUntil?: number;
  snoozeCount: number;
  logs: ReminderLog[];
  microSteps?: string[];
  isGeneratingSteps?: boolean;
}

export interface AgentSettings {
  persona: AgentPersona;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  notificationsEnabled: boolean;
  autoSpeak: boolean;
  voiceName: string;
}
