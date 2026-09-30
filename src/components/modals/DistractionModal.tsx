import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useExecution } from '../../context/ExecutionContext';
import { Button } from '../common/Button';
import { SessionPause } from '../../types/domain';
import {
  X,
  AlertTriangle,
  Coffee,
  HelpCircle,
  Clock,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface DistractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'distraction' | 'break' | 'blocked' | 'pause';
}

export const DistractionModal: React.FC<DistractionModalProps> = ({
  isOpen,
  onClose,
  type = 'distraction',
}) => {
  const { pauseFocusSession, recordManualCheckIn } = useExecution();
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const distractionPresets = [
    'External message / Slack notification',
    'Cognitive mind wander / phone check',
    'Unexpected colleague or personal interruption',
    'Context switch to urgent email',
    'Noise or environment disruption',
  ];

  const breakPresets = [
    '5-minute tactical breather',
    'Hydration / physical stretch',
    'Bio break',
    'Mental reset between deep blocks',
  ];

  const blockerPresets = [
    'Waiting on credentials or API access',
    'Ambiguous requirement / need clarification',
    'Technical bug / failing build dependency',
    'External approval bottleneck',
  ];

  const presets = type === 'break' ? breakPresets : type === 'blocked' ? blockerPresets : distractionPresets;
  const effectiveReason = customReason.trim() || reason || (type === 'break' ? 'Short restorative break' : 'Unspecified interruption');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (type === 'break') {
        await recordManualCheckIn('break', effectiveReason);
      } else if (type === 'blocked') {
        await recordManualCheckIn('blocked', effectiveReason);
      } else {
        const category: SessionPause['category'] = type === 'pause' ? 'other' : 'distraction';
        await pauseFocusSession(effectiveReason, category);
      }
      onClose();
    } catch (err) {
      console.error('Failed to log check-in/distraction:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
              type === 'break'
                ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                : type === 'blocked'
                ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
            }`}>
              {type === 'break' ? <Coffee className="w-4 h-4" /> : type === 'blocked' ? <ShieldAlert className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-100">
                {type === 'break' ? 'Log Tactical Break' : type === 'blocked' ? 'Log Execution Blocker' : 'Log Interruption / Distraction'}
              </h2>
              <p className="text-[10px] font-mono text-neutral-400">
                Accurate signal tracking preserves source-of-truth integrity.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold uppercase text-neutral-400">
              Select Reason
            </label>
            <div className="space-y-1.5">
              {presets.map(p => (
                <button
                  type="button"
                  key={p}
                  onClick={() => {
                    setReason(p);
                    setCustomReason('');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                    reason === p && !customReason
                      ? 'border-amber-500/60 bg-amber-950/30 text-amber-300 font-bold'
                      : 'border-neutral-800 bg-neutral-950/70 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="pt-1">
              <input
                type="text"
                placeholder="Or type custom note..."
                value={customReason}
                onChange={e => {
                  setCustomReason(e.target.value);
                  setReason('');
                }}
                className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging...' : 'Confirm & Log Signal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
