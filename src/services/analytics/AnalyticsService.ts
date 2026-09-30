// ==============================================================================
// NICK OS — ADVANCED ANALYTICS & COMMAND CENTER SERVICE
// ==============================================================================

import { Task, DayPlan, TimeBlock, ExecutionSession, DailyAccountabilityRecord, Project, Goal } from '../../types/domain';

export type DateRangeFilter = 'today' | '7days' | '30days' | 'all' | 'custom';

export interface AnalyticsFilterParams {
  dateRange: DateRangeFilter;
  customStartDate?: string;
  customEndDate?: string;
  projectId?: string;
  goalId?: string;
  taskStatus?: string;
  executionStatus?: string;
}

export interface ExecutionOverviewMetrics {
  plannedCommitments: number;
  completedCommitments: number;
  unresolvedCommitments: number;
  postponedCommitments: number;
  abandonedCommitments: number;
  plannedExecutionMinutes: number;
  actualExecutionMinutes: number;
  executionRate: number; // percentage completed / planned
  timeExecutionRatio: number; // actual / planned time ratio
}

export interface PlanningVsRealityComparison {
  commitments: { planned: number; actual: number; difference: number };
  timeMinutes: { planned: number; actual: number; difference: number };
  tasksCount: { planned: number; completed: number; difference: number };
  projectsCount: { active: number; executing: number };
}

export interface ProjectAnalyticsSummary {
  projectId: string;
  projectName: string;
  projectStatus: string;
  priority: string;
  plannedMinutes: number;
  actualMinutes: number;
  completedTasks: number;
  remainingTasks: number;
  overdueTasks: number;
  postponedTasks: number;
  lastExecution: string | null;
  recentActivity: boolean;
}

export interface GoalAnalyticsSummary {
  goalId: string;
  goalTitle: string;
  status: string;
  linkedProjectIds: string[];
  taskCompletionProgress: number; // 0 - 100%
  actualExecutionMinutes: number;
  upcomingDeadlinesCount: number;
}

export interface FocusAnalyticsSummary {
  totalFocusMinutes: number;
  averageSessionMinutes: number;
  interruptionCount: number;
  interruptionDurationMinutes: number;
  contextSwitches: number;
  focusSessionsCompleted: number;
}

export interface EstimationVarianceRecord {
  id: string;
  title: string;
  projectName: string;
  category: string;
  estimatedMinutes: number;
  actualMinutes: number;
  varianceMinutes: number;
  accuracyRatio: number;
}

export interface PostponementAnalyticsSummary {
  totalPostponedTasks: number;
  repeatedPostponementsCount: number;
  averagePostponeCount: number;
  postponedItems: { id: string; title: string; postponeCount: number; reasons: string[] }[];
}

export interface BlockerCategorySummary {
  category: string;
  count: number;
  taskIds: string[];
}

export interface TimeOfDayDistribution {
  morning: { minutes: number; sessionCount: number; ratio: number };
  afternoon: { minutes: number; sessionCount: number; ratio: number };
  evening: { minutes: number; sessionCount: number; ratio: number };
  hasSufficientData: boolean;
}

export interface ProjectAllocationItem {
  projectId: string;
  projectName: string;
  actualMinutes: number;
  percentage: number;
}

export class AnalyticsService {
  
