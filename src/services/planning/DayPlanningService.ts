import { DayPlan, Commitment } from '../../types/domain';
import { getRepository } from '../storage';
import { getTodayString } from '../../lib/utils';

export class DayPlanningService {
  private repo = getRepository();

  /**
   * Fetch today's execution plan
   */
  async getTodayPlan(date: string = getTodayString()): Promise<DayPlan | null> {
    return this.repo.getDayPlan(date);
  }

  /**
   * Save or update Nick's plan
   */
  async commitDayPlan(params: {
    date: string;
    focusGoalToday: string;
    plannedTaskIds: string[];
    energyTarget: 'maximum' | 'steady' | 'recovery';
    notes?: string;
  }): Promise<DayPlan> {
    const tasks = await this.repo.getTasks();
    const plannedTasks = tasks.filter(t => params.plannedTaskIds.includes(t.id));
    const totalPlannedMinutes = plannedTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
    const totalActualMinutes = plannedTasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);

    const planData: Omit<DayPlan, 'id'> = {
      date: params.date,
      status: 'active',
      generatedByAi: false,
      approvedByUser: true,
      confirmedByNick: true,
      confirmedAt: new Date().toISOString(),
      plannedTaskIds: params.plannedTaskIds,
      focusGoalToday: params.focusGoalToday,
      energyTarget: params.energyTarget,
      notes: params.notes,
      executionScore: 0,
      totalPlannedMinutes,
      totalActualMinutes,
    };

    return this.repo.saveDayPlan(planData);
  }

  /**
   * Approve or reject a commitment (decision maker: Nick)
   */
  async toggleCommitmentApproval(commitmentId: string, approved: boolean): Promise<Commitment> {
    return this.repo.updateCommitment(commitmentId, {
      isApprovedByNick: approved,
      approvedAt: approved ? new Date().toISOString() : undefined,
      status: approved ? 'confirmed' : 'pending',
    });
  }
}

export const dayPlanningService = new DayPlanningService();
