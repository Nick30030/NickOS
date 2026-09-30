/**
 * BackgroundJobEngine.ts
 * Sovereign Production Background Job and Scheduled Task Engine for NICK OS.
 * Handles:
 * 1. Stale execution session auto-recovery (detects unclosed sessions after inactivity)
 * 2. Scheduled notification cycle execution
 * 3. Daily accountability snapshot generation
 * 4. Data retention and cleanup (idempotency keys, old audit logs)
 * 5. Full observability, error recovery, and audit tracking
 */

import { ServerNotificationEngine } from '../notifications/ServerNotificationEngine';
import { ObservabilityService } from '../observability/ObservabilityService';

export interface BackgroundJobLog {
  id: string;
  jobName: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  recordsProcessed: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export class BackgroundJobEngine {
  private static jobLogs: BackgroundJobLog[] = [];
  private static readonly MAX_IN_MEMORY_LOGS = 100;
  private static isRunningCycle = false;

  // Stale session threshold (default 120 minutes = 2 hours)
  private static readonly STALE_SESSION_THRESHOLD_MS = 2 * 60 * 60 * 1000;

  /**
   * Helper to record execution audit trail
   */
  public static startJobLog(jobName: string, metadata?: Record<string, unknown>): BackgroundJobLog {
    const log: BackgroundJobLog = {
      id: `job-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      jobName,
      status: 'running',
      startedAt: new Date().toISOString(),
      recordsProcessed: 0,
      metadata,
    };
    this.jobLogs.unshift(log);
    if (this.jobLogs.length > this.MAX_IN_MEMORY_LOGS) {
      this.jobLogs.pop();
    }
    return log;
  }

  public static finishJobLog(
    log: BackgroundJobLog,
    status: 'completed' | 'failed',
    recordsProcessed: number,
    errorMessage?: string
  ): void {
    const startMs = new Date(log.startedAt).getTime();
    log.status = status;
    log.completedAt = new Date().toISOString();
    log.durationMs = Math.max(0, Date.now() - startMs);
    log.recordsProcessed = recordsProcessed;
    if (errorMessage) {
      log.errorMessage = errorMessage;
      ObservabilityService.recordError('background', new Error(errorMessage), {
        jobId: log.id,
        jobName: log.jobName,
      });
    }
  }

  /**
   * Retrieve background job audit logs
   */
  public static getJobLogs(limit = 20): BackgroundJobLog[] {
    return this.jobLogs.slice(0, limit);
  }

  /**
   * 1. STALE EXECUTION SESSION AUTO-RECOVERY
   * Detects sessions left in 'active' status where the last heartbeat or start time is older
   * than 2 hours. Automatically pauses or transitions them with an auto-recovery note.
   */
  public static recoverStaleSessions(
    sessions: any[],
    onSessionRecovered?: (updatedSession: any) => void
  ): { recoveredCount: number; recoveredSessions: any[] } {
    const job = this.startJobLog('stale_session_recovery');
    const now = Date.now();
    const recoveredSessions: any[] = [];

    try {
      for (const session of sessions) {
        if (session.status === 'active') {
          const lastActivityTime = session.lastHeartbeatAt 
            ? new Date(session.lastHeartbeatAt).getTime() 
            : new Date(session.startTime).getTime();

          const ageMs = now - lastActivityTime;
          if (ageMs > this.STALE_SESSION_THRESHOLD_MS) {
            const autoRecoveryNote = `[AUTO-RECOVERED] Focus session automatically paused by NICK OS background engine after ${Math.round(ageMs / (60 * 1000))} minutes of inactivity.`;
            
            const recovered = {
              ...session,
              status: 'paused',
              interruptionStatus: true,
              interruptionReason: 'System auto-pause due to inactive client heartbeat',
              notes: session.notes ? `${session.notes}\n${autoRecoveryNote}` : autoRecoveryNote,
              updatedAt: new Date().toISOString(),
            };

            recoveredSessions.push(recovered);
            if (onSessionRecovered) {
              onSessionRecovered(recovered);
            }
          }
        }
      }

      this.finishJobLog(job, 'completed', recoveredSessions.length);
      return { recoveredCount: recoveredSessions.length, recoveredSessions };
    } catch (err: any) {
      this.finishJobLog(job, 'failed', recoveredSessions.length, err.message);
      return { recoveredCount: 0, recoveredSessions: [] };
    }
  }

  /**
   * 2. NOTIFICATION SCHEDULING CYCLE
   * Evaluates current time blocks, upcoming deadlines, and overdue commitments.
   */
  public static runNotificationCycle(
    timeBlocks: any[],
    tasks: any[],
    accountabilityRecords: any[],
    proposals: any[]
  ): { notificationsTriggered: number } {
    const job = this.startJobLog('notification_scheduler_cycle');
    try {
      const generated = ServerNotificationEngine.runSchedulingCycle(
        timeBlocks,
        tasks,
        accountabilityRecords,
        proposals
      );
      this.finishJobLog(job, 'completed', generated.length);
      return { notificationsTriggered: generated.length };
    } catch (err: any) {
      this.finishJobLog(job, 'failed', 0, err.message);
      return { notificationsTriggered: 0 };
    }
  }

  /**
   * 3. DAILY ACCOUNTABILITY RECONCILIATION
   * Generates or reconciles an accountability snapshot for a given date.
   */
  public static reconcileDailyAccountability(
    dateStr: string,
    tasks: any[],
    existingRecord?: any
  ): { record: any; isNew: boolean } {
    const job = this.startJobLog('accountability_reconciliation', { date: dateStr });
    try {
      const dayTasks = tasks.filter(t => t.scheduledDate === dateStr || t.dueDate === dateStr);
      const planned = dayTasks.length;
      const completed = dayTasks.filter(t => t.status === 'completed').length;
      const abandoned = dayTasks.filter(t => t.status === 'cancelled' || t.status === 'abandoned').length;
      const postponed = dayTasks.filter(t => t.status === 'postponed').length;
      const blocked = dayTasks.filter(t => t.status === 'blocked').length;
      const partiallyCompleted = dayTasks.filter(t => t.status === 'in_progress' || t.status === 'paused').length;
      const notStarted = dayTasks.filter(t => t.status === 'planned' || t.status === 'todo' || t.status === 'backlog').length;

      let plannedMinutes = 0;
      let actualMinutes = 0;
      dayTasks.forEach(t => {
        plannedMinutes += t.estimatedMinutes ?? t.estimatedDuration ?? 0;
        actualMinutes += t.actualMinutes ?? t.actualDuration ?? 0;
      });

      const executionRate = planned > 0 ? Math.round((completed / planned) * 100) : 0;
      const timeExecutionRatio = plannedMinutes > 0 ? parseFloat((actualMinutes / plannedMinutes).toFixed(2)) : 1.0;

      const record = {
        id: existingRecord?.id || `acc-${dateStr}-${Date.now().toString(36)}`,
        date: dateStr,
        plannedTasks: planned,
        completedTasks: completed,
        abandonedTasks: abandoned,
        postponedTasks: postponed,
        blockedTasks: blocked,
        notStartedTasks: notStarted,
        partiallyCompletedTasks: partiallyCompleted,
        plannedMinutes,
        actualMinutes,
        interruptionCount: existingRecord?.interruptionCount || 0,
        totalPauseMinutes: existingRecord?.totalPauseMinutes || 0,
        executionRate,
        timeExecutionRatio,
        reconciledCommitments: existingRecord?.reconciledCommitments || [],
        externalBlockers: existingRecord?.externalBlockers || [],
        concreteOutputs: existingRecord?.concreteOutputs || [],
        isFinalized: existingRecord?.isFinalized || false,
        notes: existingRecord?.notes || 'Automated reconciliation snapshot generated by NICK OS background engine.',
        generatedAt: new Date().toISOString(),
        createdAt: existingRecord?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.finishJobLog(job, 'completed', 1);
      return { record, isNew: !existingRecord };
    } catch (err: any) {
      this.finishJobLog(job, 'failed', 0, err.message);
      throw err;
    }
  }

  /**
   * 4. DATA RETENTION & CLEANUP
   * Removes stale audit logs and cleans up expired transient records.
   */
  public static cleanupTransientData(): { cleanedRecords: number } {
    const job = this.startJobLog('transient_data_cleanup');
    try {
      const initialCount = this.jobLogs.length;
      // Keep only recent 50 logs
      if (this.jobLogs.length > 50) {
        this.jobLogs = this.jobLogs.slice(0, 50);
      }
      const cleaned = Math.max(0, initialCount - this.jobLogs.length);
      this.finishJobLog(job, 'completed', cleaned);
      return { cleanedRecords: cleaned };
    } catch (err: any) {
      this.finishJobLog(job, 'failed', 0, err.message);
      return { cleanedRecords: 0 };
    }
  }

  /**
   * 5. RUN FULL AUTOMATED CYCLE
   * Orchestrates the standard recurring background loop.
   */
  public static async runFullCycle(data: {
    sessions?: any[];
    timeBlocks?: any[];
    tasks?: any[];
    accountabilityRecords?: any[];
    proposals?: any[];
    onSessionRecovered?: (updatedSession: any) => void;
  }): Promise<{
    staleSessionsRecovered: number;
    notificationsTriggered: number;
    cleanupCount: number;
  }> {
    if (this.isRunningCycle) {
      return { staleSessionsRecovered: 0, notificationsTriggered: 0, cleanupCount: 0 };
    }

    this.isRunningCycle = true;
    try {
      const staleRes = this.recoverStaleSessions(data.sessions || [], data.onSessionRecovered);
      const notifRes = this.runNotificationCycle(
        data.timeBlocks || [],
        data.tasks || [],
        data.accountabilityRecords || [],
        data.proposals || []
      );
      const cleanRes = this.cleanupTransientData();

      return {
        staleSessionsRecovered: staleRes.recoveredCount,
        notificationsTriggered: notifRes.notificationsTriggered,
        cleanupCount: cleanRes.cleanedRecords,
      };
    } finally {
      this.isRunningCycle = false;
    }
  }
}
