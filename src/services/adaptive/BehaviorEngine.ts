// ==============================================================================
// NICK OS — ADVANCED BEHAVIORAL LEARNING ENGINE
// ==============================================================================

import { Task, DayPlan, TimeBlock, ExecutionSession, DailyAccountabilityRecord, Project } from '../../types/domain';
import {
  BehavioralMetrics,
  BehavioralMemoryProfile,
  TransparencyInsight,
  PlanQualityWarning,
  AdaptiveEstimateResult,
  TaskFrictionRecord,
  RecencyWeightConfig,
  BlockerOccurrence,
  ProjectTimeAllocation,
  TaskTypePerformance
} from '../../types/behavior';

const SETTING_KEY_LEARNING_DISABLED = 'nick_os_behavior_learning_disabled';
const SETTING_KEY_CUSTOM_INSIGHTS_DELETED = 'nick_os_behavior_deleted_insight_ids';

export const DEFAULT_RECENCY_CONFIG: RecencyWeightConfig = {
  highRelevanceDays: 14,
  mediumRelevanceDays: 60,
  highWeight: 1.0,
  mediumWeight: 0.6,
  lowWeight: 0.3,
};

export class BehaviorEngine {
  
  /**
   * Checks if behavioral learning is disabled by the user
   */
  public static isLearningDisabled(): boolean {
    return localStorage.getItem(SETTING_KEY_LEARNING_DISABLED) === 'true';
  }

  public static setLearningDisabled(disabled: boolean) {
    if (disabled) {
      localStorage.setItem(SETTING_KEY_LEARNING_DISABLED, 'true');
    } else {
      localStorage.removeItem(SETTING_KEY_LEARNING_DISABLED);
    }
  }

  public static getDeletedInsightIds(): string[] {
    try {
      const data = localStorage.getItem(SETTING_KEY_CUSTOM_INSIGHTS_DELETED);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static deleteInsight(id: string) {
    const deleted = this.getDeletedInsightIds();
    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem(SETTING_KEY_CUSTOM_INSIGHTS_DELETED, JSON.stringify(deleted));
    }
  }

  public static resetBehavioralMemory() {
    localStorage.removeItem(SETTING_KEY_CUSTOM_INSIGHTS_DELETED);
    localStorage.removeItem(SETTING_KEY_LEARNING_DISABLED);
  }

  /**
   * Calculate recency weight for a given ISO timestamp string
   */
  public static getRecencyWeight(timestampStr?: string, config: RecencyWeightConfig = DEFAULT_RECENCY_CONFIG): number {
    if (!timestampStr) return config.lowWeight;
    try {
      const date = new Date(timestampStr);
      const now = new Date();
      const diffDays = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);

      if (diffDays <= config.highRelevanceDays) return config.highWeight;
      if (diffDays <= config.mediumRelevanceDays) return config.mediumWeight;
      return config.lowWeight;
    } catch {
      return config.lowWeight;
    }
  }

  /**
   * Determine confidence level based on sample size and variance
   */
  public static calculateConfidence(sampleSize: number): { level: 'low' | 'moderate' | 'high'; score: number } {
    if (sampleSize < 5) {
      return { level: 'low', score: 0.35 };
    } else if (sampleSize < 15) {
      return { level: 'moderate', score: 0.70 };
    } else {
      return { level: 'high', score: 0.92 };
    }
  }

  /**
   * Helper: Parse HH:MM to minutes since midnight
   */
  private static parseTimeToMinutes(timeStr: string): number {
    const parts = timeStr.split(':');
    if (parts.length < 2) return 0;
    const hrs = parseInt(parts[0], 10) || 0;
    const mins = parseInt(parts[1], 10) || 0;
    return hrs * 60 + mins;
  }

  private static getTimePeriod(timeStr: string): 'morning' | 'afternoon' | 'evening' {
    const minutes = this.parseTimeToMinutes(timeStr);
    if (minutes < 12 * 60) return 'morning';
    if (minutes < 18 * 60) return 'afternoon';
    return 'evening';
  }

