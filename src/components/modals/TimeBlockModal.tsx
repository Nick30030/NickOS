import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useExecution } from '../../context/ExecutionContext';
import { Button } from '../common/Button';
import { TimeBlock, TimeBlockType, TimeBlockStatus, Task } from '../../types/domain';
import {
  timeToMinutes,
  minutesToTime,
  getCurrentTimeString,
  getTimeDifferenceMinutes,
} from '../../lib/utils';
import {
  X,
  Clock,
  Calendar,
  CheckSquare,
  Sparkles,
  BookOpen,
  Briefcase,
  Dumbbell,
  Coffee,
  Users,
  User,
  MoreHorizontal,
  Flame,
} from 'lucide-react';

export const TimeBlockModal: React.FC = () => {
  const {
    isTimeBlockModalOpen,
    timeBlockModalDefaults,
    editingTimeBlock,
    closeTimeBlockModal,
    createTimeBlock,
    updateTimeBlock,
    tasks,
    todayPlan,
    currentPlannerPlan,
    selectedPlannerDate,
  } = useExecution();

  const [title, setTitle] = useState('');
  const [blockType, setBlockType] = useState<TimeBlockType>('deep_work');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<TimeBlockStatus>('planned');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const blockTypeOptions: { type: TimeBlockType; label: string; icon: React.ReactNode; color: string }[] = [
    { type: 'deep_work', label: 'Deep Work', icon: <Briefcase className="w-3.5 h-3.5" />, color: 'border-blue-500/40 text-blue-300 bg-blue-950/40' },
    { type: 'spirituality', label: 'Spirituality', icon: <Flame className="w-3.5 h-3.5" />, color: 'border-amber-500/40 text-amber-300 bg-amber-950/40' },
    { type: 'learning', label: 'Learning', icon: <BookOpen className="w-3.5 h-3.5" />, color: 'border-purple-500/40 text-purple-300 bg-purple-950/40' },
    { type: 'exercise', label: 'Exercise', icon: <Dumbbell className="w-3.5 h-3.5" />, color: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40' },
    { type: 'admin', label: 'Admin', icon: <Clock className="w-3.5 h-3.5" />, color: 'border-neutral-500/40 text-neutral-300 bg-neutral-900' },
    { type: 'rest', label: 'Rest & Meal', icon: <Coffee className="w-3.5 h-3.5" />, color: 'border-amber-600/40 text-amber-200 bg-amber-900/20' },
    { type: 'social', label: 'Social', icon: <Users className="w-3.5 h-3.5" />, color: 'border-pink-500/40 text-pink-300 bg-pink-950/40' },
    { type: 'personal', label: 'Personal', icon: <User className="w-3.5 h-3.5" />, color: 'border-cyan-500/40 text-cyan-300 bg-cyan-950/40' },
    { type: 'other', label: 'Other', icon: <MoreHorizontal className="w-3.5 h-3.5" />, color: 'border-neutral-600 text-neutral-400 bg-neutral-900' },
  ];

  useEffect(() => {
    if (editingTimeBlock) {
      setTitle(editingTimeBlock.title);
      setBlockType(editingTimeBlock.blockType);
      setStartTime(editingTimeBlock.startTime);
      setEndTime(editingTimeBlock.endTime);
      setSelectedTaskId(editingTimeBlock.taskId || '');
      setNotes(editingTimeBlock.notes || '');
      setStatus(editingTimeBlock.status);
    } else if (timeBlockModalDefaults) {
      setTitle(timeBlockModalDefaults.title || '');
      setBlockType(timeBlockModalDefaults.blockType || 'deep_work');
      setStartTime(timeBlockModalDefaults.startTime || '09:00');
      setEndTime(timeBlockModalDefaults.endTime || '10:00');
      setSelectedTaskId(timeBlockModalDefaults.taskId || '');
      setNotes(timeBlockModalDefaults.notes || '');
      setStatus(timeBlockModalDefaults.status || 'planned');
    } else {
      setTitle('');
      setBlockType('deep_work');
      setStartTime('09:00');
      setEndTime('10:00');
      setSelectedTaskId('');
      setNotes('');
      setStatus('planned');
    }
  }, [editingTimeBlock, timeBlockModalDefaults, isTimeBlockModalOpen]);

  // When task is selected, auto-fill title and estimated end time if title is empty
  const handleTaskSelection = (taskId: string) => {
    setSelectedTaskId(taskId);
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        if (!title.trim() || title === 'Deep Work Session') {
          setTitle(task.title);
        }
        if (task.estimatedMinutes && startTime) {
          const startMins = timeToMinutes(startTime);
          setEndTime(minutesToTime(startMins + task.estimatedMinutes));
        }
      }
    }
  };

  const applyDurationPreset = (durationMinutes: number) => {
    const startMins = timeToMinutes(startTime);
    setEndTime(minutesToTime(startMins + durationMinutes));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const dailyPlanId =
        timeBlockModalDefaults?.dailyPlanId ||
        currentPlannerPlan?.id ||
        todayPlan?.id ||
        `plan-${selectedPlannerDate || new Date().toISOString().slice(0, 10)}`;

      if (editingTimeBlock) {
        await updateTimeBlock(editingTimeBlock.id, {
          title: title.trim(),
          blockType,
          startTime,
          endTime,
          taskId: selectedTaskId || undefined,
          notes: notes.trim() || undefined,
          status,
        });
      } else {
        await createTimeBlock({
          dailyPlanId,
          title: title.trim(),
          blockType,
          startTime,
          endTime,
          taskId: selectedTaskId || undefined,
          notes: notes.trim() || undefined,
          status: 'planned',
        });
      }
      closeTimeBlockModal();
    } catch (err) {
      console.error('Failed to save time block:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isTimeBlockModalOpen) return null;
  if (typeof document === 'undefined') return null;

  const durationMinutes = getTimeDifferenceMinutes(startTime, endTime);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-neutral-100">
              {editingTimeBlock ? 'Edit Scheduled Time Block' : 'Create New Time Block'}
            </h2>
          </div>
          <button
            onClick={closeTimeBlockModal}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Block Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold uppercase text-neutral-400">
              Block Category
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {blockTypeOptions.map(opt => (
                <button
                  type="button"
                  key={opt.type}
                  onClick={() => setBlockType(opt.type)}
                  className={`px-2.5 py-2 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                    blockType === opt.type
                      ? `${opt.color} ring-1 ring-amber-400 font-bold`
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  {opt.icon}
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-mono font-bold uppercase text-neutral-400">
              Block Title / Activity *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Spirituality, Business OS Architecture, Lunch..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Associate Task */}
          <div className="space-y-1">
            <label className="text-xs font-mono font-bold uppercase text-neutral-400 flex items-center justify-between">
              <span>Link Actionable Task (Optional)</span>
              {selectedTaskId && (
                <button
                  type="button"
                  onClick={() => setSelectedTaskId('')}
                  className="text-[10px] text-neutral-400 hover:text-amber-400 cursor-pointer"
                >
                  Clear link
                </button>
              )}
            </label>
            <select
              value={selectedTaskId}
              onChange={e => handleTaskSelection(e.target.value)}
              className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="">No task attached (Routine / Personal / Free)</option>
              {tasks
                .filter(t => t.status !== 'completed' || t.id === selectedTaskId)
                .map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.priority.toUpperCase()}] {t.title} ({t.estimatedMinutes}m)
                  </option>
                ))}
            </select>
          </div>

          {/* Time Configuration */}
          <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-neutral-400">Start Time (HH:MM)</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-neutral-400">End Time (HH:MM)</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Quick Duration Presets */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                <span>Duration Presets:</span>
                <span className="text-amber-400 font-bold">{durationMinutes} minutes scheduled</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[15, 30, 45, 60, 90, 120].map(mins => (
                  <button
                    type="button"
                    key={mins}
                    onClick={() => applyDurationPreset(mins)}
                    className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-[11px] font-mono text-neutral-300 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    +{mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Status if editing */}
          {editingTimeBlock && (
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-neutral-400">
                Block Execution Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as TimeBlockStatus)}
                className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress (Active)</option>
                <option value="completed">Completed</option>
                <option value="skipped">Skipped</option>
                <option value="deviated">Deviated</option>
              </select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-mono font-bold uppercase text-neutral-400">
              Execution Notes / Specific Focus (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Key deliverable or constraints for this time slot..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={closeTimeBlockModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting
                ? 'Saving...'
                : editingTimeBlock
                ? 'Update Time Block'
                : 'Schedule Time Block'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
