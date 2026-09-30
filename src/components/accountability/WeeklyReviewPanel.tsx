import React, { useState, useMemo } from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { DailyAccountabilityRecord } from '../../types/domain';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  BarChart3,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { getTodayString } from '../../lib/utils';

interface WeeklyReviewPanelProps {
  onSelectDateForReview: (date: string) => void;
}

export const WeeklyReviewPanel: React.FC<WeeklyReviewPanelProps> = ({
  onSelectDateForReview,
}) => {
  const { accountabilityRecords, getWeeklyAggregate } = useExecution();

  // Determine current week start (Monday) and end (Sunday)
  const today = getTodayString();
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const { startOfWeekStr, endOfWeekStr, weekDays } = useMemo(() => {
    const d = new Date(today);
    const day = d.getDay();
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1) + weekOffset * 7;
    
    const monday = new Date(d.setDate(diffToMonday));
    const days: string[] = [];
    
    for (let i = 0; i < 7; i++) {
      const temp = new Date(monday);
      temp.setDate(monday.getDate() + i);
      days.push(temp.toISOString().substring(0, 10));
    }

    return {
      startOfWeekStr: days[0],
      endOfWeekStr: days[6],
      weekDays: days,
    };
  }, [today, weekOffset]);

  const aggregate = useMemo(() => {
    return getWeeklyAggregate(startOfWeekStr, endOfWeekStr);
  }, [getWeeklyAggregate, startOfWeekStr, endOfWeekStr, accountabilityRecords]);

  // Aggregate execution percentage
  const avgExecutionRate = Math.round((aggregate.overallExecutionRate || 0) * 100);
  const totalPlannedHours = ((aggregate.totalPlannedMinutes || 0) / 60).toFixed(1);
  const totalActualHours = ((aggregate.totalActualMinutes || 0) / 60).toFixed(1);
  const timeRatioPercent = (aggregate.totalPlannedMinutes || 0) > 0
    ? Math.round(((aggregate.totalActualMinutes || 0) / aggregate.totalPlannedMinutes) * 100)
    : 0;

  const finalizedCount = aggregate.dailyBreakdown
    ? aggregate.dailyBreakdown.filter(d => d.isFinalized).length
    : (aggregate.finalizedDaysCount || 0);

  const daysRecorded = aggregate.dailyBreakdown
    ? aggregate.dailyBreakdown.filter(d => d.planned > 0 || d.actualMinutes > 0).length
    : 0;

  // Day Name Helper
  const getDayLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Week Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-100 font-mono">
              Weekly Execution Accountability
            </h2>
            <p className="text-xs text-neutral-400 font-mono">
              Aggregate verification from {startOfWeekStr} to {endOfWeekStr}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekOffset(prev => prev - 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Previous Week
          </button>

          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-xs font-mono font-medium cursor-pointer"
            >
              Current Week
            </button>
          )}

          <button
            type="button"
            onClick={() => setWeekOffset(prev => prev + 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono cursor-pointer"
          >
            Next Week <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Aggregate Scorecards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-[11px] font-mono uppercase text-neutral-400">Weekly Execution Rate</span>
          <div className="text-2xl font-mono font-bold text-neutral-100 mt-2">
            {avgExecutionRate}%
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            {aggregate.totalCompletedCommitments} / {aggregate.totalPlannedCommitments} commitments fulfilled
          </span>
          <div className="mt-2 w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, avgExecutionRate)}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-[11px] font-mono uppercase text-neutral-400">Verified Work Hours</span>
          <div className="text-2xl font-mono font-bold text-neutral-100 mt-2">
            {totalActualHours}h
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            Planned: {totalPlannedHours}h ({timeRatioPercent}% ratio)
          </span>
          <div className="mt-2 w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-sky-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, timeRatioPercent)}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-[11px] font-mono uppercase text-neutral-400">Days Sealed / Finalized</span>
          <div className="text-2xl font-mono font-bold text-neutral-100 mt-2">
            {finalizedCount}{' '}
            <span className="text-xs text-neutral-400 font-normal">/ {daysRecorded} recorded</span>
          </div>
          <p className="text-[11px] text-neutral-400 font-mono mt-1">
            {daysRecorded === 0 ? 'No logs this week' : `${7 - finalizedCount} unsealed`}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-[11px] font-mono uppercase text-neutral-400">Weekly Disruptions</span>
          <div className="text-2xl font-mono font-bold text-neutral-100 mt-2">
            {aggregate.totalInterruptions}{' '}
            <span className="text-xs text-neutral-400 font-normal">interruptions</span>
          </div>
          <p className="text-[11px] text-neutral-400 font-mono mt-1">
            {aggregate.totalPostponedCommitments} postponed, {aggregate.totalAbandonedCommitments} abandoned
          </p>
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
        <h3 className="text-sm font-bold text-neutral-100 font-mono">
          Day-by-Day Execution Breakdown
        </h3>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs font-mono border-collapse min-w-[700px] sm:min-w-full">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 uppercase text-[10px]">
                <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Commitments</th>
                <th className="py-2.5 px-3">Rate</th>
                <th className="py-2.5 px-3">Actual Time</th>
                <th className="py-2.5 px-3">Interruptions</th>
                <th className="py-2.5 px-3">Deliverables</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-850">
              {weekDays.map(dateStr => {
                const rec = accountabilityRecords.find(r => r.date === dateStr);
                const isToday = dateStr === today;
                const executionPercent = rec ? Math.round(rec.executionRate * 100) : 0;

                return (
                  <tr
                    key={dateStr}
                    className={`hover:bg-neutral-850/50 transition-colors ${
                      isToday ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-semibold text-neutral-100 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{getDayLabel(dateStr)}</span>
                        {isToday && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] shrink-0">
                            Today
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {rec ? (
                        rec.isFinalized ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                            <ShieldCheck className="w-3 h-3" /> Finalized
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                            Draft
                          </span>
                        )
                      ) : (
                        <span className="text-neutral-400 text-[11px] whitespace-nowrap">No Record</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-neutral-300 whitespace-nowrap">
                      {rec ? `${rec.completedTasks} / ${rec.plannedTasks}` : '—'}
                    </td>

                    <td className="py-3 px-3">
                      {rec ? (
                        <span
                          className={`font-bold ${
                            executionPercent >= 75
                              ? 'text-emerald-400'
                              : executionPercent >= 50
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {executionPercent}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3 px-3 text-neutral-300 whitespace-nowrap">
                      {rec ? `${rec.actualMinutes}m` : '0m'}
                    </td>

                    <td className="py-3 px-3 text-neutral-400 whitespace-nowrap">
                      {rec ? `${rec.interruptionCount}` : '0'}
                    </td>

                    <td className="py-3 px-3 text-neutral-300 min-w-[120px]">
                      {rec?.concreteOutputs && rec.concreteOutputs.length > 0 ? (
                        <span className="text-emerald-400 break-words line-clamp-1">
                          {rec.concreteOutputs.length} artifact(s)
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectDateForReview(dateStr)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs cursor-pointer"
                      >
                        <span>Reconcile</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Missed Reasons & Project Time Distribution Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reasons for Missed Commitments */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <h3 className="text-sm font-bold text-neutral-100 font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Root Causes of Non-Execution
          </h3>
          <p className="text-xs text-neutral-400">
            Factual distribution of reasons logged when commitments were missed or postponed.
          </p>

          {Object.keys(aggregate.reasonCategoriesCount || {}).length === 0 ? (
            <div className="p-6 rounded-lg bg-neutral-950 border border-neutral-850 text-center text-xs text-neutral-400 font-mono">
              No missed commitment reasons logged for this week.
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(aggregate.reasonCategoriesCount || {}).map(([reason, count]) => (
                <div
                  key={reason}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950 border border-neutral-850 text-xs"
                >
                  <span className="font-mono text-neutral-200 capitalize">
                    {reason.replace(/_/g, ' ')}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-mono font-bold">
                    {count} occurrence(s)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Energy Allocation by Project */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <h3 className="text-sm font-bold text-neutral-100 font-mono flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            Energy Allocation by Project
          </h3>
          <p className="text-xs text-neutral-400">
            Factual minutes allocated across active projects this week.
          </p>

          {!aggregate.projectTimeDistribution || aggregate.projectTimeDistribution.length === 0 ? (
            <div className="p-6 rounded-lg bg-neutral-950 border border-neutral-850 text-center text-xs text-neutral-400 font-mono">
              No project minutes recorded for this week.
            </div>
          ) : (
            <div className="space-y-2">
              {aggregate.projectTimeDistribution.map(p => {
                const totalMins = aggregate.totalActualMinutes || 1;
                const percentage = Math.round((p.actualMinutes / totalMins) * 100);

                return (
                  <div
                    key={p.projectId}
                    className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-850 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-medium text-neutral-200">{p.projectName}</span>
                      <span className="text-sky-400 font-bold">{p.actualMinutes}m ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
