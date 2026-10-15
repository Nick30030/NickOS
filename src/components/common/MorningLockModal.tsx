import React, { useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';
import { useExecution } from '../../context/ExecutionContext';
import { getTodayString } from '../../lib/utils';

export const MorningLockModal: React.FC = () => {
  const { tasks, setIsPlanDayModalOpen, createTask } = useExecution();
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);

  const todayStr = getTodayString();
  const todayTasks = tasks.filter(t => t.scheduledDate === todayStr || t.status === 'in_progress');

  // Check if today is Sunday (0)
  const isSunday = new Date().getDay() === 0;
  const currentHour = new Date().getHours();

  // Condition for lock: Mon-Sat (not Sunday), hour >= 8, no tasks scheduled yet for today, and not manually unlocked in session
  const shouldLock = !isSunday && currentHour >= 8 && todayTasks.length === 0 && !isUnlocked;

  if (!shouldLock) return null;

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    await createTask({
      title: quickTaskTitle.trim(),
      status: 'planned',
      scheduledDate: todayStr,
      priority: 'high',
      commitmentLevel: 'hard_commitment',
      estimatedMinutes: 45,
    });

    setIsUnlocked(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="max-w-xl w-full p-8 bg-neutral-900 border border-amber-500/30 shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-100 font-mono">
              Morning Planning Lock (8:00 AM Rule)
            </h2>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              It's past 8:00 AM and no program is set for today. Plan your core task to unlock execution.
            </p>
          </div>
        </div>

        <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
          <span className="text-xs font-mono text-amber-400 font-bold block uppercase tracking-wider">
            Quick 1-Minute Core Task Setup
          </span>
          <form onSubmit={handleQuickSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="What is your #1 non-negotiable task for today?"
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 font-mono"
              autoFocus
            />
            <Button type="submit" variant="primary" size="sm" className="rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold font-mono">
              Lock In
            </Button>
          </form>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
          <span className="text-[11px] text-neutral-500 font-mono">
            Nick OS remains fully accessible to establish your sovereign day plan.
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPlanDayModalOpen(true)}
            className="rounded-xl border-neutral-800 hover:bg-neutral-800 font-mono text-xs"
          >
            Open Full AI Planner
          </Button>
        </div>
      </Card>
    </div>
  );
};
