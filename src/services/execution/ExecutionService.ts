import {
  Task,
  ExecutionSession,
  ExecutionSessionStatus,
  SessionPause,
  SessionCheckIn,
  TimeBlock,
  ExecutionMetrics,
} from '../../types/domain';
import { getRepository } from '../storage';
import { generateId, getCurrentTimeString } from '../../lib/utils';
import { TaskStateMachine } from './TaskStateMachine';

export interface StartSessionParams {
  taskId: string;
  timeBlockId?: string;
  notes?: string;
  userId?: string;
}

export interface PauseSessionParams {
  sessionId: string;
  reason?: string;
  category?: SessionPause['category'];
}

export interface CompleteSessionParams {
  sessionId: string;
  notes?: string;
  finalActualMinutes?: number;
}

export interface AbandonSessionParams {
  sessionId: string;
  reason: string;
  action?: 'abandon' | 'postpone';
  targetDate?: string;
}

export interface CheckInParams {
  sessionId: string;
  type: SessionCheckIn['type'];
  note?: string;
}

export class ExecutionService {
  private get repo() {
    return getRepository();
  }

  /**
   * Helper: Calculate real active duration in seconds from timestamps and pauses.
   * Prevents drift and guarantees resilience on browser refresh.
   */
  public calculateSessionActiveSeconds(session: ExecutionSession, asOfTime = new Date()): number {
    const startMs = new Date(session.startTime).getTime();
    if (isNaN(startMs)) return session.durationSeconds || 0;

    const endMs = session.endTime ? new Date(session.endTime).getTime() : asOfTime.getTime();
    const totalElapsedMs = Math.max(0, endMs - startMs);
    let totalElapsedSeconds = Math.floor(totalElapsedMs / 1000);

    // Sum all completed pauses
    let totalPauseSeconds = 0;
    if (session.pauses && session.pauses.length > 0) {
      for (const pause of session.pauses) {
        const pauseStartMs = new Date(pause.pausedAt).getTime();
        const pauseEndMs = pause.resumedAt
          ? new Date(pause.resumedAt).getTime()
          : session.endTime
          ? new Date(session.endTime).getTime()
          : asOfTime.getTime();

        if (!isNaN(pauseStartMs) && !isNaN(pauseEndMs) && pauseEndMs >= pauseStartMs) {
          totalPauseSeconds += Math.floor((pauseEndMs - pauseStartMs) / 1000);
        }
      }
    }

    const netActiveSeconds = Math.max(0, totalElapsedSeconds - totalPauseSeconds);
    return netActiveSeconds;
  }

  /**
   * Get the active or paused focus session if one exists in database.
   */
  async getActiveSession(): Promise<ExecutionSession | null> {
    return this.repo.getActiveSession();
  }

  /**
   * START an execution session.
   * - Ensures no other session remains un-settled (pauses any currently active session).
   * - Creates the execution session record in the database.
   * - Marks task as in_progress and records startedAt.
   * - Marks linked time block as in_progress and sets actualStart.
   */
  async startSession(params: StartSessionParams): Promise<{ session: ExecutionSession; task: Task }> {
    const { taskId, timeBlockId, notes, userId } = params;
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Check for any existing active session and pause it cleanly
    const existingActive = await this.repo.getActiveSession();
    if (existingActive && existingActive.status === 'active' && existingActive.taskId !== taskId) {
      await this.pauseSession({
        sessionId: existingActive.id,
        reason: 'Switched to a different focus task',
        category: 'other',
      });
    }

    // 2. If existing active session is for the SAME task, resume it instead of creating duplicates
    if (existingActive && existingActive.taskId === taskId) {
      if (existingActive.status === 'paused') {
        const resumed = await this.resumeSession(existingActive.id);
        const task = (await this.repo.getTaskById(taskId)) || (await this.transitionTaskStatus(taskId, 'in_progress'));
        return { session: resumed, task };
      }
      const currentTask = (await this.repo.getTaskById(taskId))!;
      return { session: existingActive, task: currentTask };
    }

    // 3. Create initial check-in entry
    const initialCheckIn: SessionCheckIn = {
      id: generateId('chk'),
      timestamp: nowIso,
      type: 'working',
      note: 'Focus session initiated with cognitive clarity',
    };

    // 4. Create new execution session in storage
    const newSession = await this.repo.createExecutionSession({
      userId,
      taskId,
      timeBlockId,
      startTime: nowIso,
      durationSeconds: 0,
      durationMinutes: 0,
      status: 'active',
      pauses: [],
      checkIns: [initialCheckIn],
      lastHeartbeatAt: nowIso,
      heartbeatCount: 1,
      interruptionStatus: false,
      notes,
    });

    // 5. Update Task status to in_progress
    const task = await this.transitionTaskStatus(taskId, 'in_progress');

    // 6. Update Time Block if provided
    if (timeBlockId) {
      try {
        await this.repo.updateTimeBlock(timeBlockId, {
          status: 'in_progress',
          actualStart: getCurrentTimeString(),
        });
      } catch (err) {
        console.warn('Could not update time block status on start:', err);
      }
    }

    return { session: newSession, task };
  }

