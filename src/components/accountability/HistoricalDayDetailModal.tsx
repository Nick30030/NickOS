import React from 'react';
import { DailyAccountabilityRecord } from '../../types/domain';
import { X, ShieldCheck, Clock, AlertTriangle, CheckCircle2, XCircle, ArrowRight, Ban, HelpCircle, Calendar } from 'lucide-react';
import { formatMinutesToHours } from '../../lib/utils';

interface HistoricalDayDetailModalProps {
  record: DailyAccountabilityRecord | null;
  onClose: () => void;
  onReopen?: (date: string) => void;
}

export const HistoricalDayDetailModal: React.FC<HistoricalDayDetailModalProps> = ({
  record,
  onClose,
  onReopen,
}) => {
  if (!record) return null;

  const executionPercentage = Math.round(record.executionRate * 100);
  const timePercentage = Math.round(record.timeExecutionRatio * 100);

  const getClassificationBadge = (classification: string) => {
    switch (classification) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'partially_completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> Partial
          </span>
        );
      case 'postponed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <ArrowRight className="w-3 h-3" /> Postponed
          </span>
        );
      case 'abandoned':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Ban className="w-3 h-3" /> Abandoned
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            <AlertTriangle className="w-3 h-3" /> Blocked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
            <HelpCircle className="w-3 h-3" /> Not Started
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-neutral-100 font-mono">
                  Accountability Audit: {record.date}
                </h3>
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                    record.isFinalized
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {record.isFinalized ? 'Finalized Snapshot' : 'Draft In Progress'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                {record.finalizedAt
                  ? `Sealed at ${new Date(record.finalizedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Unsealed record'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 rounded-lg hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] font-mono uppercase text-neutral-400">Execution Rate</span>
              <div className="text-xl font-mono font-bold text-neutral-100 mt-1">
                {executionPercentage}%
              </div>
              <span className="text-[11px] text-neutral-400 font-mono">
                {record.completedTasks} / {record.plannedTasks} commitments
              </span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] font-mono uppercase text-neutral-400">Time Ratio</span>
              <div className="text-xl font-mono font-bold text-neutral-100 mt-1">
                {timePercentage}%
              </div>
              <span className="text-[11px] text-neutral-400 font-mono">
                {record.actualMinutes}m / {record.plannedMinutes}m
              </span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] font-mono uppercase text-neutral-400">Interruptions</span>
              <div className="text-xl font-mono font-bold text-neutral-100 mt-1">
                {record.interruptionCount}
              </div>
              <span className="text-[11px] text-neutral-400 font-mono">
                {record.totalPauseMinutes}m paused
              </span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] font-mono uppercase text-neutral-400">Postponed / Blocked</span>
              <div className="text-xl font-mono font-bold text-neutral-100 mt-1">
                {record.postponedTasks + record.blockedTasks}
              </div>
              <span className="text-[11px] text-neutral-400 font-mono">
                {record.postponedTasks} postponed, {record.blockedTasks} blocked
              </span>
            </div>
          </div>

          {/* Reconciled Commitments Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase text-neutral-300 tracking-wider">
              Commitment Reconciliation ({record.reconciledCommitments?.length || 0})
            </h4>

            {(!record.reconciledCommitments || record.reconciledCommitments.length === 0) ? (
              <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 text-center text-xs text-neutral-400 font-mono">
                No commitments recorded for this day.
              </div>
            ) : (
              <div className="space-y-2">
                {record.reconciledCommitments.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-neutral-950 border border-neutral-850 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-neutral-100 truncate">{item.taskTitle}</span>
                          {item.projectName && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                              {item.projectName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400">
                          <span>Planned: {item.plannedMinutes}m</span>
                          <span>•</span>
                          <span>Actual: {item.actualMinutes}m</span>
                          {item.concreteOutcome && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400 truncate">Deliverable: {item.concreteOutcome}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div>{getClassificationBadge(item.classification)}</div>
                    </div>

                    {item.reasonCategory && (
                      <div className="pt-2 border-t border-neutral-850 flex items-start gap-2 text-[11px] font-mono text-neutral-400">
                        <span className="text-amber-400 font-semibold uppercase">Reason: [{item.reasonCategory}]</span>
                        {item.reasonDetails && <span className="text-neutral-300">{item.reasonDetails}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* External Blockers */}
          {record.externalBlockers && record.externalBlockers.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase text-red-400 tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                External Blockers Encountered ({record.externalBlockers.length})
              </h4>
              <div className="space-y-2">
                {record.externalBlockers.map(b => (
                  <div
                    key={b.id}
                    className="p-3 rounded-lg bg-red-950/20 border border-red-500/30 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase font-bold text-red-400">
                        [{b.category.replace('_', ' ')}] • {b.severity}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {new Date(b.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-neutral-200">{b.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Concrete Deliverables */}
          {record.concreteOutputs && record.concreteOutputs.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tangible Outputs Produced ({record.concreteOutputs.length})
              </h4>
              <ul className="space-y-1.5">
                {record.concreteOutputs.map((out, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 p-2 rounded bg-neutral-950 border border-neutral-850 text-xs text-neutral-200"
                  >
                    <span className="text-emerald-400 font-mono">✓</span>
                    <span>{out}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notes */}
          {record.notes && (
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase text-neutral-400 tracking-wider">
                Daily Reflection & Operational Notes
              </h4>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
                {record.notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-800 bg-neutral-900/50">
          <div className="text-[11px] font-mono text-neutral-400">
            {record.isFinalized ? 'Record is sealed.' : 'Record is active/unfinalized.'}
          </div>

          <div className="flex items-center gap-2">
            {record.isFinalized && onReopen && (
              <button
                type="button"
                onClick={() => {
                  onReopen(record.date);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-medium cursor-pointer"
              >
                Reopen for Corrections
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
