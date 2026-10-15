import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Textarea, Select } from '../common/Input';
import { useExecution } from '../../context/ExecutionContext';
import { PriorityBadge, CommitmentBadge } from '../common/Badge';
import { formatMinutes, getTodayString, getTomorrowString, formatFriendlyDate } from '../../lib/utils';
import { Check, ShieldCheck, Zap, Calendar } from 'lucide-react';

export const PlanDayModal: React.FC = () => {
  const {
    isPlanDayModalOpen,
    setIsPlanDayModalOpen,
    todayPlan,
    currentPlannerPlan,
    selectedPlannerDate,
    tasks,
    commitDayPlan,
  } = useExecution();

  const targetDate = selectedPlannerDate || getTodayString();
  const isToday = targetDate === getTodayString();
  const isTomorrow = targetDate === getTomorrowString();
  const dayLabel = isToday ? "Today's" : isTomorrow ? "Tomorrow's" : `${targetDate}'s`;
  const activePlan = isToday ? todayPlan : (currentPlannerPlan || todayPlan);

  const [focusGoalToday, setFocusGoalToday] = useState(
    activePlan?.focusGoalToday || 'Deliver core system architecture and responsive execution cockpit.'
  );
  const [energyTarget, setEnergyTarget] = useState<'maximum' | 'steady' | 'recovery'>(
    activePlan?.energyTarget || 'steady'
  );
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(
    activePlan?.plannedTaskIds && activePlan.plannedTaskIds.length > 0
      ? activePlan.plannedTaskIds
      : tasks.filter(t => t.scheduledDate === targetDate || (!t.scheduledDate && t.status === 'planned')).map(t => t.id)
  );
  const [notes, setNotes] = useState(activePlan?.notes || 'Strict adherence to time blocks; Nick makes all final schedule adjustments.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state whenever modal opens or target date changes
  useEffect(() => {
    if (isPlanDayModalOpen) {
      const plan = isToday ? todayPlan : currentPlannerPlan;
      if (plan) {
        setFocusGoalToday(plan.focusGoalToday || '');
        setEnergyTarget(plan.energyTarget || 'steady');
        setSelectedTaskIds(plan.plannedTaskIds || []);
        setNotes(plan.notes || '');
      } else {
        setFocusGoalToday(isTomorrow ? "Execute tomorrow's prioritized roadmap with precision" : "Execute planned commitments with relentless focus");
        setEnergyTarget('steady');
        setSelectedTaskIds(
          tasks.filter(t => t.scheduledDate === targetDate || (!t.scheduledDate && t.status === 'planned')).slice(0, 5).map(t => t.id)
        );
        setNotes('Prepared ahead of time. Nick owns the schedule.');
      }
    }
  }, [isPlanDayModalOpen, targetDate, currentPlannerPlan, todayPlan, isToday, isTomorrow, tasks]);

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const plannedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));
  const totalPlannedMins = plannedTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);

  const handleReusePreviousDay = () => {
    const typicalTasks = tasks.filter(t => t.priority === 'critical' || t.priority === 'high').slice(0, 5).map(t => t.id);
    if (typicalTasks.length > 0) {
      setSelectedTaskIds(typicalTasks);
      setFocusGoalToday("Typical Daily Deep Work & System Architecture Execution");
      setEnergyTarget('steady');
      setNotes('Reused from typical previous day schedule template. Slight adjustments applied.');
    }
  };

  const handleCommit = async () => {
    try {
      setIsSubmitting(true);
      await commitDayPlan({
        date: targetDate,
        focusGoalToday,
        plannedTaskIds: selectedTaskIds,
        energyTarget,
        notes,
      });
      setIsPlanDayModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isPlanDayModalOpen}
      onClose={() => setIsPlanDayModalOpen(false)}
      title={`Plan & Confirm ${dayLabel} Program`}
      subtitle={`Nick remains the decision maker. Review, sequence, and lock ${isToday ? "today's" : isTomorrow ? "tomorrow's" : formatFriendlyDate(targetDate)} commitments.`}
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Date context pill */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950 border border-neutral-850 text-xs font-mono">
          <div className="flex items-center gap-2 text-neutral-300">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Target Execution Date:</span>
            <span className="text-emerald-400 font-bold">{formatFriendlyDate(targetDate)}</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] ${isTomorrow ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30' : isToday ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-400'}`}>
            {isToday ? 'Today (Active)' : isTomorrow ? 'Tomorrow (Advance Planning)' : 'Target Date'}
          </span>
        </div>

        {/* Quick Template Reuse Action */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs">
          <div>
            <span className="font-mono font-bold text-neutral-200 block">Typical Day Template</span>
            <span className="text-[11px] text-neutral-400 font-mono">Reuse previous day schedule to plan instantly with slight adjustments.</span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleReusePreviousDay}
            className="font-mono text-xs border-neutral-700 bg-neutral-800 hover:bg-neutral-750 text-amber-400 shrink-0"
          >
            🔄 Reuse Previous Day
          </Button>
        </div>

        {/* Focus Target */}
        <Input
          label={`${dayLabel} Primary Focus Target *`}
          value={focusGoalToday}
          onChange={e => setFocusGoalToday(e.target.value)}
          placeholder={`What single outcome constitutes complete execution success for ${isToday ? 'today' : 'tomorrow'}?`}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Target Energy Cadence"
            value={energyTarget}
            onChange={e => setEnergyTarget(e.target.value as 'maximum' | 'steady' | 'recovery')}
            options={[
              { label: 'Steady Focus (Sustainable execution)', value: 'steady' },
              { label: 'Maximum Output (High intensity push)', value: 'maximum' },
              { label: 'Recovery & Maintenance (Consolidation)', value: 'recovery' },
            ]}
          />
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 flex items-center justify-between">
            <span className="text-xs font-mono text-neutral-400">Total Planned Bandwidth:</span>
            <span className="text-sm font-mono font-bold text-amber-400">{formatMinutes(totalPlannedMins)}</span>
          </div>
        </div>

        {/* Task Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider font-mono">
              Committed Tasks ({selectedTaskIds.length}/{tasks.length})
            </label>
            <span className="text-[11px] text-neutral-400 font-mono">Select tasks for {isToday ? "today's" : "tomorrow's"} active schedule</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {tasks.map(task => {
              const isSelected = selectedTaskIds.includes(task.id);
              return (
                <div
                  key={task.id}
                  onClick={() => toggleTaskSelection(task.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-neutral-900 border-amber-500/40 text-neutral-100 shadow-xs'
                      : 'bg-neutral-950/60 border-neutral-850 text-neutral-400 hover:border-neutral-750'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-amber-500 border-amber-500 text-neutral-950'
                          : 'border-neutral-700 bg-neutral-900'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-medium truncate ${isSelected ? 'text-neutral-100' : 'text-neutral-400'}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-neutral-400">
                          {formatMinutes(task.estimatedMinutes)}
                        </span>
                        <PriorityBadge priority={task.priority} size="sm" />
                        <CommitmentBadge level={task.commitmentLevel} size="sm" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Textarea
          label="Nick's Executive Execution Notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Specific mental models, distraction avoidance rules, or buffer strategies..."
          rows={2}
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Nick holds decision authority</span>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsPlanDayModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCommit}
              isLoading={isSubmitting}
              leftIcon={<Zap className="w-4 h-4" />}
            >
              Lock & Commit Program
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

