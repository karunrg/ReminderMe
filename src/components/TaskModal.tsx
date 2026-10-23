import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Volume2, Radio, Bell, AlertTriangle } from 'lucide-react';
import { NagCadence, Task, TaskPriority } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  initialTask?: Task | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Work');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [nagCadence, setNagCadence] = useState<NagCadence>('5m');
  const [soundAlert, setSoundAlert] = useState(true);
  const [voiceAlert, setVoiceAlert] = useState(true);
  const [browserNotification, setBrowserNotification] = useState(true);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      setCategory(initialTask.category);
      setPriority(initialTask.priority);
      const d = new Date(initialTask.dueDateTime);
      setDueDate(d.toISOString().split('T')[0]);
      setDueTime(d.toTimeString().slice(0, 5));
      setNagCadence(initialTask.nagCadence);
      setSoundAlert(initialTask.soundAlert);
      setVoiceAlert(initialTask.voiceAlert);
      setBrowserNotification(initialTask.browserNotification);
    } else {
      // Default: 15 minutes in future
      const future = new Date(Date.now() + 15 * 60 * 1000);
      setTitle('');
      setDescription('');
      setCategory('Work');
      setPriority('high');
      setDueDate(future.toISOString().split('T')[0]);
      setDueTime(future.toTimeString().slice(0, 5));
      setNagCadence('5m');
      setSoundAlert(true);
      setVoiceAlert(true);
      setBrowserNotification(true);
    }
  }, [initialTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let dueTimestamp = Date.now() + 15 * 60 * 1000;
    if (dueDate && dueTime) {
      const combined = new Date(`${dueDate}T${dueTime}`);
      if (!isNaN(combined.getTime())) {
        dueTimestamp = combined.getTime();
      }
    }

    onSave({
      ...(initialTask ? { id: initialTask.id } : {}),
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      dueDateTime: dueTimestamp,
      nagCadence,
      soundAlert,
      voiceAlert,
      browserNotification,
    });
    onClose();
  };

  const categories = ['Work', 'Personal', 'Health', 'Errands', 'Finance', 'Urgent'];
  const cadences: { id: NagCadence; label: string }[] = [
    { id: '1m', label: 'Every 1 minute (Relentless)' },
    { id: '2m', label: 'Every 2 minutes' },
    { id: '5m', label: 'Every 5 minutes (Recommended)' },
    { id: '10m', label: 'Every 10 minutes' },
    { id: '15m', label: 'Every 15 minutes' },
    { id: '30m', label: 'Every 30 minutes' },
    { id: '1h', label: 'Every 1 hour' },
    { id: 'escalating', label: 'Escalating (5m -> 3m -> 1m)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <h3 className="text-base font-bold text-stone-100">
            {initialTask ? 'Edit Reminder Task' : 'Configure New Reminder Task'}
          </h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 p-1 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Call client back with estimate"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Notes / Context (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key links or context..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/80"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-stone-900 text-stone-100">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/80"
              >
                <option value="urgent" className="bg-stone-900 text-rose-400 font-bold">Urgent (Highest)</option>
                <option value="high" className="bg-stone-900 text-orange-400">High</option>
                <option value="medium" className="bg-stone-900 text-amber-400">Medium</option>
                <option value="low" className="bg-stone-900 text-stone-400">Low</option>
              </select>
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/80"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>Due Time</span>
              </label>
              <input
                type="time"
                required
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/80"
              />
            </div>
          </div>

          {/* Nag Cadence (Relentless Interval) */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Reminder Frequency Until Marked Done
            </label>
            <select
              value={nagCadence}
              onChange={(e) => setNagCadence(e.target.value as NagCadence)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/80"
            >
              {cadences.map((c) => (
                <option key={c.id} value={c.id} className="bg-stone-900 text-stone-100">
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notification toggles */}
          <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
            <span className="text-xs font-semibold text-stone-300 block mb-1">
              Alert Channels:
            </span>
            <label className="flex items-center gap-2.5 text-xs text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={soundAlert}
                onChange={(e) => setSoundAlert(e.target.checked)}
                className="rounded border-stone-700 text-amber-500 focus:ring-0"
              />
              <Volume2 className="w-3.5 h-3.5 text-stone-400" />
              <span>Synthesizer Chime / Alert Sound</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={voiceAlert}
                onChange={(e) => setVoiceAlert(e.target.checked)}
                className="rounded border-stone-700 text-amber-500 focus:ring-0"
              />
              <Radio className="w-3.5 h-3.5 text-stone-400" />
              <span>Spoken AI Voice Message</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={browserNotification}
                onChange={(e) => setBrowserNotification(e.target.checked)}
                className="rounded border-stone-700 text-amber-500 focus:ring-0"
              />
              <Bell className="w-3.5 h-3.5 text-stone-400" />
              <span>Browser Push Notification</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 rounded-xl transition-all shadow-md shadow-amber-950"
            >
              {initialTask ? 'Save Changes' : 'Create & Guard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
