// ==============================================================================
// NICK OS — ADAPTIVE LEARNING SERVICE (DELEGATE TO BEHAVIOR ENGINE)
// ==============================================================================

import { Task, DayPlan, TimeBlock, ExecutionSession, DailyAccountabilityRecord, Project } from '../../types/domain';
import {
  BehavioralMetrics,
  BehaviorProfile,
  LearningThresholds,
  TransparencyInsight,
  PlanQualityWarning,
} from '../../types/behavior';
import { BehaviorEngine, DEFAULT_RECENCY_CONFIG } from './BehaviorEngine';

export const DEFAULT_THRESHOLDS: LearningThresholds = {
  insufficientLimit: 5,
  preliminaryLimit: 15,
  strongLimit: 30,
};

export class AdaptiveLearningService {
  public static calculateMetrics(
    tasks: Task[],
    dayPlans: DayPlan[],
    timeBlocks: TimeBlock[],
    sessions: ExecutionSession[],
    accountabilityRecords: DailyAccountabilityRecord[],
    projects: Project[]
  ): BehavioralMetrics {
    return BehaviorEngine.calculateMetrics(tasks, dayPlans, timeBlocks, sessions, accountabilityRecords, projects);
  }

  public static buildProfile(metrics: BehavioralMetrics, tasks: Task[]): BehaviorProfile {
    const memoryProfile = BehaviorEngine.buildBehavioralProfile(metrics, tasks);
    // Map memory profile format back to legacy BehaviorProfile interface for backwards compatibility
    return {
      estimation_bias: memoryProfile.estimation_bias.value.biasMultiplier,
      average_session_duration: 45, // default
      common_blockers: memoryProfile.common_blockers.value,
      postponement_patterns: {
        totalPostponedCount: tasks.reduce((s, t) => s + (t.postponeCount || 0), 0),
        highestPostponedTasks: tasks
          .filter(t => (t.postponeCount || 0) > 0)
          .map(t => ({ id: t.id, title: t.title, postponeCount: t.postponeCount || 0 }))
          .sort((a, b) => b.postponeCount - a.postponeCount)
          .slice(0, 5),
      },
      execution_by_time_period: {
        morning: memoryProfile.preferred_execution_windows.value.morningRatio,
        afternoon: memoryProfile.preferred_execution_windows.value.afternoonRatio,
        evening: memoryProfile.preferred_execution_windows.value.eveningRatio,
      },
      project_distribution: {},
      context_switch_rate: memoryProfile.context_switch_rate.value,
      daily_capacity_ratio: memoryProfile.planning_capacity.value.ratio,
    };
  }

  public static generateInsights(
    metrics: BehavioralMetrics,
    profile: BehaviorProfile,
    configThresholds: LearningThresholds = DEFAULT_THRESHOLDS
  ): TransparencyInsight[] {
    const memoryProfile = BehaviorEngine.buildBehavioralProfile(metrics, []);
    return BehaviorEngine.generateInsights(metrics, memoryProfile);
  }

  public static checkPlanQuality(
    proposedPlan: Partial<DayPlan> & { timeBlocks: Omit<TimeBlock, 'id'>[] },
    allTasks: Task[],
    profile: BehaviorProfile
  ): PlanQualityWarning[] {
    // Delegate to existing implementation inside BehaviorEngine or keep helper
    return BehaviorEngineSupport.checkPlanQuality(proposedPlan, allTasks, profile);
  }
}

class BehaviorEngineSupport {
  private static parseTimeToMinutes(timeStr: string): number {
    const parts = timeStr.split(':');
    if (parts.length < 2) return 0;
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  }

  public static checkPlanQuality(
    proposedPlan: Partial<DayPlan> & { timeBlocks: Omit<TimeBlock, 'id'>[] },
    allTasks: Task[],
    profile: BehaviorProfile
  ): PlanQualityWarning[] {
    const warnings: PlanQualityWarning[] = [];
    const scheduledBlocks = proposedPlan.timeBlocks || [];
    let totalPlannedMinutes = 0;
    let contextSwitches = 0;
    let lastProjectId = '';

    scheduledBlocks.forEach(block => {
      const startMin = this.parseTimeToMinutes(block.startTime);
      const endMin = this.parseTimeToMinutes(block.endTime);
      if (endMin - startMin > 0) totalPlannedMinutes += endMin - startMin;

      if (block.taskId) {
        const linkedTask = allTasks.find(t => t.id === block.taskId);
        if (linkedTask) {
          if ((linkedTask.postponeCount || 0) >= 3) {
            warnings.push({
              id: `warning-postpone-${linkedTask.id}`,
              type: 'repeated_postponements',
              severity: 'medium',
              message: `Task with repeated postponements scheduled: "${linkedTask.title}" (${linkedTask.postponeCount} times).`,
            });
          }
          if (linkedTask.projectId) {
            if (lastProjectId && linkedTask.projectId !== lastProjectId) contextSwitches++;
            lastProjectId = linkedTask.projectId;
          }
        }
      }
    });

    const startWorkingMin = proposedPlan.plannedStart ? this.parseTimeToMinutes(proposedPlan.plannedStart) : 510;
    const endWorkingMin = proposedPlan.plannedEnd ? this.parseTimeToMinutes(proposedPlan.plannedEnd) : 1110;
    const available = endWorkingMin - startWorkingMin;

    if (totalPlannedMinutes > available) {
      warnings.push({
        id: 'warning-capacity-overflow',
        type: 'capacity_overload',
        severity: 'high',
        message: `Plan workload (${Math.floor(totalPlannedMinutes / 60)}h) exceeds available working hours (${Math.floor(available / 60)}h).`,
      });
    }

    if (contextSwitches >= 4) {
      warnings.push({
        id: 'warning-context-switches',
        type: 'excessive_switches',
        severity: 'medium',
        message: `Plan has high context switching (${contextSwitches} project switches). Batch similar work.`,
      });
    }

    return warnings;
  }
}