  /**
   * Core aggregation: Collects execution signals and calculates behavioral metrics with recency weighting
   */
  public static calculateMetrics(
    tasks: Task[],
    dayPlans: DayPlan[],
    timeBlocks: TimeBlock[],
    sessions: ExecutionSession[],
    accountabilityRecords: DailyAccountabilityRecord[],
    projects: Project[]
  ): BehavioralMetrics {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const postponedTasks = tasks.filter(t => (t.postponeCount || 0) > 0);
    const abandonedCount = tasks.filter(t => t.status === 'abandoned').length;

    const completionRate = totalTasks > 0 ? completedTasks.length / totalTasks : 0;
    const postponementRate = totalTasks > 0 ? postponedTasks.length / totalTasks : 0;
    const abandonmentRate = totalTasks > 0 ? abandonedCount / totalTasks : 0;

    // Recency-weighted estimation bias calculation
    let weightedEstimatedSum = 0;
    let weightedActualSum = 0;
    let validComparisonCount = 0;

    completedTasks.forEach(task => {
      let actual = task.actualMinutes || 0;
      if (!actual) {
        const taskSessions = sessions.filter(s => s.taskId === task.id);
        actual = Math.round(taskSessions.reduce((sum, s) => sum + (s.durationSeconds || 0) / 60, 0));
      }

      if (task.estimatedMinutes > 0 && actual > 0) {
        const weight = this.getRecencyWeight(task.updatedAt || task.createdAt);
        weightedEstimatedSum += task.estimatedMinutes * weight;
        weightedActualSum += actual * weight;
        validComparisonCount++;
      }
    });

    const averagePlannedDuration = validComparisonCount > 0 
      ? weightedEstimatedSum / (validComparisonCount || 1) 
      : (tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0) / (totalTasks || 1));

    const averageActualDuration = validComparisonCount > 0 
      ? weightedActualSum / (validComparisonCount || 1) 
      : averagePlannedDuration;

    const estimationErrorRate = weightedEstimatedSum > 0 ? weightedActualSum / weightedEstimatedSum : 1.0;

    // Interruptions frequency
    const totalSessions = sessions.length;
    const interruptedSessions = sessions.filter(s => s.interruptionStatus || (s.pauses && s.pauses.length > 0));
    const interruptionFrequency = totalSessions > 0 ? interruptedSessions.length / totalSessions : 0;

    // Execution by time of day
    const morningBlock = { plannedCount: 0, completedCount: 0, ratio: 0, sessionsCount: 0 };
    const afternoonBlock = { plannedCount: 0, completedCount: 0, ratio: 0, sessionsCount: 0 };
    const eveningBlock = { plannedCount: 0, completedCount: 0, ratio: 0, sessionsCount: 0 };

    timeBlocks.forEach(tb => {
      const period = this.getTimePeriod(tb.startTime);
      const isCompleted = tb.status === 'completed';
      if (period === 'morning') {
        morningBlock.plannedCount++;
        if (isCompleted) morningBlock.completedCount++;
      } else if (period === 'afternoon') {
        afternoonBlock.plannedCount++;
        if (isCompleted) afternoonBlock.completedCount++;
      } else {
        eveningBlock.plannedCount++;
        if (isCompleted) eveningBlock.completedCount++;
      }
    });

    morningBlock.ratio = morningBlock.plannedCount > 0 ? morningBlock.completedCount / morningBlock.plannedCount : 0;
    afternoonBlock.ratio = afternoonBlock.plannedCount > 0 ? afternoonBlock.completedCount / afternoonBlock.plannedCount : 0;
    eveningBlock.ratio = eveningBlock.plannedCount > 0 ? eveningBlock.completedCount / eveningBlock.plannedCount : 0;

    // Day of week
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const executionByDayOfWeek: { [day: string]: { plannedCount: number; completedCount: number; ratio: number } } = {};
    daysOfWeek.forEach(d => {
      executionByDayOfWeek[d] = { plannedCount: 0, completedCount: 0, ratio: 0 };
    });