  /**
   * PAUSE an execution session.
   * - Records pause timestamp and pause reason / category (distraction, break, meeting, blocker, etc.)
   * - Calculates net active seconds up to now and updates session.
   */
  async pauseSession(params: PauseSessionParams): Promise<ExecutionSession> {
    const { sessionId, reason = 'Break / Interruption', category = 'distraction' } = params;
    const session = await this.repo.getSessionById(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    if (session.status !== 'active') {
      return session; // Already paused or completed
    }

    const now = new Date();
    const nowIso = now.toISOString();

    const activeSeconds = this.calculateSessionActiveSeconds(session, now);

    const newPause: SessionPause = {
      id: generateId('pause'),
      pausedAt: nowIso,
      reason,
      category,
    };

    const updatedPauses = [...(session.pauses || []), newPause];

    const updatedSession = await this.repo.updateExecutionSession(sessionId, {
      status: 'paused',
      durationSeconds: activeSeconds,
      durationMinutes: Math.round(activeSeconds / 60),
      pauses: updatedPauses,
      interruptionStatus: true,
      interruptionReason: reason,
      lastHeartbeatAt: nowIso,
    });

    return updatedSession;
  }

  /**
   * RESUME an execution session.
   * - Closes the last open pause item with resumedAt.
   * - Sets session status back to 'active'.
   */
  async resumeSession(sessionId: string): Promise<ExecutionSession> {
    const session = await this.repo.getSessionById(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    if (session.status === 'active') {
      return session;
    }

    const now = new Date();
    const nowIso = now.toISOString();

    let updatedPauses = session.pauses || [];
    if (updatedPauses.length > 0) {
      const lastPause = updatedPauses[updatedPauses.length - 1];
      if (!lastPause.resumedAt) {
        const pauseDurationMs = Math.max(0, now.getTime() - new Date(lastPause.pausedAt).getTime());
        const closedPause: SessionPause = {
          ...lastPause,
          resumedAt: nowIso,
          durationSeconds: Math.floor(pauseDurationMs / 1000),
        };
        updatedPauses = [...updatedPauses.slice(0, -1), closedPause];
      }
    }

    const updatedSession = await this.repo.updateExecutionSession(sessionId, {
      status: 'active',
      pauses: updatedPauses,
      lastHeartbeatAt: nowIso,
      heartbeatCount: (session.heartbeatCount || 1) + 1,
    });

    // Ensure task status is in_progress
    if (session.taskId) {
      await this.transitionTaskStatus(session.taskId, 'in_progress');
    }

    return updatedSession;
  }

  /**
   * COMPLETE an execution session.
   * - Calculates final actual active duration.
   * - Closes session with endTime and status 'completed'.
   * - Marks task as 'completed', sets completedAt and adds actualMinutes.
   * - Marks linked time block as 'completed'.
   */
  async completeSession(params: CompleteSessionParams): Promise<{ session: ExecutionSession; task: Task }> {
    const { sessionId, notes, finalActualMinutes } = params;
    const session = await this.repo.getSessionById(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const now = new Date();
    const nowIso = now.toISOString();

    // Close any open pause
    let updatedPauses = session.pauses || [];
    if (updatedPauses.length > 0) {
      const lastPause = updatedPauses[updatedPauses.length - 1];
      if (!lastPause.resumedAt) {
        const pauseDurationMs = Math.max(0, now.getTime() - new Date(lastPause.pausedAt).getTime());
        updatedPauses = [
          ...updatedPauses.slice(0, -1),
          {
            ...lastPause,
            resumedAt: nowIso,
            durationSeconds: Math.floor(pauseDurationMs / 1000),
          },
        ];
      }
    }

    const finalActiveSeconds = this.calculateSessionActiveSeconds(
      { ...session, pauses: updatedPauses, endTime: nowIso },
      now
    );

    const calculatedMinutes = Math.max(1, Math.round(finalActiveSeconds / 60));
    const effectiveActualMinutes = finalActualMinutes !== undefined ? finalActualMinutes : calculatedMinutes;

    const completedSession = await this.repo.updateExecutionSession(sessionId, {
      status: 'completed',
      endTime: nowIso,
      durationSeconds: finalActiveSeconds,
      durationMinutes: effectiveActualMinutes,
      pauses: updatedPauses,
      notes: notes || session.notes,
      lastHeartbeatAt: nowIso,
    });

    // Update Task
    const existingTask = await this.repo.getTaskById(session.taskId);
    let updatedTask: Task;
    if (existingTask) {
      const accumulatedActual = (existingTask.actualMinutes || 0) + effectiveActualMinutes;
      updatedTask = await this.repo.updateTask(existingTask.id, {
        status: 'completed',
        completedAt: nowIso,
        actualMinutes: accumulatedActual,
      });
    } else {
      throw new Error(`Associated task ${session.taskId} not found`);
    }

    // Update Time Block if present
    if (session.timeBlockId) {
      try {
        await this.repo.updateTimeBlock(session.timeBlockId, {
          status: 'completed',
          actualEnd: getCurrentTimeString(),
        });
      } catch (err) {
        console.warn('Could not complete associated time block:', err);
      }
    }

    return { session: completedSession, task: updatedTask };
  }

  /**
   * ABANDON or POSTPONE an execution session.
   * - Safely seals the session as 'abandoned' or 'postponed' with explicit reason.
   * - Preserves actual time worked up to the abandonment point.
   * - Transitions task status accordingly.
   */
  async abandonSession(params: AbandonSessionParams): Promise<{ session: ExecutionSession; task: Task }> {
    const { sessionId, reason, action = 'postpone', targetDate } = params;
    const session = await this.repo.getSessionById(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const now = new Date();
    const nowIso = now.toISOString();

    const activeSeconds = this.calculateSessionActiveSeconds(session, now);
    const actualMinutesWorked = Math.max(0, Math.round(activeSeconds / 60));

    const updatedSession = await this.repo.updateExecutionSession(sessionId, {
      status: action === 'abandon' ? 'abandoned' : 'postponed',
      endTime: nowIso,
      durationSeconds: activeSeconds,
      durationMinutes: actualMinutesWorked,
      abandonReason: reason,
      interruptionReason: reason,
      interruptionStatus: true,
      lastHeartbeatAt: nowIso,
    });

    // Update task
    const task = await this.repo.getTaskById(session.taskId);
    if (!task) throw new Error(`Task ${session.taskId} not found`);

    const updatedTask = await this.repo.updateTask(task.id, {
      status: action === 'abandon' ? 'cancelled' : targetDate ? 'planned' : 'postponed',
      scheduledDate: targetDate || task.scheduledDate,
      actualMinutes: (task.actualMinutes || 0) + actualMinutesWorked,
    });

    // Update time block to deviated if linked
    if (session.timeBlockId) {
      try {
        await this.repo.updateTimeBlock(session.timeBlockId, {
          status: 'deviated',
          notes: `Session ${action}ed: ${reason}`,
          actualEnd: getCurrentTimeString(),
        });
      } catch (err) {
        console.warn('Could not update time block status:', err);
      }
    }

    return { session: updatedSession, task: updatedTask };
  }

  /**
   * HEARTBEAT
   * - Lightweight signal proving the execution interface is open and active.
   * - Updates lastHeartbeatAt timestamp and increments heartbeatCount.
   * - Periodically persists up-to-date active duration to storage to prevent data loss.
   */
  async recordHeartbeat(sessionId: string): Promise<ExecutionSession | null> {
    try {
      const session = await this.repo.getSessionById(sessionId);
      if (!session || session.status !== 'active') return null;

      const now = new Date();
      const currentActiveSeconds = this.calculateSessionActiveSeconds(session, now);

      return await this.repo.updateExecutionSession(sessionId, {
        lastHeartbeatAt: now.toISOString(),
        heartbeatCount: (session.heartbeatCount || 0) + 1,
        durationSeconds: currentActiveSeconds,
        durationMinutes: Math.round(currentActiveSeconds / 60),
      });
    } catch (err) {
      console.warn('Heartbeat update failed:', err);
      return null;
    }
  }

  /**
   * MANUAL CHECK-IN
   * - Explicit signals: 'working' | 'distracted' | 'break' | 'blocked' | 'milestone'
   * - Logs the check-in event to the session history.
   */
  async recordCheckIn(params: CheckInParams): Promise<ExecutionSession> {
    const { sessionId, type, note } = params;
    const session = await this.repo.getSessionById(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const nowIso = new Date().toISOString();
    const newCheckIn: SessionCheckIn = {
      id: generateId('chk'),
      timestamp: nowIso,
      type,
      note: note || `Manual check-in: ${type}`,
    };

    const updatedCheckIns = [...(session.checkIns || []), newCheckIn];

    // If check-in indicates distraction or break, auto-pause with reason
    if (type === 'distracted' || type === 'break') {
      return this.pauseSession({
        sessionId,
        reason: note || (type === 'distracted' ? 'Distraction acknowledged' : 'Short restorative break'),
        category: type === 'distracted' ? 'distraction' : 'break',
      });
    }

    return this.repo.updateExecutionSession(sessionId, {
      checkIns: updatedCheckIns,
      lastHeartbeatAt: nowIso,
    });
  }

  /**
   * Retrieve execution session history with filtering.
   */
  async getExecutionHistory(filters?: { taskId?: string; date?: string; status?: string }): Promise<ExecutionSession[]> {
    return this.repo.getExecutionSessions(filters);
  }

  /**
   * Calculate real-time planned vs actual metrics
   */
  async computeDailyMetrics(date: string): Promise<ExecutionMetrics> {
    return this.repo.getExecutionMetrics(date);
  }

  /**
   * Transition task status safely with strict state machine validation
   */
  async transitionTaskStatus(taskId: string, newStatus: Task['status']): Promise<Task> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    // Enforce explicit state machine validation
    TaskStateMachine.assertValidTransition(task.status, newStatus);

    const updates: Partial<Task> = { status: newStatus };
    if (newStatus === 'in_progress' && !task.startedAt) {
      updates.startedAt = new Date().toISOString();
    }
    if (newStatus === 'completed') {
      updates.completedAt = new Date().toISOString();
      if (!task.actualMinutes || task.actualMinutes === 0) {
        updates.actualMinutes = task.estimatedMinutes || 25;
      }
    }

    return this.repo.updateTask(taskId, updates);
  }

  /**
   * Add active execution elapsed minutes
   */
  async addActualExecutionTime(taskId: string, minutes: number): Promise<Task> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const currentActual = task.actualMinutes || 0;
    return this.repo.updateTask(taskId, {
      actualMinutes: currentActual + minutes,
    });
  }

  /**
   * Postpone a task with optional new date and status
   */
  async postponeTask(taskId: string, targetDate?: string): Promise<Task> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const updates: Partial<Task> = {
      status: targetDate ? 'planned' : 'postponed',
      scheduledDate: targetDate || undefined,
    };
    return this.repo.updateTask(taskId, updates);
  }

  /**
   * Update arbitrary task fields
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    return this.repo.updateTask(taskId, updates);
  }

  /**
   * Toggle checklist item on a task
   */
  async toggleChecklistItem(taskId: string, checkId: string): Promise<Task> {
    const task = await this.repo.getTaskById(taskId);
    if (!task || !task.checklist) throw new Error(`Task ${taskId} or checklist not found`);

    const updatedChecklist = task.checklist.map(item =>
      item.id === checkId ? { ...item, done: !item.done } : item
    );

    return this.repo.updateTask(taskId, { checklist: updatedChecklist });
  }
}

export const executionService = new ExecutionService();
