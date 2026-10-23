import React, { useState } from 'react';
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  ShieldAlert,
  Sparkles,
  PlayCircle,
  HelpCircle,
  Radio,
} from 'lucide-react';
import { AgentPersona, AgentSettings } from '../types';
import { playAlertSound, speakAgentMessage } from '../services/soundService';
import {
  getNotificationPermission,
  requestNotificationPermission,
} from '../services/notificationService';

interface HeaderProps {
  settings: AgentSettings;
  onUpdateSettings: (settings: Partial<AgentSettings>) => void;
  activeNagCount: number;
  totalActiveTasks: number;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings,
  activeNagCount,
  totalActiveTasks,
}) => {
  const [testingAudio, setTestingAudio] = useState(false);
  const [showPersonaInfo, setShowPersonaInfo] = useState(false);
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission());

  const handleTestChime = async () => {
    setTestingAudio(true);
    playAlertSound('firm');
    if (settings.voiceEnabled) {
      await speakAgentMessage(
        'Testing reminder sentinel. I will relentlessly remind you until your tasks are marked done.',
        settings.voiceName
      );
    }
    setTimeout(() => setTestingAudio(false), 1200);
  };

  const handleToggleNotifications = async () => {
    if (notifPermission !== 'granted') {
      const granted = await requestNotificationPermission();
      setNotifPermission(granted ? 'granted' : 'denied');
      onUpdateSettings({ notificationsEnabled: granted });
    } else {
      onUpdateSettings({ notificationsEnabled: !settings.notificationsEnabled });
    }
  };

  const personaOptions: { id: AgentPersona; name: string; tag: string }[] = [
    { id: 'assertive_assistant', name: 'Executive Assistant', tag: 'Direct & Efficient' },
    { id: 'drill_sergeant', name: 'Drill Sergeant', tag: 'High Urgency & Tough' },
    { id: 'supportive_coach', name: 'Supportive Coach', tag: 'Encouraging & Motivating' },
    { id: 'witty_roaster', name: 'Witty Companion', tag: 'Sarcastic & Sassy' },
    { id: 'zen_monk', name: 'Zen Monk', tag: 'Calm & Mindful Action' },
  ];

  return (
    <header className="border-b border-stone-800 bg-stone-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Brand & Sentinel Status */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
              {activeNagCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-stone-100">
                  TaskSentinel
                </h1>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  AI Reminder Agent
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <span className="flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${activeNagCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                  {activeNagCount > 0
                    ? `${activeNagCount} task${activeNagCount > 1 ? 's' : ''} currently nagging`
                    : `Sentinel active · ${totalActiveTasks} task${totalActiveTasks !== 1 ? 's' : ''} on watch`}
                </span>
                <span aria-hidden="true" className="text-stone-600">·</span>
                <span>Ticks every 1s</span>
              </div>
            </div>
          </div>

          {/* Controls: Persona & Audio & Notifications */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs">
            {/* Persona Selector */}
            <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-lg p-1">
              <label htmlFor="persona-select" className="text-stone-400 px-1 font-medium hidden sm:inline">
                Persona:
              </label>
              <select
                id="persona-select"
                value={settings.persona}
                onChange={(e) => onUpdateSettings({ persona: e.target.value as AgentPersona })}
                className="bg-transparent text-stone-200 border-none outline-none font-medium text-xs cursor-pointer focus:ring-0 py-1 pr-2"
              >
                {personaOptions.map((p) => (
                  <option key={p.id} value={p.id} className="bg-stone-900 text-stone-100">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              title={settings.soundEnabled ? 'Chime sound alert ON' : 'Chime sound alert MUTED'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
                settings.soundEnabled
                  ? 'bg-stone-900 border-stone-700 text-amber-400 hover:border-amber-500/50'
                  : 'bg-stone-950 border-stone-800 text-stone-500 hover:text-stone-300'
              }`}
            >
              {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">Audio Alert</span>
            </button>

            {/* Spoken Voice Toggle */}
            <button
              onClick={() => onUpdateSettings({ voiceEnabled: !settings.voiceEnabled })}
              title={settings.voiceEnabled ? 'Spoken Agent Voice ON' : 'Spoken Voice OFF'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
                settings.voiceEnabled
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:border-amber-400'
                  : 'bg-stone-950 border-stone-800 text-stone-500 hover:text-stone-300'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${settings.voiceEnabled ? 'text-amber-400' : ''}`} />
              <span className="hidden sm:inline">Agent Voice</span>
            </button>

            {/* Desktop Notification Toggle */}
            <button
              onClick={handleToggleNotifications}
              title="Browser Push Notifications"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
                settings.notificationsEnabled && notifPermission === 'granted'
                  ? 'bg-stone-900 border-stone-700 text-emerald-400 hover:border-emerald-500/50'
                  : 'bg-stone-950 border-stone-800 text-stone-500 hover:text-stone-300'
              }`}
            >
              {settings.notificationsEnabled && notifPermission === 'granted' ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {notifPermission === 'granted' ? 'Notifications' : 'Allow Alerts'}
              </span>
            </button>

            {/* Test Nag Button */}
            <button
              onClick={handleTestChime}
              disabled={testingAudio}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 transition-colors"
              title="Test Sentinel audio and spoken voice nag"
            >
              <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Test Audio</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
