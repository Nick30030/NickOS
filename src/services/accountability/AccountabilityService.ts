import {
  DailyAccountabilityRecord,
  ReconciledCommitment,
  ExternalBlockerRecord,
  CommitmentClassification,
  MissedReasonCategory,
  WeeklyAccountabilityAggregate,
  Task,
  DayPlan,
  ExecutionSession,
  Project,
  Goal,
} from '../../types/domain';
import { IExecutionRepository } from '../../types/repository';

export class AccountabilityService {
  private repository: IExecutionRepository;

  constructor(repository: IExecutionRepository) {
    this.repository = repository;
  }

  /**
   * Generates or loads the deterministic accountability record for a given date.
   * Pulls real task, plan, and session data to populate actual metrics without synthetic fiction.
   */
  async generateOrLoadDailyRecord(
    date: string,
    tasks: Task[],
    dayPlan: DayPlan | null,
    sessions: ExecutionSession[],
    projects: Project[] = [],
    goals: Goal[] = []
  ): Promise<DailyAccountabilityRecord> {
    const existing = await this.repository.getAccountabilityRecord(date);

    // Filter tasks planned for this date
    // Planned tasks are either in dayPlan.plannedTaskIds, scheduled on date, or active/completed on date
    const plannedTaskIds = new Set<string>(dayPlan?.plannedTaskIds || []);
    tasks.forEach(t => {
      if (t.scheduledDate === date) {
        plannedTaskIds.add(t.id);
      }
    });

    const relevantTasks = tasks.filter(t => plannedTaskIds.has(t.id));

    // Calculate actual minutes from execution sessions for this date
    const dateSessions = sessions.filter(s => {
      const sessionDate = s.startTime?.substring(0, 10);
      return sessionDate === date;
    });

    const taskActualMinutesMap = new Map<string, number>();
    let totalActualMinutes = 0;
    let totalPauseMinutes = 0;
    let interruptionCount = 0;

    dateSessions.forEach(session => {
      const durationMin = Math.round((session.durationSeconds || 0) / 60);
      const current = taskActualMinutesMap.get(session.taskId) || 0;
      taskActualMinutesMap.set(session.taskId, current + durationMin);
      totalActualMinutes += durationMin;

      if (session.pauses && session.pauses.length > 0) {
        session.pauses.forEach(p => {
          interruptionCount += 1;
          totalPauseMinutes += Math.round((p.durationSeconds || 0) / 60);
        });
      }

      if (session.interruptionStatus) {
        interruptionCount += 1;
      }
    });

    // Compute task counts and draft reconciliations
    let plannedTasksCount = relevantTasks.length;
    let completedTasksCount = 0;
    let postponedTasksCount = 0;
    let abandonedTasksCount = 0;
    let blockedTasksCount = 0;
    let partiallyCompletedTasksCount = 0;
    let notStartedTasksCount = 0;
    let plannedMinutes = 0;

    const existingReconciledMap = new Map<string, ReconciledCommitment>();
    if (existing?.reconciledCommitments) {
      existing.reconciledCommitments.forEach(r => existingReconciledMap.set(r.taskId, r));
    }

    const reconciledCommitments: ReconciledCommitment[] = relevantTasks.map(task => {
      const taskActual = taskActualMinutesMap.get(task.id) || task.actualMinutes || 0;
      plannedMinutes += task.estimatedMinutes || 0;

      const project = projects.find(p => p.id === task.projectId);
      const goal = goals.find(g => g.id === task.goalId || g.id === project?.goalId);

      const saved = existingReconciledMap.get(task.id);

      let classification: CommitmentClassification = 'not_started';
      if (task.status === 'completed') {
        classification = 'completed';
      } else if (task.status === 'postponed') {
        classification = 'postponed';
      } else if (task.status === 'abandoned') {
        classification = 'abandoned';
      } else if (task.status === 'blocked') {
        classification = 'blocked';
      } else if (taskActual > 0) {
        classification = 'partially_completed';
      } else {
        classification = 'not_started';
      }

      // If user had manually reconciled, honor their categorization unless status explicitly moved to completed
      if (saved && !existing?.isFinalized && saved.classification) {
        classification = task.status === 'completed' ? 'completed' : saved.classification;
      } else if (saved && existing?.isFinalized) {
        classification = saved.classification;
      }

      // Count classification
      if (classification === 'completed') completedTasksCount++;
      else if (classification === 'postponed') postponedTasksCount++;
      else if (classification === 'abandoned') abandonedTasksCount++;
      else if (classification === 'blocked') blockedTasksCount++;
      else if (classification === 'partially_completed') partiallyCompletedTasksCount++;
      else notStartedTasksCount++;

      return {
        taskId: task.id,
        taskTitle: task.title,
        projectId: task.projectId,
        projectName: project?.name,
        goalId: goal?.id,
        goalTitle: goal?.title,
        commitmentLevel: task.commitmentLevel || 'hard_commitment',
        plannedMinutes: task.estimatedMinutes || 0,
        actualMinutes: taskActual,
        classification,
        reasonCategory: saved?.reasonCategory,
        reasonDetails: saved?.reasonDetails || task.postponeReason || task.abandonReason,
        isExternalBlocker: saved?.isExternalBlocker || task.status === 'blocked',
        blockerDetails: saved?.blockerDetails,
        concreteOutcome: saved?.concreteOutcome,
      };
    });

    // If no planned tasks in dayPlan but we have tasks executed on that day, add them
    if (plannedTasksCount === 0 && relevantTasks.length === 0) {
      tasks.forEach(t => {
        const taskActual = taskActualMinutesMap.get(t.id) || 0;
        if (taskActual > 0 || t.status === 'completed') {
          // Unplanned executed task
          const project = projects.find(p => p.id === t.projectId);
          const goal = goals.find(g => g.id === t.goalId || g.id === project?.goalId);
          const classification: CommitmentClassification = t.status === 'completed' ? 'completed' : 'partially_completed';
          if (classification === 'completed') completedTasksCount++;
          else partiallyCompletedTasksCount++;
          plannedTasksCount++;
          plannedMinutes += t.estimatedMinutes || 0;

          reconciledCommitments.push({
            taskId: t.id,
            taskTitle: t.title,
            projectId: t.projectId,
            projectName: project?.name,
            goalId: goal?.id,
            goalTitle: goal?.title,
            commitmentLevel: t.commitmentLevel || 'flexible',
            plannedMinutes: t.estimatedMinutes || 0,
            actualMinutes: taskActual,
            classification,
          });
        }
      });
    }

    // Deterministic execution rate calculation: completed / total planned
    const totalPlannedDenominator = Math.max(1, plannedTasksCount);
    const executionRate = Number((completedTasksCount / totalPlannedDenominator).toFixed(2));
    const timeExecutionRatio = plannedMinutes > 0 
      ? Number((totalActualMinutes / plannedMinutes).toFixed(2))
      : (totalActualMinutes > 0 ? 1.0 : 0);

    const now = new Date().toISOString();

    const record: DailyAccountabilityRecord = {
      id: existing?.id || `acc_${date}`,
      date,
      plannedTasks: plannedTasksCount,
      completedTasks: completedTasksCount,
      postponedTasks: postponedTasksCount,
      abandonedTasks: abandonedTasksCount,
      blockedTasks: blockedTasksCount,
      notStartedTasks: notStartedTasksCount,
      partiallyCompletedTasks: partiallyCompletedTasksCount,
      plannedMinutes,
      actualMinutes: totalActualMinutes,
      interruptionCount: Math.max(interruptionCount, existing?.interruptionCount || 0),
      totalPauseMinutes: Math.max(totalPauseMinutes, existing?.totalPauseMinutes || 0),
      executionRate,
      timeExecutionRatio,
      reconciledCommitments,
      externalBlockers: existing?.externalBlockers || [],
      concreteOutputs: existing?.concreteOutputs || [],
      notes: existing?.notes || '',
      isFinalized: existing?.isFinalized || false,
      finalizedAt: existing?.finalizedAt,
      generatedAt: existing?.generatedAt || now,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    // If not finalized, update and persist draft
    if (!existing?.isFinalized) {
      await this.repository.saveAccountabilityRecord(record);
    }

    return record;
  }

  /**
   * Reconciles an individual task commitment for a date
   */
  async reconcileCommitment(
    date: string,
    taskId: string,
    updates: Partial<ReconciledCommitment>
  ): Promise<DailyAccountabilityRecord> {
    const existing = await this.repository.getAccountabilityRecord(date);
    if (!existing) {
      throw new Error(`No accountability record found for ${date}`);
    }

    if (existing.isFinalized) {
      throw new Error(`Cannot modify a finalized accountability record for ${date}. Reopen first.`);
    }

    const commitments = [...existing.reconciledCommitments];
    const index = commitments.findIndex(c => c.taskId === taskId);
    if (index === -1) {
      throw new Error(`Commitment ${taskId} not found in daily record.`);
    }

    commitments[index] = {
      ...commitments[index],
      ...updates,
    };

    // Recompute counts & rates
    let completedCount = 0;
    let postponedCount = 0;
    let abandonedCount = 0;
    let blockedCount = 0;
    let partiallyCompletedCount = 0;
    let notStartedCount = 0;

    commitments.forEach(c => {
      if (c.classification === 'completed') completedCount++;
      else if (c.classification === 'postponed') postponedCount++;
      else if (c.classification === 'abandoned') abandonedCount++;
      else if (c.classification === 'blocked') blockedCount++;
      else if (c.classification === 'partially_completed') partiallyCompletedCount++;
      else notStartedCount++;
    });

    const totalDenominator = Math.max(1, commitments.length);
    const executionRate = Number((completedCount / totalDenominator).toFixed(2));

    const updatedRecord: DailyAccountabilityRecord = {
      ...existing,
      completedTasks: completedCount,
      postponedTasks: postponedCount,
      abandonedTasks: abandonedCount,
      blockedTasks: blockedCount,
      partiallyCompletedTasks: partiallyCompletedCount,
      notStartedTasks: notStartedCount,
      executionRate,
      reconciledCommitments: commitments,
      updatedAt: new Date().toISOString(),
    };

    return this.repository.saveAccountabilityRecord(updatedRecord);
  }

  /**
   * Records an external blocker preventing execution
   */
  async recordExternalBlocker(
    date: string,
    blockerData: Omit<ExternalBlockerRecord, 'id' | 'loggedAt'>
  ): Promise<DailyAccountabilityRecord> {
    const existing = await this.repository.getAccountabilityRecord(date);
    if (!existing) {
      throw new Error(`No accountability record found for ${date}`);
    }

    const newBlocker: ExternalBlockerRecord = {
      ...blockerData,
      id: `blk_${Date.now()}`,
      loggedAt: new Date().toISOString(),
    };

    const blockers = [...(existing.externalBlockers || []), newBlocker];

    const updatedRecord: DailyAccountabilityRecord = {
      ...existing,
      externalBlockers: blockers,
      updatedAt: new Date().toISOString(),
    };

    return this.repository.saveAccountabilityRecord(updatedRecord);
  }

  /**
   * Deletes an external blocker
   */
  async deleteExternalBlocker(date: string, blockerId: string): Promise<DailyAccountabilityRecord> {
    const existing = await this.repository.getAccountabilityRecord(date);
    if (!existing) {
      throw new Error(`No accountability record found for ${date}`);
    }

    const blockers = (existing.externalBlockers || []).filter(b => b.id !== blockerId);

    const updatedRecord: DailyAccountabilityRecord = {
      ...existing,
      externalBlockers: blockers,
      updatedAt: new Date().toISOString(),
    };

    return this.repository.saveAccountabilityRecord(updatedRecord);
  }

  /**
   * Adds a concrete tangible output to the day's record
   */
  async addConcreteOutput(date: string, output: string): Promise<DailyAccountabilityRecord> {
    const existing = await this.repository.getAccountabilityRecord(date);
    if (!existing) {
      throw new Error(`No accountability record found for ${date}`);
    }

    const trimmed = output.trim();
    if (!trimmed) return existing;

    const concreteOutputs = [...(existing.concreteOutputs || []), trimmed];

    const updatedRecord: DailyAccountabilityRecord = {
      ...existing,
      concreteOutputs,
      updatedAt: new Date().toISOString(),
    };

    return this.repository.saveAccountabilityRecord(updatedRecord);
  }

  /**
   * Removes a concrete tangible output
   */
  async removeConcreteOutput(date: string, index: number): Promise<DailyAccountabilityRecord> {
    const existing = await this.repository.getAccountabilityRecord(date);
    if (!existing) {
      throw new Error(`No accountability record found for ${date}`);
    }

    const concreteOutputs = (existing.concreteOutputs || []).filter((_, i) => i !== index);

    const updatedRecord: DailyAccountabilityRecord = {
      ...existing,
      concreteOutputs,
      updatedAt: new Date().toISOString(),
    };

    return this.repository.saveAccountabilityRecord(updatedRecord);
  }

  /**
   * Updates daily reflection notes
   */
  async updateNotes(date: string, notes: string): Promise<DailyAccountabilityRecord> {
    const existing = await this.repository.getAccountabilityRecord(date);
    if (!existing) {
      throw new Error(`No accountability record found for ${date}`);
    }

    const updatedRecord: DailyAccountabilityRecord = {
      ...existing,
      notes,
      updatedAt: new Date().toISOString(),
    };

    return this.repository.saveAccountabilityRecord(updatedRecord);
  }

  /**
   * Finalizes and seals the daily accountability record
   */
  async finalizeDay(date: string, notes?: string): Promise<DailyAccountabilityRecord> {
    const existing = await this.repository.getAccountabilityRecord(date);
    if (!existing) {
      throw new Error(`No accountability record found for ${date}`);
    }

    // Verify all commitments are accounted for
    return this.repository.finalizeAccountabilityRecord(date, {
      notes: notes !== undefined ? notes : existing.notes,
    });
  }

  /**
   * Reopens a finalized day for corrections
   */
  async reopenDay(date: string): Promise<DailyAccountabilityRecord> {
    return this.repository.reopenAccountabilityRecord(date);
  }

  /**
   * Computes weekly accountability metrics deterministically across all days in range
   */
  computeWeeklyAggregate(
    records: DailyAccountabilityRecord[],
    startDate: string,
    endDate: string,
    projects: Project[] = [],
    goals: Goal[] = []
  ): WeeklyAccountabilityAggregate {
    // Generate dates in interval
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateList: string[] = [];

    const cur = new Date(start);
    while (cur <= end) {
      dateList.push(cur.toISOString().substring(0, 10));
      cur.setDate(cur.getDate() + 1);
    }

    const recordsMap = new Map<string, DailyAccountabilityRecord>();
    records.forEach(r => recordsMap.set(r.date, r));

    let totalPlanned = 0;
    let totalCompleted = 0;
    let totalPostponed = 0;
    let totalAbandoned = 0;
    let totalBlocked = 0;
    let totalPlannedMinutes = 0;
    let totalActualMinutes = 0;
    let totalInterruptions = 0;
    let totalPauseMinutes = 0;

    const blockerCategoriesCount: Record<string, number> = {};
    const reasonCategoriesCount: Record<string, number> = {};
    const projectMinutesMap = new Map<string, { actualMinutes: number; completedTasks: number; name: string }>();
    const goalMinutesMap = new Map<string, { actualMinutes: number; title: string }>();

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const dailyBreakdown = dateList.map(dateStr => {
      const dayDate = new Date(`${dateStr}T12:00:00Z`);
      const dayName = dayNames[dayDate.getUTCDay()];
      const rec = recordsMap.get(dateStr);

      if (rec) {
        totalPlanned += rec.plannedTasks || 0;
        totalCompleted += rec.completedTasks || 0;
        totalPostponed += rec.postponedTasks || 0;
        totalAbandoned += rec.abandonedTasks || 0;
        totalBlocked += rec.blockedTasks || 0;
        totalPlannedMinutes += rec.plannedMinutes || 0;
        totalActualMinutes += rec.actualMinutes || 0;
        totalInterruptions += rec.interruptionCount || 0;
        totalPauseMinutes += rec.totalPauseMinutes || 0;

        // Blockers
        if (rec.externalBlockers) {
          rec.externalBlockers.forEach(b => {
            blockerCategoriesCount[b.category] = (blockerCategoriesCount[b.category] || 0) + 1;
          });
        }

        // Reconciled commitments
        if (rec.reconciledCommitments) {
          rec.reconciledCommitments.forEach(c => {
            if (c.reasonCategory) {
              reasonCategoriesCount[c.reasonCategory] = (reasonCategoriesCount[c.reasonCategory] || 0) + 1;
            }

            if (c.projectId) {
              const current = projectMinutesMap.get(c.projectId) || {
                actualMinutes: 0,
                completedTasks: 0,
                name: c.projectName || 'Project',
              };
              current.actualMinutes += c.actualMinutes || 0;
              if (c.classification === 'completed') current.completedTasks += 1;
              projectMinutesMap.set(c.projectId, current);
            }

            if (c.goalId) {
              const current = goalMinutesMap.get(c.goalId) || {
                actualMinutes: 0,
                title: c.goalTitle || 'Goal',
              };
              current.actualMinutes += c.actualMinutes || 0;
              goalMinutesMap.set(c.goalId, current);
            }
          });
        }

        return {
          date: dateStr,
          dayName,
          planned: rec.plannedTasks || 0,
          completed: rec.completedTasks || 0,
          postponed: rec.postponedTasks || 0,
          blocked: rec.blockedTasks || 0,
          executionRate: rec.executionRate || 0,
          plannedMinutes: rec.plannedMinutes || 0,
          actualMinutes: rec.actualMinutes || 0,
          isFinalized: rec.isFinalized || false,
        };
      }

      return {
        date: dateStr,
        dayName,
        planned: 0,
        completed: 0,
        postponed: 0,
        blocked: 0,
        executionRate: 0,
        plannedMinutes: 0,
        actualMinutes: 0,
        isFinalized: false,
      };
    });

    const overallExecutionRate = totalPlanned > 0 ? Number((totalCompleted / totalPlanned).toFixed(2)) : 0;
    const overallTimeRatio = totalPlannedMinutes > 0 ? Number((totalActualMinutes / totalPlannedMinutes).toFixed(2)) : 0;

    const projectTimeDistribution = Array.from(projectMinutesMap.entries()).map(([projectId, data]) => {
      const proj = projects.find(p => p.id === projectId);
      return {
        projectId,
        projectName: proj?.name || data.name,
        actualMinutes: data.actualMinutes,
        completedTasks: data.completedTasks,
      };
    }).sort((a, b) => b.actualMinutes - a.actualMinutes);

    const goalTimeDistribution = Array.from(goalMinutesMap.entries()).map(([goalId, data]) => {
      const goal = goals.find(g => g.id === goalId);
      return {
        goalId,
        goalTitle: goal?.title || data.title,
        actualMinutes: data.actualMinutes,
      };
    }).sort((a, b) => b.actualMinutes - a.actualMinutes);

    return {
      startDate,
      endDate,
      totalPlannedCommitments: totalPlanned,
      totalCompletedCommitments: totalCompleted,
      totalPostponedCommitments: totalPostponed,
      totalAbandonedCommitments: totalAbandoned,
      totalBlockedCommitments: totalBlocked,
      overallExecutionRate,
      totalPlannedMinutes,
      totalActualMinutes,
      overallTimeRatio,
      totalInterruptions,
      totalPauseMinutes,
      dailyBreakdown,
      blockerCategoriesCount,
      reasonCategoriesCount,
      projectTimeDistribution,
      goalTimeDistribution,
    };
  }
}
