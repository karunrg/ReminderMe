import React from 'react';
import { ShieldCheck, Flame, CheckCircle, Award } from 'lucide-react';
import { Task } from '../types';

interface StatsBarProps {
  tasks: Task[];
}

export const StatsBar: React.FC<StatsBarProps> = ({ tasks }) => {
  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const now = Date.now();
  const overdueTasks = activeTasks.filter((t) => t.dueDateTime <= now && (!t.snoozedUntil || t.snoozedUntil <= now));

  const totalNudgesDefeated = tasks.reduce((sum, t) => sum + (t.reminderCount || 0), 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Active on watch */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5">
        <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
          <span>Guarded Tasks</span>
          <ShieldCheck className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-2xl font-bold text-stone-100 font-mono">
          {activeTasks.length}
        </div>
        <div className="text-[11px] text-stone-500 mt-0.5">
          {activeTasks.length === 1 ? '1 item active' : `${activeTasks.length} items active`}
        </div>
      </div>

      {/* Nagging / Overdue Now */}
      <div className={`border rounded-2xl p-3.5 transition-colors ${
        overdueTasks.length > 0
          ? 'bg-red-950/20 border-red-500/40'
          : 'bg-stone-900 border-stone-800'
      }`}>
        <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
          <span>Nagging Now</span>
          <Flame className={`w-4 h-4 ${overdueTasks.length > 0 ? 'text-red-400 animate-pulse' : 'text-stone-500'}`} />
        </div>
        <div className={`text-2xl font-bold font-mono ${overdueTasks.length > 0 ? 'text-red-400' : 'text-stone-100'}`}>
          {overdueTasks.length}
        </div>
        <div className="text-[11px] text-stone-500 mt-0.5">
          {overdueTasks.length > 0 ? 'Requires immediate action' : 'All clear right now'}
        </div>
      </div>

      {/* Completed */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5">
        <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
          <span>Completed</span>
          <CheckCircle className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold text-stone-100 font-mono">
          {completedTasks.length}
        </div>
        <div className="text-[11px] text-stone-500 mt-0.5">
          Tasks marked done
        </div>
      </div>

      {/* Total Nudges Handled */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5">
        <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
          <span>Nudges Sent</span>
          <Award className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-2xl font-bold text-amber-400 font-mono">
          {totalNudgesDefeated}
        </div>
        <div className="text-[11px] text-stone-500 mt-0.5">
          Agent persistence counter
        </div>
      </div>
    </div>
  );
};
