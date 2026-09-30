import React, { useState } from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { DailyAccountabilityRecord } from '../../types/domain';
import {
  ShieldCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Search,
  Filter,
  FileText,
} from 'lucide-react';
import { HistoricalDayDetailModal } from './HistoricalDayDetailModal';

interface HistoricalAuditListProps {
  onSelectDateForReview: (date: string) => void;
}

export const HistoricalAuditList: React.FC<HistoricalAuditListProps> = ({
  onSelectDateForReview,
}) => {
  const { accountabilityRecords, reopenDay } = useExecution();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFinalized, setFilterFinalized] = useState<'all' | 'finalized' | 'draft'>('all');
  const [selectedRecordForModal, setSelectedRecordForModal] = useState<DailyAccountabilityRecord | null>(null);

  // Filter records
  const filteredRecords = accountabilityRecords.filter(rec => {
    if (filterFinalized === 'finalized' && !rec.isFinalized) return false;
    if (filterFinalized === 'draft' && rec.isFinalized) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchesDate = rec.date.includes(q);
      const matchesNotes = rec.notes?.toLowerCase().includes(q);
      const matchesOutputs = rec.concreteOutputs?.some(o => o.toLowerCase().includes(q));
      const matchesCommitments = rec.reconciledCommitments?.some(c =>
        c.taskTitle.toLowerCase().includes(q) || c.projectName?.toLowerCase().includes(q)
      );
      return matchesDate || matchesNotes || matchesOutputs || matchesCommitments;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search dates, deliverables, tasks, or notes..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-neutral-400" />
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button
              type="button"
              onClick={() => setFilterFinalized('all')}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                filterFinalized === 'all'
                  ? 'bg-neutral-800 text-neutral-100 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              All ({accountabilityRecords.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterFinalized('finalized')}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                filterFinalized === 'finalized'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Finalized ({accountabilityRecords.filter(r => r.isFinalized).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterFinalized('draft')}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                filterFinalized === 'draft'
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Drafts ({accountabilityRecords.filter(r => !r.isFinalized).length})
            </button>
          </div>
        </div>
      </div>

      {/* Historical List */}
      {filteredRecords.length === 0 ? (
        <div className="p-12 rounded-xl bg-neutral-900 border border-neutral-800 text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-neutral-400 mx-auto" />
          <h3 className="text-sm font-bold text-neutral-300 font-mono">No Accountability Records Found</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto font-mono">
            {searchTerm
              ? 'No records matched your search query. Try clearing filters.'
              : 'As you plan and finalize days, historical audit snapshots will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map(rec => {
            const execPercent = Math.round(rec.executionRate * 100);
            const timePercent = Math.round(rec.timeExecutionRatio * 100);

            return (
              <div
                key={rec.id || rec.date}
                className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all space-y-3 w-full overflow-hidden break-words"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-base font-bold text-neutral-100 flex items-center gap-2 break-all">
                      <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                      {rec.date}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border shrink-0 ${
                        rec.isFinalized
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {rec.isFinalized ? 'Finalized Snapshot' : 'Draft In Progress'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedRecordForModal(rec)}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono cursor-pointer whitespace-nowrap"
                    >
                      <FileText className="w-3.5 h-3.5" /> Full Audit Snapshot
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectDateForReview(rec.date)}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-xs font-mono font-medium cursor-pointer whitespace-nowrap"
                    >
                      <span>Reconcile / Edit</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Scorecards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-850">
                  <div className="p-2 rounded bg-neutral-950 border border-neutral-850">
                    <span className="text-[10px] font-mono text-neutral-400">Execution Rate</span>
                    <div className="font-mono font-bold text-sm text-neutral-100">
                      {execPercent}% ({rec.completedTasks}/{rec.plannedTasks})
                    </div>
                  </div>

                  <div className="p-2 rounded bg-neutral-950 border border-neutral-850">
                    <span className="text-[10px] font-mono text-neutral-400">Tracked Time</span>
                    <div className="font-mono font-bold text-sm text-neutral-100">
                      {rec.actualMinutes}m / {rec.plannedMinutes}m ({timePercent}%)
                    </div>
                  </div>

                  <div className="p-2 rounded bg-neutral-950 border border-neutral-850">
                    <span className="text-[10px] font-mono text-neutral-400">Interruptions</span>
                    <div className="font-mono font-bold text-sm text-neutral-100">
                      {rec.interruptionCount} ({rec.totalPauseMinutes}m paused)
                    </div>
                  </div>

                  <div className="p-2 rounded bg-neutral-950 border border-neutral-850">
                    <span className="text-[10px] font-mono text-neutral-400">Blockers Logged</span>
                    <div className="font-mono font-bold text-sm text-neutral-100">
                      {rec.externalBlockers?.length || 0} external
                    </div>
                  </div>
                </div>

                {/* Deliverables snippet if any */}
                {rec.concreteOutputs && rec.concreteOutputs.length > 0 && (
                  <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] font-mono text-neutral-400 uppercase">Outputs:</span>
                    {rec.concreteOutputs.map((out, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-emerald-400 text-[11px] font-mono"
                      >
                        ✓ {out}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Snapshot Modal */}
      {selectedRecordForModal && (
        <HistoricalDayDetailModal
          record={selectedRecordForModal}
          onClose={() => setSelectedRecordForModal(null)}
          onReopen={async date => {
            await reopenDay(date);
          }}
        />
      )}
    </div>
  );
};
