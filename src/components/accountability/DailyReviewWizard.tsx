import React, { useState } from 'react';
import { useExecution } from '../../context/ExecutionContext';
import {
  DailyAccountabilityRecord,
  ReconciledCommitment,
  CommitmentClassification,
  MissedReasonCategory,
  ExternalBlockerRecord,
} from '../../types/domain';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Ban,
  AlertTriangle,
  HelpCircle,
  Plus,
  Trash2,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Save,
  FileCheck,
} from 'lucide-react';
import { getTodayString } from '../../lib/utils';

interface DailyReviewWizardProps {
  currentRecord: DailyAccountabilityRecord | null;
  onDateChange: (date: string) => void;
}

const CLASSIFICATION_OPTIONS: { id: CommitmentClassification; label: string; icon: any; color: string }[] = [
  { id: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'partially_completed', label: 'Partially Done', icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'postponed', label: 'Postponed', icon: ArrowRight, color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
  { id: 'abandoned', label: 'Abandoned', icon: Ban, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  { id: 'blocked', label: 'Blocked', icon: AlertTriangle, color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  { id: 'not_started', label: 'Not Started', icon: HelpCircle, color: 'text-neutral-400 bg-neutral-800 border-neutral-700' },
];

const REASON_CATEGORIES: { id: MissedReasonCategory; label: string }[] = [
  { id: 'underestimated', label: 'Underestimated scope/time' },
  { id: 'poor_planning', label: 'Poor schedule/sequencing' },
  { id: 'distracted', label: 'Internal distraction / loss of focus' },
  { id: 'blocked', label: 'Blocked by dependency' },
  { id: 'external_interruption', label: 'Unplanned urgent demand' },
  { id: 'changed_priorities', label: 'Conscious priority shift' },
  { id: 'other', label: 'Other circumstance' },
];

export const DailyReviewWizard: React.FC<DailyReviewWizardProps> = ({
  currentRecord,
  onDateChange,
}) => {
  const {
    reconcileCommitment,
    recordExternalBlocker,
    deleteExternalBlocker,
    addConcreteOutput,
    removeConcreteOutput,
    updateDailyNotes,
    finalizeDay,
    reopenDay,
  } = useExecution();

  const today = getTodayString();
  const activeDate = currentRecord?.date || today;

  const [notes, setNotes] = useState(currentRecord?.notes || '');
  const [newOutput, setNewOutput] = useState('');
  const [isAddingBlocker, setIsAddingBlocker] = useState(false);
  const [blockerCategory, setBlockerCategory] = useState<ExternalBlockerRecord['category']>('external_dependency');
  const [blockerSeverity, setBlockerSeverity] = useState<ExternalBlockerRecord['severity']>('major_delay');
  const [blockerDescription, setBlockerDescription] = useState('');
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Synchronize local notes when record changes
  React.useEffect(() => {
    if (currentRecord?.notes !== undefined) {
      setNotes(currentRecord.notes);
    }
  }, [currentRecord?.date, currentRecord?.notes]);

  const handlePrevDay = () => {
    const d = new Date(activeDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().substring(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(activeDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().substring(0, 10));
  };

  const handleToday = () => {
    onDateChange(today);
  };

  const handleClassificationChange = (taskId: string, classification: CommitmentClassification) => {
    if (currentRecord?.isFinalized) return;
    reconcileCommitment(taskId, { classification }, activeDate);
  };

  const handleReasonChange = (taskId: string, reasonCategory: MissedReasonCategory) => {
    if (currentRecord?.isFinalized) return;
    reconcileCommitment(taskId, { reasonCategory }, activeDate);
  };

  const handleReasonDetailsChange = (taskId: string, reasonDetails: string) => {
    if (currentRecord?.isFinalized) return;
    reconcileCommitment(taskId, { reasonDetails }, activeDate);
  };

  const handleOutcomeChange = (taskId: string, concreteOutcome: string) => {
    if (currentRecord?.isFinalized) return;
    reconcileCommitment(taskId, { concreteOutcome }, activeDate);
  };

  const handleAddOutput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutput.trim() || currentRecord?.isFinalized) return;
    addConcreteOutput(newOutput.trim(), activeDate);
    setNewOutput('');
  };

  const handleCreateBlocker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockerDescription.trim() || currentRecord?.isFinalized) return;
    recordExternalBlocker(
      {
        category: blockerCategory,
        severity: blockerSeverity,
        description: blockerDescription.trim(),
      },
      activeDate
    );
    setBlockerDescription('');
    setIsAddingBlocker(false);
  };

  const handleSaveNotes = () => {
    updateDailyNotes(notes, activeDate);
  };

  const handleFinalizeClick = () => {
    // Validate that all commitments have been addressed
    if (!currentRecord) return;
    const unaddressed = currentRecord.reconciledCommitments.filter(
      c => c.classification === 'not_started' && !c.reasonCategory
    );

    if (unaddressed.length > 0) {
      setValidationError(
        `Please classify or provide reasons for ${unaddressed.length} unstarted commitment(s) before finalizing.`
      );
      return;
    }

    setValidationError(null);
    setShowFinalizeConfirm(true);
  };

  const handleConfirmFinalize = async () => {
    await finalizeDay(notes, activeDate);
    setShowFinalizeConfirm(false);
  };

  const handleReopen = async () => {
    await reopenDay(activeDate);
  };

  const isFinalized = currentRecord?.isFinalized || false;
  const executionPercent = currentRecord ? Math.round(currentRecord.executionRate * 100) : 0;
  const timePercent = currentRecord ? Math.round(currentRecord.timeExecutionRatio * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Date Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-100 font-mono">
                Daily Execution Reconciliation
              </h2>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                  isFinalized
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}
              >
                {isFinalized ? 'Finalized & Sealed' : 'Active Draft'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-mono">
              Factual audit of commitments, actual minutes, interruptions, and external blockers.
            </p>
          </div>
        </div>

        {/* Date Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-200">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <input
              type="date"
              value={activeDate}
              onChange={e => onDateChange(e.target.value)}
              className="bg-transparent border-none text-xs font-mono text-neutral-100 focus:outline-hidden cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={handleNextDay}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {activeDate !== today && (
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-xs font-mono font-medium cursor-pointer"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Factual Performance Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase text-neutral-400">
            <span>Commitment Execution</span>
            <span className="text-amber-400">{executionPercent}%</span>
          </div>
          <div className="text-2xl font-mono font-bold text-neutral-100 mt-2">
            {currentRecord?.completedTasks || 0}{' '}
            <span className="text-xs text-neutral-400 font-normal">
              / {currentRecord?.plannedTasks || 0} completed
            </span>
          </div>
          <div className="mt-2 w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, executionPercent)}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase text-neutral-400">
            <span>Time Execution Ratio</span>
            <span className="text-sky-400">{timePercent}%</span>
          </div>
          <div className="text-2xl font-mono font-bold text-neutral-100 mt-2">
            {currentRecord?.actualMinutes || 0}m{' '}
            <span className="text-xs text-neutral-400 font-normal">
              / {currentRecord?.plannedMinutes || 0}m planned
            </span>
          </div>
          <div className="mt-2 w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-sky-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, timePercent)}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase text-neutral-400">
            <span>Friction & Distraction</span>
            <span className="text-rose-400">Signals</span>
          </div>
          <div className="text-2xl font-mono font-bold text-neutral-100 mt-2">
            {currentRecord?.interruptionCount || 0}{' '}
            <span className="text-xs text-neutral-400 font-normal">interruptions</span>
          </div>
          <p className="text-[11px] text-neutral-400 font-mono mt-1">
            {currentRecord?.totalPauseMinutes || 0}m total paused
          </p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase text-neutral-400">
            <span>External Blockers</span>
            <span className="text-red-400">Friction</span>
          </div>
          <div className="text-2xl font-mono font-bold text-neutral-100 mt-2">
            {currentRecord?.externalBlockers?.length || 0}{' '}
            <span className="text-xs text-neutral-400 font-normal">logged</span>
          </div>
          <p className="text-[11px] text-neutral-400 font-mono mt-1">
            {currentRecord?.postponedTasks || 0} postponed, {currentRecord?.blockedTasks || 0} blocked
          </p>
        </div>
      </div>

      {/* Validation Banner if any */}
      {validationError && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Commitment Reconciliation Protocol Section */}
      <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-100 font-mono">
              1. Commitment Reconciliation Protocol
            </h3>
            <p className="text-xs text-neutral-400">
              Account factually for every task planned today. Classify outcomes and assign concrete causes.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {currentRecord?.reconciledCommitments?.length || 0} item(s)
          </span>
        </div>

        {(!currentRecord?.reconciledCommitments || currentRecord.reconciledCommitments.length === 0) ? (
          <div className="p-8 rounded-lg bg-neutral-950 border border-neutral-850 text-center space-y-2">
            <p className="text-xs font-mono text-neutral-400">
              No planned tasks recorded in today's day plan.
            </p>
            <p className="text-[11px] text-neutral-400 font-mono">
              Plan tasks in the Today or Tasks view, then return here to reconcile.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentRecord.reconciledCommitments.map((commitment, idx) => {
              const isDone = commitment.classification === 'completed';

              return (
                <div
                  key={commitment.taskId || idx}
                  className={`p-4 rounded-xl border transition-all ${
                    isDone
                      ? 'bg-neutral-950/70 border-emerald-500/20'
                      : 'bg-neutral-950 border-neutral-800'
                  }`}
                >
                  {/* Task Header & Classification Selector */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-neutral-100">
                          {commitment.taskTitle}
                        </span>
                        {commitment.projectName && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                            {commitment.projectName}
                          </span>
                        )}
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {commitment.commitmentLevel.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono text-neutral-400">
                        <span>Planned: {commitment.plannedMinutes}m</span>
                        <span>•</span>
                        <span className={commitment.actualMinutes > 0 ? 'text-amber-400' : ''}>
                          Actual Tracked: {commitment.actualMinutes}m
                        </span>
                        {commitment.actualMinutes > 0 && commitment.plannedMinutes > 0 && (
                          <span>
                            ({Math.round((commitment.actualMinutes / commitment.plannedMinutes) * 100)}% time)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Classification Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {CLASSIFICATION_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        const isSelected = commitment.classification === opt.id;

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={isFinalized}
                            onClick={() => handleClassificationChange(commitment.taskId, opt.id)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer disabled:cursor-not-allowed ${
                              isSelected
                                ? opt.color + ' font-bold ring-1 ring-amber-500/40'
                                : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-400 border border-neutral-800'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* If not fully completed, prompt for cause / reflection */}
                  {!isDone && (
                    <div className="mt-3 pt-3 border-t border-neutral-850 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                          Primary Cause / Reason Category
                        </label>
                        <select
                          disabled={isFinalized}
                          value={commitment.reasonCategory || ''}
                          onChange={e =>
                            handleReasonChange(commitment.taskId, e.target.value as MissedReasonCategory)
                          }
                          className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-200 focus:outline-hidden focus:border-amber-500 disabled:opacity-60"
                        >
                          <option value="">-- Select Root Cause --</option>
                          {REASON_CATEGORIES.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                          Context / Note on Missed Execution
                        </label>
                        <input
                          type="text"
                          disabled={isFinalized}
                          value={commitment.reasonDetails || ''}
                          onChange={e => handleReasonDetailsChange(commitment.taskId, e.target.value)}
                          placeholder="e.g. Scope doubled when inspecting database schema"
                          className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-hidden focus:border-amber-500 disabled:opacity-60"
                        />
                      </div>
                    </div>
                  )}

                  {/* Concrete deliverable produced */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase text-neutral-400 shrink-0">
                      Deliverable Produced:
                    </span>
                    <input
                      type="text"
                      disabled={isFinalized}
                      value={commitment.concreteOutcome || ''}
                      onChange={e => handleOutcomeChange(commitment.taskId, e.target.value)}
                      placeholder="e.g. Completed initial data migration script"
                      className="flex-1 px-2.5 py-1 rounded bg-neutral-900/60 border border-neutral-850 text-xs text-neutral-300 placeholder:text-neutral-600 focus:outline-hidden focus:border-amber-500 disabled:opacity-60"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* External Blockers Register Section */}
      <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-100 font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              2. External Blockers & Disruptions
            </h3>
            <p className="text-xs text-neutral-400">
              Distinguish between "did not execute" and "could not execute" due to external dependencies or outages.
            </p>
          </div>

          {!isFinalized && !isAddingBlocker && (
            <button
              type="button"
              onClick={() => setIsAddingBlocker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Log External Blocker
            </button>
          )}
        </div>

        {/* Add Blocker Form */}
        {isAddingBlocker && (
          <form onSubmit={handleCreateBlocker} className="p-4 rounded-xl bg-neutral-950 border border-red-500/30 space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase text-red-400">Record External Inability to Execute</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">Category</label>
                <select
                  value={blockerCategory}
                  onChange={e => setBlockerCategory(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-200"
                >
                  <option value="external_dependency">External Dependency / Third-party blocker</option>
                  <option value="system_outage">System Outage / Infra Failure</option>
                  <option value="urgent_external_request">Urgent External Interruption</option>
                  <option value="health_emergency">Physical / Health Emergency</option>
                  <option value="environment">Environment / Power / Network Disruption</option>
                  <option value="other">Other External Barrier</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">Severity</label>
                <select
                  value={blockerSeverity}
                  onChange={e => setBlockerSeverity(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-200"
                >
                  <option value="blocking">Complete Roadblock (Zero execution possible)</option>
                  <option value="major_delay">Major Delay (&gt;1 hour impacted)</option>
                  <option value="minor">Minor Delay (&lt;30m impacted)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">Factual Description</label>
              <textarea
                rows={2}
                value={blockerDescription}
                onChange={e => setBlockerDescription(e.target.value)}
                placeholder="Factual details on what blocked execution..."
                className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-hidden focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingBlocker(false)}
                className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!blockerDescription.trim()}
                className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                Record Blocker
              </button>
            </div>
          </form>
        )}

        {/* Existing Blockers List */}
        {(!currentRecord?.externalBlockers || currentRecord.externalBlockers.length === 0) ? (
          <p className="text-xs font-mono text-neutral-400">
            No external blockers recorded for this date.
          </p>
        ) : (
          <div className="space-y-2">
            {currentRecord.externalBlockers.map(b => (
              <div
                key={b.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg bg-red-950/20 border border-red-500/30 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="font-bold uppercase text-red-400">[{b.category.replace('_', ' ')}]</span>
                    <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 text-[10px]">
                      {b.severity}
                    </span>
                    <span className="text-neutral-400 text-[10px]">
                      {new Date(b.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-neutral-200">{b.description}</p>
                </div>

                {!isFinalized && (
                  <button
                    type="button"
                    onClick={() => deleteExternalBlocker(b.id, activeDate)}
                    className="p-1 text-neutral-400 hover:text-rose-400 cursor-pointer"
                    title="Delete blocker"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tangible Outcomes / Concrete Output Produced */}
      <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-100 font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            3. Tangible Deliverables Produced
          </h3>
          <p className="text-xs text-neutral-400">
            List the concrete artifacts, commits, documents, or decisions Nick finished today.
          </p>
        </div>

        {!isFinalized && (
          <form onSubmit={handleAddOutput} className="flex gap-2">
            <input
              type="text"
              value={newOutput}
              onChange={e => setNewOutput(e.target.value)}
              placeholder="e.g. Shipped database migrations, sent investor memo..."
              className="flex-1 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-hidden focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!newOutput.trim()}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold cursor-pointer disabled:opacity-50"
            >
              Add Deliverable
            </button>
          </form>
        )}

        {(!currentRecord?.concreteOutputs || currentRecord.concreteOutputs.length === 0) ? (
          <p className="text-xs font-mono text-neutral-400">
            No deliverables logged yet for this date.
          </p>
        ) : (
          <ul className="space-y-2">
            {currentRecord.concreteOutputs.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950 border border-neutral-850 text-xs text-neutral-200"
              >
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold font-mono">✓</span>
                  <span>{item}</span>
                </div>
                {!isFinalized && (
                  <button
                    type="button"
                    onClick={() => removeConcreteOutput(idx, activeDate)}
                    className="p-1 text-neutral-400 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Daily Reflection & Executive Notes */}
      <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-100 font-mono">
              4. Daily Operational Notes & Reflection
            </h3>
            <p className="text-xs text-neutral-400">
              Direct, factual observations about energy, execution pace, or patterns.
            </p>
          </div>
          {!isFinalized && (
            <button
              type="button"
              onClick={handleSaveNotes}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Note
            </button>
          )}
        </div>

        <textarea
          rows={3}
          disabled={isFinalized}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={handleSaveNotes}
          placeholder="Factual notes on today's execution..."
          className="w-full p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-hidden focus:border-amber-500 disabled:opacity-75 leading-relaxed"
        />
      </div>

      {/* Finalize Day Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-neutral-900 border border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase text-neutral-300">
              Day Closure State:
            </span>
            <span
              className={`font-mono text-xs font-bold ${
                isFinalized ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {isFinalized ? 'SEALED & FINALIZED' : 'UNFINALIZED / OPEN'}
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            {isFinalized
              ? `Day was finalized at ${new Date(currentRecord?.finalizedAt || '').toLocaleString()}. Record is immutable unless reopened.`
              : 'Finalizing will compute final deterministic execution rates and lock the snapshot.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isFinalized ? (
            <button
              type="button"
              onClick={handleReopen}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono font-semibold cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              Reopen Day for Corrections
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalizeClick}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-mono font-bold shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              Finalize & Seal Today's Record
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Finalizing */}
      {showFinalizeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <Lock className="w-6 h-6" />
              <h3 className="text-base font-bold text-neutral-100 font-mono">
                Confirm Daily Closure ({activeDate})
              </h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              You are about to finalize this accountability record with an execution rate of{' '}
              <strong className="text-amber-400 font-mono">{executionPercent}%</strong> and{' '}
              <strong className="text-neutral-100 font-mono">{currentRecord?.actualMinutes || 0}m</strong> of verified work.
            </p>
            <p className="text-xs text-neutral-400 leading-relaxed font-mono">
              The record will be sealed as the immutable source of truth for this date.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFinalizeConfirm(false)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFinalize}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-mono font-bold cursor-pointer"
              >
                Confirm & Seal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
