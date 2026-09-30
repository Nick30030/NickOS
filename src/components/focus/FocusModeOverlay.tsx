// ==============================================================================
// NICK OS — FOCUS MODE IMMERSIVE EXECUTION ENVIRONMENT
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { FocusControlService } from '../../services/execution/FocusControlService';
import { InterruptionCategory } from '../../types/focus';
import { Button } from '../common/Button';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertTriangle, 
  PlusCircle, 
  ShieldAlert, 
  X, 
  Clock, 
  Target, 
  Sparkles,
  Compass,
  ArrowRight
} from 'lucide-react';

interface FocusModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FocusModeOverlay: React.FC<FocusModeOverlayProps> = ({ isOpen, onClose }) => {
  const {
    tasks,
    activeFocusTaskId,
    activeExecutionSession,
    isTimerRunning,
    timerElapsedSeconds,
    startFocusSession,
    pauseFocusSession,
    resumeFocusSession,
    completeActiveTask,
    recordExternalBlocker,
    quickCaptureThought,
  } = useExecution();

  const [showDistractionModal, setShowDistractionModal] = useState(false);
  const [distractionCategory, setDistractionCategory] = useState<InterruptionCategory>('phone');
  const [distractionReason, setDistractionReason] = useState('');

  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [captureText, setCaptureText] = useState('');

  const [visibilityWarning, setVisibilityWarning] = useState<{ hiddenDuration: number } | null>(null);
  const [hiddenStartTime, setHiddenStartTime] = useState<number | null>(null);

  const activeTask = tasks.find(t => t.id === activeFocusTaskId) || tasks.find(t => t.status === 'in_progress') || tasks[0];

