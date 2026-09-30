/**
 * TaskStateMachine.ts
 * Rigorous deterministic state machine for NICK OS task execution lifecycle.
 * Prevents invalid state transitions, race-induced corruptions, and invalid status mutations.
 */

import { TaskStatus } from '../../types/domain';

export const VALID_TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  inbox: ['planned', 'todo', 'abandoned', 'cancelled'],
  todo: ['planned', 'in_progress', 'completed', 'postponed', 'abandoned', 'cancelled', 'inbox'],
  planned: ['in_progress', 'completed', 'postponed', 'blocked', 'abandoned', 'cancelled', 'todo'],
  in_progress: ['completed', 'postponed', 'blocked', 'abandoned', 'planned'],
  blocked: ['in_progress', 'planned', 'postponed', 'abandoned'],
  postponed: ['planned', 'in_progress', 'todo', 'inbox', 'abandoned'],
  completed: ['planned', 'in_progress', 'todo'], // explicit reopening
  abandoned: ['inbox', 'todo', 'planned'],       // explicit restore
  cancelled: ['inbox', 'todo', 'planned'],       // explicit restore
};

export class TaskStateMachine {
  /**
   * Check whether a transition from one status to another is valid.
   */
  public static canTransition(from: TaskStatus, to: TaskStatus): boolean {
    if (from === to) return true;
    const allowed = VALID_TASK_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Validate a transition and return detailed explanation if invalid.
   */
  public static validateTransition(
    from: TaskStatus,
    to: TaskStatus
  ): { valid: boolean; error?: string } {
    if (from === to) return { valid: true };
    if (!this.canTransition(from, to)) {
      const allowed = VALID_TASK_TRANSITIONS[from] || [];
      return {
        valid: false,
        error: `Invalid task transition: Cannot move task from "${from}" to "${to}". Allowed targets: [${allowed.join(', ')}].`,
      };
    }
    return { valid: true };
  }

  /**
   * Asserts validity of transition, throwing an explicit Error if invalid.
   */
  public static assertValidTransition(from: TaskStatus, to: TaskStatus): void {
    const result = this.validateTransition(from, to);
    if (!result.valid) {
      throw new Error(result.error);
    }
  }

  /**
   * Check if status is an active execution state.
   */
  public static isExecutionState(status: TaskStatus): boolean {
    return status === 'in_progress';
  }

  /**
   * Check if status is a completed or closed state.
   */
  public static isSettledState(status: TaskStatus): boolean {
    return status === 'completed' || status === 'abandoned' || status === 'cancelled';
  }
}