    dayPlans.forEach(dp => {
      try {
        const dateObj = new Date(dp.date);
        const dayName = daysOfWeek[dateObj.getDay()];
        if (dayName) {
          const planBlocks = timeBlocks.filter(b => b.dailyPlanId === dp.id);
          planBlocks.forEach(b => {
            executionByDayOfWeek[dayName].plannedCount++;
            if (b.status === 'completed') executionByDayOfWeek[dayName].completedCount++;
          });
        }
      } catch {}
    });

    daysOfWeek.forEach(d => {
      const item = executionByDayOfWeek[d];
      item.ratio = item.plannedCount > 0 ? item.completedCount / item.plannedCount : 0;
    });

    // Project execution distribution & Factual Health Indicators
    const todayStr = new Date().toISOString().split('T')[0];
    const projectExecutionDistribution: ProjectTimeAllocation[] = projects.map(proj => {
      const projTasks = tasks.filter(t => t.projectId === proj.id);
      const plannedMins = projTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
      const actualMins = projTasks.reduce((sum, t) => {
        let act = t.actualMinutes || 0;
        if (!act) {
          const sList = sessions.filter(s => s.taskId === t.id);
          act = Math.round(sList.reduce((sSum, s) => sSum + (s.durationSeconds || 0) / 60, 0));
        }
        return sum + act;
      }, 0);

      const completedProjTasks = projTasks.filter(t => t.status === 'completed').length;
      const projCompletionRate = projTasks.length > 0 ? completedProjTasks / projTasks.length : 0;
      const overdueTasksCount = projTasks.filter(t => t.deadline && t.deadline < todayStr && t.status !== 'completed').length;
      const postponedTasksCount = projTasks.filter(t => (t.postponeCount || 0) > 0).length;

      const priorityWeight = proj.priority === 'critical' ? 3 : proj.priority === 'high' ? 2 : 1;
      const neglectFactor = actualMins === 0 && plannedMins > 0 ? priorityWeight * 10 : Math.max(0, (plannedMins * priorityWeight) / (actualMins || 1));
      const recentActivity = projTasks.some(t => t.updatedAt && (new Date().getTime() - new Date(t.updatedAt).getTime()) < 7 * 24 * 3600 * 1000);

      return {
        projectId: proj.id,
        projectName: proj.name,
        plannedMinutes: plannedMins,
        actualMinutes: actualMins,
        neglectFactor,
        completionRate: projCompletionRate,
        overdueTasksCount,
        postponedTasksCount,
        recentActivity,
      };
    });

    // Blocker occurrences
    const blockerMap: { [cat: string]: { count: number; tasks: string[] } } = {};
    const addBlocker = (reason: string, taskId: string) => {
      let category = 'other';
      const l = reason.toLowerCase();
      if (l.includes('start') || l.includes('vague')) category = 'unclear starting point';
      else if (l.includes('tech') || l.includes('bug') || l.includes('code')) category = 'technical issue';
      else if (l.includes('info') || l.includes('spec')) category = 'lack of information';
      else if (l.includes('fatigue') || l.includes('tired')) category = 'fatigue';
      else if (l.includes('interrupt') || l.includes('slack')) category = 'external interruption';
      else if (l.includes('scope') || l.includes('big')) category = 'excessive scope';

      if (!blockerMap[category]) blockerMap[category] = { count: 0, tasks: [] };
      blockerMap[category].count++;
      if (!blockerMap[category].tasks.includes(taskId)) blockerMap[category].tasks.push(taskId);
    };

    tasks.forEach(t => {
      if (t.blockerReason) addBlocker(t.blockerReason, t.id);
      if (t.postponeReason) addBlocker(t.postponeReason, t.id);
    });

    const recurringBlockerCategories: BlockerOccurrence[] = Object.entries(blockerMap).map(([category, info]) => ({
      category,
      count: info.count,
      tasksLinked: info.tasks,
    })).sort((a, b) => b.count - a.count);

