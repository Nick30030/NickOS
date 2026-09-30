import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useExecution } from '../../context/ExecutionContext';
import { Button } from '../common/Button';
import { Task } from '../../types/domain';
import {
  getTomorrowString,
  addDaysToDate,
  formatFriendlyDate,
} from '../../lib/utils';
import {
  Clock,
  X,
  AlertTriangle,
  Calendar,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

interface PostponeTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}

export const PostponeTaskModal: React.FC<PostponeTaskModalProps> = ({
  isOpen,
  onClose,
  task,
}) => {
  const { abandonOrPostponeTask } = useExecution();

  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [targetDate, setTargetDate] = useState<string>(getTomorrowString());
  const [actionType, setActionType] = useState<'reschedule' | 'inbox'>('reschedule');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !task) return null;
  if (typeof document === 'undefined') return null;

  const reasonPresets = [
    'Energy dipped / cognitive fatigue',
    'Blocked by external dependency or info',
    'Higher priority urgent issue emerged',
    'Underestimated scope / needs breakdown',
    'Scheduled time window passed',
  ];

  const effectiveReason = customReason.trim() || reason;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveReason) return;

    setIsSubmitting(true);
    try {
      const chosenDate = actionType === 'reschedule' ? targetDate : undefined;
      await abandonOrPostponeTask(task.id, effectiveReason, chosenDate);
      onClose();
    } catch (err) {
      console.error('Failed to postpone task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-100">
                Postpone or Pause Task Execution
              </h2>
              <p className="text-[11px] text-neutral-400 truncate max-w-xs">
                {task.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              Your actual time spent so far will be logged and preserved in your execution session history.
            </p>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold uppercase text-neutral-400">
              Reason for Postponing *
            </label>
            <div className="space-y-1.5">
              {reasonPresets.map(preset => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => {
                    setReason(preset);
                    setCustomReason('');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                    reason === preset && !customReason
                      ? 'border-amber-500/60 bg-amber-950/30 text-amber-300 font-bold'
                      : 'border-neutral-800 bg-neutral-950/70 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="pt-1">
              <input
                type="text"
                placeholder="Or specify custom reason..."
                value={customReason}
                onChange={e => {
                  setCustomReason(e.target.value);
                  setReason('');
                }}
                className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Target Rescheduling */}
          <div className="space-y-2 pt-2 border-t border-neutral-800">
            <label className="text-xs font-mono font-bold uppercase text-neutral-400">
              Where to move this task?
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActionType('reschedule')}
                className={`p-2.5 rounded-lg border text-xs font-mono text-left cursor-pointer transition-all ${
                  actionType === 'reschedule'
                    ? 'border-blue-500/60 bg-blue-950/30 text-blue-300 font-bold'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Reschedule to Date</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-normal">Pick a future target day</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType('inbox')}
                className={`p-2.5 rounded-lg border text-xs font-mono text-left cursor-pointer transition-all ${
                  actionType === 'inbox'
                    ? 'border-amber-500/60 bg-amber-950/30 text-amber-300 font-bold'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Move to Backlog</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-normal">Unschedule for later triage</span>
              </button>
            </div>

            {actionType === 'reschedule' && (
              <div className="space-y-2 pt-2">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTargetDate(getTomorrowString())}
                    className="px-2 py-1 rounded bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-[11px] font-mono text-neutral-300 hover:text-amber-300 cursor-pointer"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetDate(addDaysToDate(3))}
                    className="px-2 py-1 rounded bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-[11px] font-mono text-neutral-300 hover:text-amber-300 cursor-pointer"
                  >
                    In 3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetDate(addDaysToDate(7))}
                    className="px-2 py-1 rounded bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-[11px] font-mono text-neutral-300 hover:text-amber-300 cursor-pointer"
                  >
                    Next Week
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    required={actionType === 'reschedule'}
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="flex-1 rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-1.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-xs text-neutral-400">
                    {formatFriendlyDate(targetDate)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="md"
              disabled={isSubmitting || !effectiveReason}
            >
              {isSubmitting ? 'Saving...' : 'Postpone & Log Session'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