  // Visibility change tracking
  useEffect(() => {
    if (!isOpen) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setHiddenStartTime(Date.now());
      } else if (hiddenStartTime) {
        const hiddenDurationSecs = Math.floor((Date.now() - hiddenStartTime) / 1000);
        setHiddenStartTime(null);
        if (hiddenDurationSecs >= 60) {
          // If hidden for 1 minute or more, show confirmation dialog
          setVisibilityWarning({ hiddenDuration: Math.floor(hiddenDurationSecs / 60) });
          if (activeExecutionSession) {
            FocusControlService.recordVisibilityEvent({
              id: 'vis_' + Date.now(),
              sessionId: activeExecutionSession.id,
              hiddenAt: new Date(hiddenStartTime).toISOString(),
              returnedAt: new Date().toISOString(),
              durationSeconds: hiddenDurationSecs,
            });
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, hiddenStartTime, activeExecutionSession]);

  if (!isOpen) return null;

  const handleRecordDistraction = () => {
    if (activeExecutionSession) {
      FocusControlService.recordInterruption(
        activeExecutionSession.id,
        distractionCategory,
        distractionReason,
        activeTask?.id,
        activeTask?.title
      );
    }
    setShowDistractionModal(false);
    setDistractionReason('');
  };

  const handleQuickCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captureText.trim()) return;
    await quickCaptureThought(captureText.trim());
    setCaptureText('');
    setShowCaptureModal(false);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const plannedSecs = (activeTask?.estimatedMinutes || 45) * 60;
  const remainingSecs = Math.max(0, plannedSecs - timerElapsedSeconds);
  const progressPercent = Math.min(100, (timerElapsedSeconds / plannedSecs) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/98 backdrop-blur-xl flex flex-col items-center justify-between p-6 sm:p-12 text-neutral-100 select-none animate-in fade-in duration-200">
      
      {/* Top Bar: Minimal Focus Header */}
      <div className="w-full max-w-4xl flex items-center justify-between border-b border-neutral-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-amber-400">
            Nick OS // Focus Execution Mode
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Exit Focus
          </button>
        </div>
      </div>

      {/* Center Stage: Task & Timer */}
      <div className="w-full max-w-2xl flex flex-col items-center text-center space-y-8 my-auto">
        
        {/* Timer Ring / Display */}
        <div className="relative flex flex-col items-center justify-center p-8 bg-neutral-900/50 rounded-3xl border border-neutral-800/80 shadow-2xl w-full">
          <div className="text-xs font-mono uppercase tracking-widest text-neutral-400 mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> Active Execution Timer
          </div>

          <div className="text-6xl sm:text-7xl font-mono font-extrabold tracking-tighter text-white my-3">
            {formatTimer(remainingSecs)}
          </div>

          <div className="text-xs font-mono text-neutral-400">
            Elapsed: {formatTimer(timerElapsedSeconds)} / Planned: {activeTask?.estimatedMinutes || 45} mins
          </div>

          {/* Progress bar */}
          <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-6 overflow-hidden">
            <div 
              className="bg-amber-500 h-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Current Task Details */}
        <div className="space-y-3 w-full">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[11px] font-mono text-amber-400">
            <Target className="w-3.5 h-3.5" /> Current Execution Focus
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
            {activeTask ? activeTask.title : 'No active task selected.'}
          </h1>

          {activeTask?.description && (
            <p className="text-sm text-neutral-400 font-mono max-w-lg mx-auto line-clamp-2">
              {activeTask.description}
            </p>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {isTimerRunning ? (
            <Button
              variant="outline"
              size="md"
              onClick={() => pauseFocusSession('User manual pause', 'break')}
              className="border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200"
            >
              <Pause className="w-4 h-4 mr-2" /> Pause Timer
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() => resumeFocusSession()}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400 font-bold"
            >
              <Play className="w-4 h-4 mr-2" /> Resume Focus
            </Button>
          )}

          <Button
            variant="outline"
            size="md"
            onClick={() => setShowCaptureModal(true)}
            className="border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200"
          >
            <PlusCircle className="w-4 h-4 mr-2 text-amber-400" /> Capture Thought
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => setShowDistractionModal(true)}
            className="border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200"
          >
            <AlertTriangle className="w-4 h-4 mr-2 text-rose-400" /> I got distracted
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={async () => {
              if (activeFocusTaskId) {
                await completeActiveTask();
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" /> Complete Task
          </Button>
        </div>

      </div>

      {/* Bottom Footer Notice */}
      <div className="w-full max-w-4xl text-center text-[10px] font-mono text-neutral-500 border-t border-neutral-800/60 pt-4">
        Nick OS Anti-Distraction Engine // All background noise minimized. Stay in flow.
      </div>

      {/* Distraction Recording Modal */}
      {showDistractionModal && (
        <div className="fixed inset-0 z-60 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-sm font-mono uppercase font-bold text-neutral-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" /> Record Interruption
            </h3>
            <p className="text-xs font-mono text-neutral-400">
              No judgment. Logging interruptions feeds your behavioral analytics for better future planning.
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-neutral-400">Category</label>
              <select
                value={distractionCategory}
                onChange={e => setDistractionCategory(e.target.value as InterruptionCategory)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs font-mono text-neutral-200"
              >
                <option value="phone">Phone / Notification</option>
                <option value="social_media">Social Media</option>
                <option value="unrelated_work">Unrelated Work</option>
                <option value="idea">Random Idea / Thought</option>
                <option value="message">Incoming Message</option>
                <option value="fatigue">Fatigue / Mental Break</option>
                <option value="external_interruption">External Interruption</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-neutral-400">Notes / Reason (Optional)</label>
              <input
                type="text"
                value={distractionReason}
                onChange={e => setDistractionReason(e.target.value)}
                placeholder="e.g. Slack ping from manager"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs font-mono text-neutral-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowDistractionModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleRecordDistraction} className="bg-rose-600 hover:bg-rose-500 text-white">
                Log Interruption
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Capture Modal */}
      {showCaptureModal && (
        <div className="fixed inset-0 z-60 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleQuickCaptureSubmit} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-sm font-mono uppercase font-bold text-neutral-200 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-amber-400" /> Distraction-Free Thought Capture
            </h3>
            <p className="text-xs font-mono text-neutral-400">
              Captured immediately to your Inbox so you can stay locked on your current task.
            </p>

            <textarea
              value={captureText}
              onChange={e => setCaptureText(e.target.value)}
              placeholder="What just popped into your head?"
              rows={3}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500"
              autoFocus
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setShowCaptureModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" className="bg-amber-500 text-neutral-950 hover:bg-amber-400 font-bold">
                Capture to Inbox
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Visibility Confirmation Modal */}
      {visibilityWarning && (
        <div className="fixed inset-0 z-60 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-sm font-mono uppercase font-bold text-amber-400 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Focus Session Resumed
            </h3>
            <p className="text-xs font-mono text-neutral-300 leading-relaxed">
              Nick OS was not observable for approximately <strong className="text-white">{visibilityWarning.hiddenDuration} minutes</strong>. How would you like to categorize this period?
            </p>

            <div className="grid grid-cols-1 gap-2 pt-2">
              <button
                onClick={() => setVisibilityWarning(null)}
                className="p-3 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs font-mono text-left flex items-center justify-between"
              >
                <span>I was still working (Research / Deep Work)</span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
              </button>
              <button
                onClick={() => {
                  if (activeExecutionSession) {
                    FocusControlService.recordInterruption(activeExecutionSession.id, 'other', 'Tab hidden / unobservable');
                  }
                  setVisibilityWarning(null);
                }}
                className="p-3 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs font-mono text-left flex items-center justify-between"
              >
                <span>I got distracted</span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
              </button>
              <button
                onClick={() => setVisibilityWarning(null)}
                className="p-3 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs font-mono text-left flex items-center justify-between"
              >
                <span>I took a scheduled break</span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