    // Task-type performance
    const categories = ['deep_work', 'shallow_work', 'routine', 'exercise', 'learning', 'admin'];
    const taskTypePerformance: TaskTypePerformance[] = categories.map(cat => {
      const cTasks = tasks.filter(t => t.tags?.includes(cat) || t.contextTags?.includes(cat));
      const comp = cTasks.filter(t => t.status === 'completed').length;
      const post = cTasks.filter(t => (t.postponeCount || 0) > 0).length;
      return {
        category: cat,
        plannedMinutes: cTasks.reduce((s, t) => s + t.estimatedMinutes, 0),
        actualMinutes: cTasks.reduce((s, t) => s + (t.actualMinutes || 0), 0),
        completionRate: cTasks.length > 0 ? comp / cTasks.length : 0,
        postponeRate: cTasks.length > 0 ? post / cTasks.length : 0,
      };
    });

    // Context switching rate
    let totalSwitches = 0;
    let daysCount = 0;
    dayPlans.forEach(dp => {
      const pBlocks = timeBlocks.filter(b => b.dailyPlanId === dp.id && b.taskId);
      if (pBlocks.length > 0) {
        let switches = 0;
        let lastId = '';
        pBlocks.forEach(b => {
          if (b.taskId && b.taskId !== lastId) {
            if (lastId) switches++;
            lastId = b.taskId;
          }
        });
        totalSwitches += switches;
        daysCount++;
      }
    });

    const contextSwitchRate = daysCount > 0 ? totalSwitches / daysCount : 0;

