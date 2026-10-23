import React, { useState } from 'react';
import { Sparkles, Plus, SlidersHorizontal, Loader2, ArrowRight } from 'lucide-react';
import { Task } from '../types';

interface QuickAddBarProps {
  onAddTask: (taskData: Partial<Task>) => void;
  onOpenDetailedModal: () => void;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({
  onAddTask,
  onOpenDetailedModal,
}) => {
  const [input, setInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const samplePrompts = [
    'Take vitamins in 2 minutes, nag every 1m',
    'Submit weekly expense report tonight at 8pm, high priority',
    'Call the dentist tomorrow at 10am',
    'Finish project presentation in 20 minutes',
  ];

  const handleQuickSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    setIsParsing(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/agent/parse-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: trimmed,
          currentTime: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('AI parse failed');
      }

      const data = await response.json();
      if (data.task) {
        const dueTime = new Date(data.task.dueDateTime).getTime();
        onAddTask({
          title: data.task.title,
          description: data.task.description || '',
          category: data.task.category || 'General',
          priority: data.task.priority || 'medium',
          dueDateTime: isNaN(dueTime) ? Date.now() + 15 * 60 * 1000 : dueTime,
          nagCadence: data.task.nagCadence || '5m',
          soundAlert: data.task.soundAlert ?? true,
          voiceAlert: data.task.voiceAlert ?? true,
          browserNotification: true,
        });
        setInput('');
      } else {
        throw new Error('Could not parse task details');
      }
    } catch (err: any) {
      console.warn('AI parse error, falling back to instant task creation:', err);
      // Clean fallback: create task directly with defaults (due in 10 mins, nag every 5m)
      onAddTask({
        title: trimmed,
        category: 'General',
        priority: 'high',
        dueDateTime: Date.now() + 10 * 60 * 1000,
        nagCadence: '5m',
        soundAlert: true,
        voiceAlert: true,
        browserNotification: true,
      });
      setInput('');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-stone-200">
            Smart Agent Task Input
          </h3>
          <span className="text-xs text-stone-500 hidden sm:inline">
            Type anything with natural timing &amp; cadence
          </span>
        </div>
        <button
          onClick={onOpenDetailedModal}
          className="text-xs flex items-center gap-1.5 text-stone-400 hover:text-amber-400 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Detailed Form</span>
        </button>
      </div>

      <form onSubmit={handleQuickSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 'Turn off the oven in 15 mins, nag every 2m urgent'..."
            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
            disabled={isParsing}
          />
        </div>

        <button
          type="submit"
          disabled={isParsing || !input.trim()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 disabled:hover:bg-amber-500 text-stone-950 font-semibold text-sm transition-all shadow-md shadow-amber-950"
        >
          {isParsing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scheduling...</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Schedule Agent</span>
            </>
          )}
        </button>
      </form>

      {/* Suggested prompts */}
      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-stone-500 font-medium mr-1">Try:</span>
        {samplePrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setInput(prompt)}
            className="text-xs text-stone-400 hover:text-stone-200 bg-stone-950/60 hover:bg-stone-800 border border-stone-800/80 px-2.5 py-1 rounded-lg transition-colors truncate max-w-[280px]"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
};
