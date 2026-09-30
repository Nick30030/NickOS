// ==============================================================================
// NICK OS — ANALYTICS COMMAND CENTER VIEW
// ==============================================================================

import React, { useState } from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { AnalyticsService, DateRangeFilter, AnalyticsFilterParams } from '../../services/analytics/AnalyticsService';
import { Card } from '../common/Card';
import { StatBox } from '../common/StatBox';
import { ProgressBar } from '../common/ProgressBar';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatMinutes, formatSecondsToTimer, formatFriendlyDate } from '../../lib/utils';
import { AdaptiveInsightsCard } from '../adaptive/AdaptiveInsightsCard';
import {
  BarChart3,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertCircle,
  Activity,
  History,
  AlertTriangle,
  Radio,
  Coffee,
  CheckCircle2,
  Filter,
  Download,
  Calendar,
  FolderKanban,
  Target,
  Layers,
  ChevronRight,
  HelpCircle,
  Zap
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { 
    tasks, 
    projects, 
    goals, 
    timeBlocks, 
    executionHistory, 
    accountabilityRecords, 
    metrics, 
    transparencyInsights 
  } = useExecution();

  // Filters State
  const [dateRange, setDateRange] = useState<DateRangeFilter>('7days');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'goals' | 'focus' | 'estimation' | 'blockers' | 'accountability'>('overview');

  const filterParams: AnalyticsFilterParams = {
    dateRange,
    projectId: selectedProjectId === 'all' ? undefined : selectedProjectId,
  };

  // Calculated Analytics via AnalyticsService
  const overview = AnalyticsService.calculateOverview(tasks, executionHistory, filterParams);
  const planningVsReality = AnalyticsService.calculatePlanningVsReality(tasks, projects, filterParams);
  const projectSummaries = AnalyticsService.calculateProjectAnalytics(projects, tasks, executionHistory);
  const goalSummaries = AnalyticsService.calculateGoalAnalytics(goals, projects, tasks);
  const focusSummary = AnalyticsService.calculateFocusAnalytics(executionHistory, filterParams);
  const estimationVariances = AnalyticsService.calculateEstimationAnalytics(tasks, projects, filterParams);
  const postponementSummary = AnalyticsService.calculatePostponementAnalytics(tasks);
  const blockerSummary = AnalyticsService.calculateBlockerAnalytics(tasks);
  const timeOfDayDist = AnalyticsService.calculateTimeOfDayAnalytics(timeBlocks, executionHistory);
  const projectAllocation = AnalyticsService.calculateProjectAllocation(projects, tasks, executionHistory);

  // CSV Export Handlers
  const handleExportTasks = () => {
    const rows = tasks.map(t => ({
      ID: t.id,
      Title: t.title,
      Status: t.status,
      Priority: t.priority,
      Commitment: t.commitmentLevel,
      EstimatedMins: t.estimatedMinutes,
      ActualMins: t.actualMinutes || 0,
      PostponeCount: t.postponeCount || 0,
      ProjectId: t.projectId || '',
      CreatedAt: t.createdAt || '',
    }));
    AnalyticsService.exportToCSV('nick_os_tasks_export.csv', rows);
  };

  const handleExportSessions = () => {
    const rows = executionHistory.map(s => ({
      SessionID: s.id,
      TaskID: s.taskId || '',
      Status: s.status,
      DurationMinutes: Math.round((s.durationSeconds || 0) / 60),
      PausesCount: s.pauses?.length || 0,
      StartTime: s.startTime || '',
    }));
    AnalyticsService.exportToCSV('nick_os_execution_sessions_export.csv', rows);
  };

  const handleExportAccountability = () => {
    const rows = accountabilityRecords.map(r => ({
      Date: r.date,
      ExecutionRate: r.executionRate,
      CompletedTasks: r.completedTasks,
      PlannedMinutes: r.plannedMinutes,
      ActualMinutes: r.actualMinutes,
      ReviewStatus: r.isFinalized ? 'Finalized' : 'Pending',
    }));
    AnalyticsService.exportToCSV('nick_os_accountability_export.csv', rows);
  };

  return (
    <div className="w-full overflow-hidden space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header & Global Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-neutral-800/80 w-full overflow-hidden">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100 flex items-center gap-2.5 break-words">
            <BarChart3 className="w-7 h-7 text-emerald-400 shrink-0" />
            Analytics Command Center
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-mono mt-1.5 leading-relaxed break-words">
            Factual execution telemetry, planning variance, project allocation, and behavioral memory audits.
          </p>
        </div>

        {/* Filter Controls & Export */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          {/* Date Range Selector */}
          <div className="flex items-center bg-neutral-950 rounded-xl border border-neutral-800 p-1">
            {(['today', '7days', '30days', 'all'] as DateRangeFilter[]).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3.5 py-1.5 rounded-lg text-xs capitalize transition-all cursor-pointer ${dateRange === range ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-neutral-400 hover:text-white'}`}
              >
                {range === '7days' ? 'Last 7 Days' : range === '30days' ? 'Last 30 Days' : range}
              </button>
            ))}
          </div>

          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-neutral-300 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* CSV Export Button */}
          <div className="relative group">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              className="border-neutral-800 bg-neutral-950 text-neutral-300 hover:bg-neutral-900 rounded-xl"
            >
              Export CSV
            </Button>
            <div className="absolute right-0 mt-1 w-48 bg-neutral-950 border border-neutral-800 rounded-xl shadow-xl py-1 hidden group-hover:block z-50">
              <button onClick={handleExportTasks} className="w-full text-left px-4 py-2 text-xs text-neutral-300 hover:bg-neutral-900 cursor-pointer">Export Tasks CSV</button>
              <button onClick={handleExportSessions} className="w-full text-left px-4 py-2 text-xs text-neutral-300 hover:bg-neutral-900 cursor-pointer">Export Sessions CSV</button>
              <button onClick={handleExportAccountability} className="w-full text-left px-4 py-2 text-xs text-neutral-300 hover:bg-neutral-900 cursor-pointer">Export Accountability CSV</button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 border-b border-neutral-800/80 font-mono text-xs">
        {[
          { id: 'overview', label: 'Overview & Variance', icon: BarChart3 },
          { id: 'projects', label: 'Project Analytics', icon: FolderKanban },
          { id: 'goals', label: 'Goal Alignment', icon: Target },
          { id: 'focus', label: 'Focus & Flow', icon: Activity },
          { id: 'estimation', label: 'Estimation Variance', icon: Clock },
          { id: 'blockers', label: 'Blockers & Friction', icon: AlertTriangle },
          { id: 'accountability', label: 'Accountability History', icon: History },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shrink-0 border cursor-pointer ${isActive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Adaptive Insights Card (Always visible at top of command center) */}
      <AdaptiveInsightsCard />

      {/* TAB CONTENT: OVERVIEW & VARIANCE */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox
              label="Execution Rate"
              value={`${overview.executionRate}%`}
              subValue={`${overview.completedCommitments} / ${overview.plannedCommitments} commitments`}
              icon={TrendingUp}
              highlight
            />
            <StatBox
              label="Planned vs Actual Time"
              value={formatMinutes(overview.actualExecutionMinutes)}
              subValue={`Planned: ${formatMinutes(overview.plannedExecutionMinutes)}`}
              icon={Clock}
            />
            <StatBox
              label="Postponed Commitments"
              value={`${overview.postponedCommitments}`}
              subValue={`${overview.abandonedCommitments} abandoned`}
              icon={AlertCircle}
            />
            <StatBox
              label="Time Execution Ratio"
              value={`${overview.timeExecutionRatio}x`}
              subValue={overview.timeExecutionRatio > 1 ? 'Running over schedule' : 'Within budget'}
              icon={Activity}
            />
          </div>

          {/* Planning vs Reality Detailed Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4 border border-neutral-850">
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
                Planning vs Reality Audit
              </h3>
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-900">
                  <span className="text-neutral-400">Commitments Planned</span>
                  <span className="font-bold text-white">{planningVsReality.commitments.planned}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-900">
                  <span className="text-neutral-400">Commitments Completed</span>
                  <span className="font-bold text-emerald-400">{planningVsReality.commitments.actual}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-900">
                  <span className="text-neutral-400">Execution Time Difference</span>
                  <span className={`font-bold ${planningVsReality.timeMinutes.difference >= 0 ? 'text-emerald-400' : 'text-emerald-400'}`}>
                    {planningVsReality.timeMinutes.difference >= 0 ? `+${formatMinutes(planningVsReality.timeMinutes.difference)}` : `-${formatMinutes(Math.abs(planningVsReality.timeMinutes.difference))}`}
                  </span>
                </div>
              </div>
            </Card>

            {/* Project Time Allocation Breakdown */}
            <Card className="p-6 space-y-4 border border-neutral-850">
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
                Project Time Allocation (%)
              </h3>
              <div className="space-y-3">
                {projectAllocation.length === 0 ? (
                  <div className="text-xs font-mono text-neutral-500 py-6 text-center">No active project time allocation recorded yet.</div>
                ) : (
                  projectAllocation.map(item => (
                    <div key={item.projectId} className="space-y-1 font-mono text-xs">
                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="font-bold">{item.projectName}</span>
                        <span>{formatMinutes(item.actualMinutes)} ({item.percentage}%)</span>
                      </div>
                      <ProgressBar value={item.percentage} max={100} variant="emerald" />
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Time-of-Day Execution Distribution */}
          <Card className="p-6 space-y-4 border border-neutral-850">
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
              Time-of-Day Execution Distribution
            </h3>
            {!timeOfDayDist.hasSufficientData ? (
              <div className="p-6 bg-neutral-950 rounded-xl border border-neutral-900 text-xs font-mono text-neutral-400 text-center">
                Not enough data yet. Complete at least 5 scheduled time blocks to establish reliable time-of-day execution trends.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-900 space-y-1">
                  <span className="text-neutral-500 uppercase">Morning (06:00 - 12:00)</span>
                  <div className="text-lg font-bold text-white">{formatMinutes(timeOfDayDist.morning.minutes)}</div>
                  <div className="text-[11px] text-neutral-400">{Math.round(timeOfDayDist.morning.ratio * 100)}% of total execution time</div>
                </div>
                <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-900 space-y-1">
                  <span className="text-neutral-500 uppercase">Afternoon (12:00 - 18:00)</span>
                  <div className="text-lg font-bold text-white">{formatMinutes(timeOfDayDist.afternoon.minutes)}</div>
                  <div className="text-[11px] text-neutral-400">{Math.round(timeOfDayDist.afternoon.ratio * 100)}% of total execution time</div>
                </div>
                <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-900 space-y-1">
                  <span className="text-neutral-500 uppercase">Evening (18:00 - 00:00)</span>
                  <div className="text-lg font-bold text-white">{formatMinutes(timeOfDayDist.evening.minutes)}</div>
                  <div className="text-[11px] text-neutral-400">{Math.round(timeOfDayDist.evening.ratio * 100)}% of total execution time</div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB CONTENT: PROJECTS */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
            Active Project Execution Audits ({projectSummaries.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectSummaries.map(proj => (
              <Card key={proj.projectId} className="p-5 space-y-4 border border-neutral-850">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-neutral-100 text-base">{proj.projectName}</h4>
                    <span className="text-[10px] font-mono uppercase text-neutral-400">Status: {proj.projectStatus} • Priority: {proj.priority}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-mono rounded ${proj.recentActivity ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-neutral-900 text-neutral-500'}`}>
                    {proj.recentActivity ? 'Active This Week' : 'Idle'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                  <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-900">
                    <span className="text-neutral-500 text-[10px] block">Planned Time</span>
                    <span className="font-bold text-white">{formatMinutes(proj.plannedMinutes)}</span>
                  </div>
                  <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-900">
                    <span className="text-neutral-500 text-[10px] block">Actual Time</span>
                    <span className="font-bold text-emerald-400">{formatMinutes(proj.actualMinutes)}</span>
                  </div>
                  <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-900">
                    <span className="text-neutral-500 text-[10px] block">Completed Tasks</span>
                    <span className="font-bold text-emerald-400">{proj.completedTasks}</span>
                  </div>
                  <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-900">
                    <span className="text-neutral-500 text-[10px] block">Overdue Tasks</span>
                    <span className="font-bold text-rose-400">{proj.overdueTasks}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: GOALS */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
            Goal Alignment & Task Completion Progress ({goalSummaries.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goalSummaries.map(goal => (
              <Card key={goal.goalId} className="p-5 space-y-4 border border-neutral-850">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-neutral-100 text-base">{goal.goalTitle}</h4>
                    <span className="text-[10px] font-mono uppercase text-neutral-400">Status: {goal.status}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">{goal.taskCompletionProgress}% Completed</span>
                </div>

                <div className="space-y-1">
                  <ProgressBar value={goal.taskCompletionProgress} max={100} variant="emerald" />
                </div>

                <div className="flex items-center justify-between pt-2 font-mono text-xs text-neutral-400 border-t border-neutral-900">
                  <span>Actual Time Invested: <strong className="text-white">{formatMinutes(goal.actualExecutionMinutes)}</strong></span>
                  <span>Upcoming Deadlines: <strong className="text-white">{goal.upcomingDeadlinesCount}</strong></span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: FOCUS & FLOW */}
      {activeTab === 'focus' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-850 space-y-1">
              <span className="text-neutral-500 text-[10px] uppercase">Total Focus Time</span>
              <div className="text-2xl font-bold text-emerald-400">{formatMinutes(focusSummary.totalFocusMinutes)}</div>
              <span className="text-neutral-500 text-[10px]">Across {focusSummary.focusSessionsCompleted} sessions</span>
            </div>
            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-850 space-y-1">
              <span className="text-neutral-500 text-[10px] uppercase">Average Session Duration</span>
              <div className="text-2xl font-bold text-white">{focusSummary.averageSessionMinutes}m</div>
              <span className="text-neutral-500 text-[10px]">Per completed focus block</span>
            </div>
            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-850 space-y-1">
              <span className="text-neutral-500 text-[10px] uppercase">Recorded Interruptions</span>
              <div className="text-2xl font-bold text-rose-400">{focusSummary.interruptionCount}</div>
              <span className="text-neutral-500 text-[10px]">{focusSummary.interruptionDurationMinutes}m total pause time</span>
            </div>
            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-850 space-y-1">
              <span className="text-neutral-500 text-[10px] uppercase">Context Switches</span>
              <div className="text-2xl font-bold text-blue-400">{focusSummary.contextSwitches}</div>
              <span className="text-neutral-500 text-[10px]">Project transitions</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ESTIMATION VARIANCE */}
      {activeTab === 'estimation' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
            Estimation vs Actual Duration Variance ({estimationVariances.length} completed tasks)
          </h3>
          <div className="space-y-2">
            {estimationVariances.length === 0 ? (
              <div className="p-6 bg-neutral-950 rounded-xl border border-neutral-850 text-xs font-mono text-neutral-500 text-center">
                No completed tasks with estimates yet.
              </div>
            ) : (
              estimationVariances.map(item => (
                <div key={item.id} className="p-4 bg-neutral-950 rounded-xl border border-neutral-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs w-full overflow-hidden">
                  <div className="min-w-0">
                    <span className="font-bold text-neutral-100 break-words">{item.title}</span>
                    <span className="text-[10px] text-neutral-500 block break-words">Project: {item.projectName} • Category: {item.category}</span>
                  </div>
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <span className="text-neutral-500 text-[10px] block">Estimated</span>
                      <span className="text-white font-bold">{item.estimatedMinutes}m</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[10px] block">Actual</span>
                      <span className="text-emerald-400 font-bold">{item.actualMinutes}m</span>
                    </div>
                    <div className="min-w-[80px]">
                      <span className="text-neutral-500 text-[10px] block">Variance</span>
                      <span className={`font-bold ${item.varianceMinutes > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {item.varianceMinutes > 0 ? `+${item.varianceMinutes}m` : `${item.varianceMinutes}m`}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: BLOCKERS & FRICTION */}
      {activeTab === 'blockers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4 border border-neutral-850">
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
                Recurring Blocker Categories
              </h3>
              <div className="space-y-3 font-mono text-xs">
                {blockerSummary.length === 0 ? (
                  <div className="text-neutral-500 py-4 text-center">No blockers logged.</div>
                ) : (
                  blockerSummary.map(b => (
                    <div key={b.category} className="p-3 bg-neutral-950 rounded-xl border border-neutral-900 flex items-center justify-between">
                      <span className="text-neutral-200">{b.category}</span>
                      <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded font-bold">
                        {b.count} occurrences
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-6 space-y-4 border border-neutral-850">
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
                Postponement Analytics
              </h3>
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-900">
                  <span className="text-neutral-400">Total Postponed Tasks</span>
                  <span className="font-bold text-white">{postponementSummary.totalPostponedTasks}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-900">
                  <span className="text-neutral-400">Repeated Postponements (≥2)</span>
                  <span className="font-bold text-rose-400">{postponementSummary.repeatedPostponementsCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-900">
                  <span className="text-neutral-400">Average Postpone Count</span>
                  <span className="font-bold text-emerald-400">{postponementSummary.averagePostponeCount}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ACCOUNTABILITY HISTORY */}
      {activeTab === 'accountability' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
            Accountability History ({accountabilityRecords.length} daily logs)
          </h3>
          <div className="space-y-3">
            {accountabilityRecords.length === 0 ? (
              <div className="p-6 bg-neutral-950 rounded-xl border border-neutral-850 text-xs font-mono text-neutral-500 text-center">
                No historical accountability logs recorded yet.
              </div>
            ) : (
              accountabilityRecords.map(rec => (
                <Card key={rec.id || rec.date} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs border border-neutral-850 w-full overflow-hidden">
                  <div className="min-w-0">
                    <span className="font-bold text-white text-sm break-all">{formatFriendlyDate(rec.date)}</span>
                    <span className="text-[10px] text-neutral-500 block mt-0.5 whitespace-nowrap">Completed Tasks: {rec.completedTasks}</span>
                  </div>
                  <div className="flex items-center gap-6 shrink-0 overflow-x-auto pb-1 sm:pb-0">
                    <div>
                      <span className="text-neutral-500 text-[10px] block">Execution Rate</span>
                      <span className="text-emerald-400 font-bold">{Math.round(rec.executionRate * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[10px] block">Time Logged</span>
                      <span className="text-emerald-400 font-bold">{formatMinutes(rec.actualMinutes)}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] shrink-0 ${rec.isFinalized ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-900 text-neutral-400'}`}>
                      {rec.isFinalized ? 'Finalized' : 'Pending'}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