    return {
      totalSessionsAnalyzed: totalSessions,
      averagePlannedDuration,
      averageActualDuration,
      estimationErrorRate,
      completionRate,
      postponementRate,
      abandonmentRate,
      interruptionFrequency,
      executionByTimeOfDay: { morning: morningBlock, afternoon: afternoonBlock, evening: eveningBlock },
      executionByDayOfWeek,
      projectExecutionDistribution,
      recurringBlockerCategories,
      taskTypePerformance,
      contextSwitchRate,
    };
  }

  /**
   * Builds Behavioral Memory Profile with confidence ratings and sample sizes
   */
  public static buildBehavioralProfile(metrics: BehavioralMetrics, tasks: Task[]): BehavioralMemoryProfile {
    const sampleSize = metrics.totalSessionsAnalyzed;
    const conf = this.calculateConfidence(sampleSize);
    const nowIso = new Date().toISOString();

    const actualSum = metrics.projectExecutionDistribution.reduce((s, p) => s + p.actualMinutes, 0);
    const plannedSum = metrics.projectExecutionDistribution.reduce((s, p) => s + p.plannedMinutes, 0);
    const ratio = plannedSum > 0 ? actualSum / plannedSum : 1.0;

    const totalPostponed = tasks.reduce((s, t) => s + (t.postponeCount || 0), 0);
    const topTask = tasks.filter(t => (t.postponeCount || 0) > 0).sort((a, b) => (b.postponeCount || 0) - (a.postponeCount || 0))[0];

    const morningRate = metrics.executionByTimeOfDay.morning.ratio;
    const afternoonRate = metrics.executionByTimeOfDay.afternoon.ratio;
    const eveningRate = metrics.executionByTimeOfDay.evening.ratio;
    const bestWindow = morningRate >= afternoonRate && morningRate >= eveningRate ? 'Morning' : afternoonRate >= eveningRate ? 'Afternoon' : 'Evening';

    const neglectedCount = metrics.projectExecutionDistribution.filter(p => p.neglectFactor > 5).length;
    const balancedCount = metrics.projectExecutionDistribution.length - neglectedCount;

    return {
      planning_capacity: {
        value: { actualAverageDailyMins: Math.round(actualSum / (metrics.totalSessionsAnalyzed || 1) * 3), plannedAverageDailyMins: Math.round(plannedSum / (metrics.totalSessionsAnalyzed || 1) * 3), ratio },
        confidence: conf.level,
        confidenceScore: conf.score,
        sampleSize,
        lastUpdated: nowIso,
      },
      estimation_bias: {
        value: { biasMultiplier: metrics.estimationErrorRate, percentageUnderBudget: Math.round((metrics.estimationErrorRate - 1) * 100) },
        confidence: conf.level,
        confidenceScore: conf.score,
        sampleSize,
        lastUpdated: nowIso,
      },
      preferred_execution_windows: {
        value: { bestWindow, morningRatio: morningRate, afternoonRatio: afternoonRate, eveningRatio: eveningRate },
        confidence: conf.level,
        confidenceScore: conf.score,
        sampleSize,
        lastUpdated: nowIso,
      },
      common_blockers: {
        value: metrics.recurringBlockerCategories.slice(0, 3).map(b => b.category),
        confidence: conf.level,
        confidenceScore: conf.score,
        sampleSize,
        lastUpdated: nowIso,
      },
      interruption_patterns: {
        value: { frequentCategory: metrics.recurringBlockerCategories[0]?.category || 'none', frequencyRate: metrics.interruptionFrequency },
        confidence: conf.level,
        confidenceScore: conf.score,
        sampleSize,
        lastUpdated: nowIso,
      },
      postponement_patterns: {
        value: { totalPostponed, topTaskTitle: topTask?.title || 'None' },
        confidence: conf.level,
        confidenceScore: conf.score,
        sampleSize,
        lastUpdated: nowIso,
      },
      context_switch_rate: {
        value: metrics.contextSwitchRate,
        confidence: conf.level,
        confidenceScore: conf.score,
        sampleSize,
        lastUpdated: nowIso,
      },
      project_allocation_patterns: {
        value: { neglectedProjectsCount: neglectedCount, balancedProjectsCount: balancedCount },
        confidence: conf.level,
        confidenceScore: conf.score,
        sampleSize,
        lastUpdated: nowIso,
      },
    };
  }

  /**
   * Adaptive Estimation Recommendation Mechanism
   */
  public static calculateAdaptiveEstimate(task: Task, metrics: BehavioralMetrics): AdaptiveEstimateResult {
    const original = task.estimatedMinutes || 45;
    const bias = metrics.estimationErrorRate;
    const sampleSize = metrics.totalSessionsAnalyzed;
    const conf = this.calculateConfidence(sampleSize);

    // Suggest estimate scaled by historical estimation bias
    const suggested = Math.round(original * Math.max(1.0, bias));
    const diff = suggested - original;

    let reason = `Based on ${sampleSize} historical sessions, similar tasks average a ${Math.round((bias - 1) * 100)}% under-budget variance.`;
    if (diff === 0) {
      reason = `Task estimate is consistent with historical actual durations across ${sampleSize} sessions.`;
    }

    return {
      taskId: task.id,
      originalEstimate: original,
      suggestedEstimate: suggested,
      confidence: conf.level,
      reason,
      sampleSize,
    };
  }

  /**
   * Task Friction Calculator (Friction Score 0 - 100)
   */
  public static calculateTaskFriction(task: Task, sessions: ExecutionSession[]): TaskFrictionRecord {
    const postpones = task.postponeCount || 0;
    const taskSessions = sessions.filter(s => s.taskId === task.id);
    const interruptions = taskSessions.filter(s => s.interruptionStatus || (s.pauses && s.pauses.length > 0)).length;
    
    const createdDaysAgo = task.createdAt 
      ? Math.max(0, Math.floor((new Date().getTime() - new Date(task.createdAt).getTime()) / (1000 * 3600 * 24)))
      : 0;

    const abandoned = task.status === 'abandoned';

    // Weighted friction score
    let score = (postpones * 25) + (interruptions * 15) + (Math.min(createdDaysAgo, 10) * 3);
    if (abandoned) score += 40;
    score = Math.min(100, Math.max(0, score));

    let explanation = 'Normal execution flow.';
    if (score > 70) {
      explanation = `High friction detected: postponed ${postpones} times, ${interruptions} recorded interruptions, pending for ${createdDaysAgo} days.`;
    } else if (score > 40) {
      explanation = `Moderate friction: postponed ${postpones} times or delayed in backlog.`;
    }

    return {
      taskId: task.id,
      taskTitle: task.title,
      frictionScore: score,
      postponeCount: postpones,
      interruptionCount: interruptions,
      daysPending: createdDaysAgo,
      abandoned,
      explanation,
    };
  }

  /**
   * Generate Transparency Insights with Traceability
   */
  public static generateInsights(metrics: BehavioralMetrics, profile: BehavioralMemoryProfile): TransparencyInsight[] {
    const insights: TransparencyInsight[] = [];
    const sampleSize = metrics.totalSessionsAnalyzed;
    const conf = this.calculateConfidence(sampleSize);
    const deletedIds = this.getDeletedInsightIds();

    if (sampleSize < 3) {
      insights.push({
        id: 'insufficient_data_initial',
        title: 'Initial Learning Cycle Active',
        observation: `Nick OS is actively aggregating execution telemetry. Currently recorded ${sampleSize} active sessions.`,
        data: `Sample size: ${sampleSize} sessions. (Requires minimum of 5 for preliminary pattern audits).`,
        implication: 'Insufficient historical data to formulate precise adaptive recommendations.',
        recommendation: 'Continue executing daily plans. Complete sessions and reconcile daily accountability logs.',
        confidence: 0.4,
        confidenceLevel: 'low',
        category: 'estimation',
        sampleSize,
        period: 'Last 14 days',
        traceability: {
          observation: `Recorded ${sampleSize} total execution sessions in log repository.`,
          data: `Active session count: ${sampleSize}`,
          period: 'Last 14 days',
          reason: 'Sample size below minimum threshold for statistical confidence.',
        },
      });
      return insights.filter(i => !deletedIds.includes(i.id));
    }

    // 1. Estimation Bias
    if (metrics.estimationErrorRate > 1.15) {
      const pct = Math.round((metrics.estimationErrorRate - 1) * 100);
      insights.push({
        id: 'estimation_bias_under',
        title: 'Task Estimation Under-Budgeting',
        observation: `Completed tasks consistently overrun their initial estimates by roughly ${pct}%.`,
        data: `Planned avg: ${Math.round(metrics.averagePlannedDuration)}m vs Actual avg: ${Math.round(metrics.averageActualDuration)}m across ${sampleSize} sessions.`,
        implication: 'Daily plans overflow into evening hours or force task postponements.',
        recommendation: `Consider applying a +${pct}% buffer when estimating similar deep work tasks.`,
        confidence: conf.score,
        confidenceLevel: conf.level,
        category: 'estimation',
        sampleSize,
        period: 'Last 30 days',
        traceability: {
          observation: `Actual duration exceeds estimated duration by ${pct}% on average.`,
          data: `Average Planned: ${Math.round(metrics.averagePlannedDuration)}m, Actual: ${Math.round(metrics.averageActualDuration)}m`,
          period: 'Last 30 days',
          reason: 'Calculated via recency-weighted accuracy ratio on completed task intervals.',
        },
      });
    }

    // 2. Postponement patterns
    if (profile.postponement_patterns.value.totalPostponed >= 3) {
      insights.push({
        id: 'postponement_cluster',
        title: 'High Inertia Postponements',
        observation: `Detected ${profile.postponement_patterns.value.totalPostponed} task postponement actions in the active schedule.`,
        data: `Most frequently postponed item: "${profile.postponement_patterns.value.topTaskTitle}".`,
        implication: 'Tasks postponed multiple times suffer from high initial friction or vague starting parameters.',
        recommendation: 'Break down frequently postponed tasks into 15-minute sub-tasks using the AI Breakdown tool.',
        confidence: 0.85,
        confidenceLevel: 'high',
        category: 'postponement',
        sampleSize,
        period: 'Last 14 days',
        traceability: {
          observation: `Repeated postponement count exceeds threshold (>=3).`,
          data: `Total postponed: ${profile.postponement_patterns.value.totalPostponed}`,
          period: 'Last 14 days',
          reason: 'Aggregated from task metadata postponeCount counters.',
        },
      });
    }

    // 3. Time of day execution skew
    const morningR = profile.preferred_execution_windows.value.morningRatio;
    const afternoonR = profile.preferred_execution_windows.value.afternoonRatio;
    if (Math.abs(morningR - afternoonR) > 0.20) {
      const best = morningR > afternoonR ? 'Morning' : 'Afternoon';
      insights.push({
        id: 'temporal_skew',
        title: 'Temporal Execution Performance Skew',
        observation: `Completion rates are significantly higher during the ${best} execution window.`,
        data: `Morning completion ratio: ${Math.round(morningR * 100)}% vs Afternoon: ${Math.round(afternoonR * 100)}%.`,
        implication: 'Scheduling critical deep work during lower-performing hours increases fatigue and interruption rates.',
        recommendation: `Schedule high-leverage cognitive tasks during the ${best} window.`,
        confidence: conf.score,
        confidenceLevel: conf.level,
        category: 'time_of_day',
        sampleSize,
        period: 'Last 30 days',
        traceability: {
          observation: `Variance between morning and afternoon completion ratios exceeds 20%.`,
          data: `Morning: ${Math.round(morningR * 100)}%, Afternoon: ${Math.round(afternoonR * 100)}%`,
          period: 'Last 30 days',
          reason: 'Computed from scheduled timeblock status distributions by time of day.',
        },
      });
    }

    // 4. Context switching rate
    if (profile.context_switch_rate.value > 3.5) {
      insights.push({
        id: 'high_context_switching',
        title: 'Excessive Context Switching',
        observation: `Averages ${profile.context_switch_rate.value.toFixed(1)} project switches per planned day.`,
        data: `Chronological sequence analysis of scheduled time blocks across active days.`,
        implication: 'Frequent switching between unrelated projects generates cognitive residue and fatigue.',
        recommendation: 'Batch similar tasks into contiguous 2-hour thematic work blocks.',
        confidence: 0.8,
        confidenceLevel: 'high',
        category: 'context_switch',
        sampleSize,
        period: 'Last 14 days',
        traceability: {
          observation: `Daily project switch frequency > 3.5 switches/day.`,
          data: `Average switches: ${profile.context_switch_rate.value.toFixed(1)}`,
          period: 'Last 14 days',
          reason: 'Evaluated from chronological project IDs assigned to daily time blocks.',
        },
      });
    }

    return insights.filter(i => !deletedIds.includes(i.id));
  }

  /**
   * Contextual AI Retrieval: Returns only relevant behavioral signals for the given task or context
   */
  public static getContextualBehavioralSignals(task?: Task, metrics?: BehavioralMetrics): string {
    if (this.isLearningDisabled() || !metrics) {
      return 'Behavioral learning is currently disabled or insufficient.';
    }

    let signals = `[BEHAVIORAL SIGNALS]\n`;
    signals += `- Historical Estimation Bias: ${(metrics.estimationErrorRate * 100).toFixed(0)}% of estimated duration.\n`;
    signals += `- Average Task Completion Rate: ${(metrics.completionRate * 100).toFixed(0)}%.\n`;
    signals += `- Interruption Frequency: ${(metrics.interruptionFrequency * 100).toFixed(0)}% of sessions.\n`;

    if (task) {
      const cat = task.tags?.[0] || 'general';
      const perf = metrics.taskTypePerformance.find(p => p.category === cat);
      if (perf) {
        signals += `- Category "${cat}" completion rate: ${(perf.completionRate * 100).toFixed(0)}% (Postpone rate: ${(perf.postponeRate * 100).toFixed(0)}%).\n`;
      }
      if ((task.postponeCount || 0) > 0) {
        signals += `- Notice: This task has been postponed ${task.postponeCount} times previously.\n`;
      }
    }

    if (metrics.recurringBlockerCategories.length > 0) {
      signals += `- Frequent Blocker: "${metrics.recurringBlockerCategories[0].category}" (${metrics.recurringBlockerCategories[0].count} occurrences).\n`;
    }

    return signals;
  }
}