  /**
   * Filter tasks, sessions, and time blocks based on date range and filter parameters
   */
  public static filterByDateRange<T extends { createdAt?: string; date?: string; startTime?: string }>(
    items: T[],
    filter: AnalyticsFilterParams
  ): T[] {
    if (filter.dateRange === 'all') return items;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let cutoffDate = new Date();
    if (filter.dateRange === 'today') {
      cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filter.dateRange === '7days') {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (filter.dateRange === '30days') {
      cutoffDate.setDate(now.getDate() - 30);
    } else if (filter.dateRange === 'custom' && filter.customStartDate) {
      cutoffDate = new Date(filter.customStartDate);
    }

    return items.filter(item => {
      const itemDateStr = item.date || item.createdAt || item.startTime;
      if (!itemDateStr) return true;
      try {
        const itemDate = new Date(itemDateStr);
        if (filter.dateRange === 'today') {
          return itemDate.toISOString().split('T')[0] === todayStr;
        }
        return itemDate >= cutoffDate;
      } catch {
        return true;
      }
    });
  }

  /**
   * 1. Execution Overview
   */
  public static calculateOverview(
    tasks: Task[],
    sessions: ExecutionSession[],
    filter: AnalyticsFilterParams
  ): ExecutionOverviewMetrics {
    const filteredTasks = this.filterByDateRange(tasks, filter);
    const filteredSessions = this.filterByDateRange(sessions, filter);

    const plannedCommitments = filteredTasks.length;
    const completedCommitments = filteredTasks.filter(t => t.status === 'completed').length;
    const abandonedCommitments = filteredTasks.filter(t => t.status === 'abandoned').length;
    const postponedCommitments = filteredTasks.filter(t => (t.postponeCount || 0) > 0).length;
    const unresolvedCommitments = plannedCommitments - completedCommitments - abandonedCommitments;

    const plannedExecutionMinutes = filteredTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
    const actualExecutionMinutes = filteredTasks.reduce((sum, t) => {
      let act = t.actualMinutes || 0;
      if (!act) {
        const sList = filteredSessions.filter(s => s.taskId === t.id);
        act = Math.round(sList.reduce((sSum, s) => sSum + (s.durationSeconds || 0) / 60, 0));
      }
      return sum + act;
    }, 0);

    const executionRate = plannedCommitments > 0 ? (completedCommitments / plannedCommitments) * 100 : 0;
    const timeExecutionRatio = plannedExecutionMinutes > 0 ? actualExecutionMinutes / plannedExecutionMinutes : 1.0;

    return {
      plannedCommitments,
      completedCommitments,
      unresolvedCommitments,
      postponedCommitments,
      abandonedCommitments,
      plannedExecutionMinutes,
      actualExecutionMinutes,
      executionRate: Math.round(executionRate * 10) / 10,
      timeExecutionRatio: Math.round(timeExecutionRatio * 100) / 100,
    };
  }

  /**
   * 2. Planning vs Reality Comparison
   */
  public static calculatePlanningVsReality(
    tasks: Task[],
    projects: Project[],
    filter: AnalyticsFilterParams
  ): PlanningVsRealityComparison {
    const filteredTasks = this.filterByDateRange(tasks, filter);
    const plannedCommitments = filteredTasks.length;
    const completedTasks = filteredTasks.filter(t => t.status === 'completed').length;

    const plannedMins = filteredTasks.reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
    const actualMins = filteredTasks.reduce((s, t) => s + (t.actualMinutes || 0), 0);

    return {
      commitments: {
        planned: plannedCommitments,
        actual: completedTasks,
        difference: completedTasks - plannedCommitments,
      },
      timeMinutes: {
        planned: plannedMins,
        actual: actualMins,
        difference: actualMins - plannedMins,
      },
      tasksCount: {
        planned: plannedCommitments,
        completed: completedTasks,
        difference: completedTasks - plannedCommitments,
      },
      projectsCount: {
        active: projects.filter(p => p.status === 'active').length,
        executing: new Set(filteredTasks.map(t => t.projectId).filter(Boolean)).size,
      },
    };
  }

  /**
   * 3. Project Analytics Summary
   */
  public static calculateProjectAnalytics(
    projects: Project[],
    tasks: Task[],
    sessions: ExecutionSession[]
  ): ProjectAnalyticsSummary[] {
    const todayStr = new Date().toISOString().split('T')[0];

    return projects.map(proj => {
      const projTasks = tasks.filter(t => t.projectId === proj.id);
      const plannedMinutes = projTasks.reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
      const actualMinutes = projTasks.reduce((s, t) => {
        let act = t.actualMinutes || 0;
        if (!act) {
          const sList = sessions.filter(s => s.taskId === t.id);
          act = Math.round(sList.reduce((sum, s) => sum + (s.durationSeconds || 0) / 60, 0));
        }
        return s + act;
      }, 0);

      const completedTasks = projTasks.filter(t => t.status === 'completed').length;
      const remainingTasks = projTasks.filter(t => t.status !== 'completed' && t.status !== 'abandoned').length;
      const overdueTasks = projTasks.filter(t => t.deadline && t.deadline < todayStr && t.status !== 'completed').length;
      const postponedTasks = projTasks.filter(t => (t.postponeCount || 0) > 0).length;

      const taskUpdates = projTasks.map(t => t.updatedAt || t.createdAt).filter(Boolean).sort().reverse();
      const lastExecution = taskUpdates[0] || null;
      const recentActivity = lastExecution ? (new Date().getTime() - new Date(lastExecution).getTime()) < 7 * 24 * 3600 * 1000 : false;

      return {
        projectId: proj.id,
        projectName: proj.name,
        projectStatus: proj.status,
        priority: proj.priority,
        plannedMinutes,
        actualMinutes,
        completedTasks,
        remainingTasks,
        overdueTasks,
        postponedTasks,
        lastExecution,
        recentActivity,
      };
    });
  }

  /**
   * 4. Goal Analytics Summary
   */
  public static calculateGoalAnalytics(
    goals: Goal[],
    projects: Project[],
    tasks: Task[]
  ): GoalAnalyticsSummary[] {
    return goals.map(goal => {
      const linkedProjects = projects.filter(p => p.goalId === goal.id);
      const linkedProjectIds = linkedProjects.map(p => p.id);
      
      const goalTasks = tasks.filter(t => (t.projectId && linkedProjectIds.includes(t.projectId)) || t.goalId === goal.id);
      const completedTasks = goalTasks.filter(t => t.status === 'completed').length;
      const taskCompletionProgress = goalTasks.length > 0 ? Math.round((completedTasks / goalTasks.length) * 100) : 0;

      const actualExecutionMinutes = goalTasks.reduce((s, t) => s + (t.actualMinutes || 0), 0);
      const upcomingDeadlinesCount = goalTasks.filter(t => t.deadline && t.deadline >= new Date().toISOString().split('T')[0] && t.status !== 'completed').length;

      return {
        goalId: goal.id,
        goalTitle: goal.title,
        status: goal.status,
        linkedProjectIds,
        taskCompletionProgress,
        actualExecutionMinutes,
        upcomingDeadlinesCount,
      };
    });
  }

  /**
   * 5. Focus Analytics
   */
  public static calculateFocusAnalytics(sessions: ExecutionSession[], filter: AnalyticsFilterParams): FocusAnalyticsSummary {
    const filtered = this.filterByDateRange(sessions, filter);
    const totalFocusMinutes = Math.round(filtered.reduce((s, sess) => s + (sess.durationSeconds || 0) / 60, 0));
    const focusSessionsCompleted = filtered.filter(s => s.status === 'completed').length;
    const averageSessionMinutes = focusSessionsCompleted > 0 ? Math.round(totalFocusMinutes / focusSessionsCompleted) : 0;

    let interruptionCount = 0;
    let interruptionDurationSeconds = 0;
    let contextSwitches = 0;

    let lastTaskId = '';
    filtered.forEach(s => {
      if (s.pauses) {
        interruptionCount += s.pauses.length;
        interruptionDurationSeconds += s.pauses.reduce((pSum, p) => pSum + (p.durationSeconds || 0), 0);
      }
      if (s.taskId && s.taskId !== lastTaskId) {
        if (lastTaskId) contextSwitches++;
        lastTaskId = s.taskId;
      }
    });

    return {
      totalFocusMinutes,
      averageSessionMinutes,
      interruptionCount,
      interruptionDurationMinutes: Math.round(interruptionDurationSeconds / 60),
      contextSwitches,
      focusSessionsCompleted,
    };
  }

  /**
   * 6. Estimation Analytics
   */
  public static calculateEstimationAnalytics(tasks: Task[], projects: Project[], filter: AnalyticsFilterParams): EstimationVarianceRecord[] {
    const filtered = this.filterByDateRange(tasks, filter);
    const completed = filtered.filter(t => t.status === 'completed' && t.estimatedMinutes > 0);

    return completed.map(t => {
      const proj = projects.find(p => p.id === t.projectId);
      const actual = t.actualMinutes || t.estimatedMinutes;
      const variance = actual - t.estimatedMinutes;
      const accuracyRatio = t.estimatedMinutes > 0 ? actual / t.estimatedMinutes : 1.0;

      return {
        id: t.id,
        title: t.title,
        projectName: proj?.name || 'General',
        category: t.tags?.[0] || 'general',
        estimatedMinutes: t.estimatedMinutes,
        actualMinutes: actual,
        varianceMinutes: variance,
        accuracyRatio: Math.round(accuracyRatio * 100) / 100,
      };
    });
  }

  /**
   * 7. Postponement Analytics
   */
  public static calculatePostponementAnalytics(tasks: Task[]): PostponementAnalyticsSummary {
    const postponedTasks = tasks.filter(t => (t.postponeCount || 0) > 0);
    const repeated = postponedTasks.filter(t => (t.postponeCount || 0) >= 2);
    const totalCount = postponedTasks.reduce((s, t) => s + (t.postponeCount || 0), 0);
    const avg = postponedTasks.length > 0 ? totalCount / postponedTasks.length : 0;

    const items = postponedTasks.map(t => ({
      id: t.id,
      title: t.title,
      postponeCount: t.postponeCount || 0,
      reasons: t.postponeReason ? [t.postponeReason] : [],
    })).sort((a, b) => b.postponeCount - a.postponeCount);

    return {
      totalPostponedTasks: postponedTasks.length,
      repeatedPostponementsCount: repeated.length,
      averagePostponeCount: Math.round(avg * 10) / 10,
      postponedItems: items,
    };
  }

  /**
   * 8. Blocker Analytics
   */
  public static calculateBlockerAnalytics(tasks: Task[]): BlockerCategorySummary[] {
    const map: { [cat: string]: { count: number; tasks: string[] } } = {};

    tasks.forEach(t => {
      const reason = t.blockerReason || t.postponeReason;
      if (reason) {
        let cat = 'Other Obstacle';
        const l = reason.toLowerCase();
        if (l.includes('start') || l.includes('vague')) cat = 'Unclear starting point';
        else if (l.includes('tech') || l.includes('bug') || l.includes('code')) cat = 'Technical dependency';
        else if (l.includes('interrupt') || l.includes('slack') || l.includes('people')) cat = 'External interruption';
        else if (l.includes('info') || l.includes('spec')) cat = 'Lack of specification';
        else if (l.includes('fatigue') || l.includes('tired')) cat = 'Fatigue / Low energy';

        if (!map[cat]) map[cat] = { count: 0, tasks: [] };
        map[cat].count++;
        if (!map[cat].tasks.includes(t.id)) map[cat].tasks.push(t.id);
      }
    });

    return Object.entries(map).map(([category, data]) => ({
      category,
      count: data.count,
      taskIds: data.tasks,
    })).sort((a, b) => b.count - a.count);
  }

  /**
   * 9. Time-of-Day Analytics
   */
  public static calculateTimeOfDayAnalytics(timeBlocks: TimeBlock[], sessions: ExecutionSession[]): TimeOfDayDistribution {
    let morningMins = 0, morningCount = 0;
    let afternoonMins = 0, afternoonCount = 0;
    let eveningMins = 0, eveningCount = 0;

    timeBlocks.forEach(tb => {
      const startParts = (tb.startTime || '09:00').split(':');
      const startMin = (parseInt(startParts[0], 10) || 0) * 60 + (parseInt(startParts[1], 10) || 0);
      const endParts = (tb.endTime || '10:00').split(':');
      const endMin = (parseInt(endParts[0], 10) || 0) * 60 + (parseInt(endParts[1], 10) || 0);
      const duration = Math.max(0, endMin - startMin);

      if (startMin < 12 * 60) {
        morningMins += duration;
        morningCount++;
      } else if (startMin < 18 * 60) {
        afternoonMins += duration;
        afternoonCount++;
      } else {
        eveningMins += duration;
        eveningCount++;
      }
    });

    const totalMins = morningMins + afternoonMins + eveningMins;
    const hasSufficientData = totalMins >= 120 || timeBlocks.length >= 5;

    return {
      morning: { minutes: morningMins, sessionCount: morningCount, ratio: totalMins > 0 ? morningMins / totalMins : 0 },
      afternoon: { minutes: afternoonMins, sessionCount: afternoonCount, ratio: totalMins > 0 ? afternoonMins / totalMins : 0 },
      evening: { minutes: eveningMins, sessionCount: eveningCount, ratio: totalMins > 0 ? eveningMins / totalMins : 0 },
      hasSufficientData,
    };
  }

  /**
   * 10. Project Allocation Percentage Distribution
   */
  public static calculateProjectAllocation(projects: Project[], tasks: Task[], sessions: ExecutionSession[]): ProjectAllocationItem[] {
    let totalActual = 0;
    const allocations = projects.map(proj => {
      const projTasks = tasks.filter(t => t.projectId === proj.id);
      const actualMinutes = projTasks.reduce((sum, t) => {
        let act = t.actualMinutes || 0;
        if (!act) {
          const sList = sessions.filter(s => s.taskId === t.id);
          act = Math.round(sList.reduce((sSum, s) => sSum + (s.durationSeconds || 0) / 60, 0));
        }
        return sum + act;
      }, 0);
      totalActual += actualMinutes;
      return { projectId: proj.id, projectName: proj.name, actualMinutes, percentage: 0 };
    });

    return allocations.map(item => ({
      ...item,
      percentage: totalActual > 0 ? Math.round((item.actualMinutes / totalActual) * 100) : 0,
    })).sort((a, b) => b.actualMinutes - a.actualMinutes);
  }

  /**
   * 11. CSV Export Generator
   */
  public static exportToCSV(filename: string, rows: Record<string, any>[]) {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => headers.map(fieldName => JSON.stringify(row[fieldName] || '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
