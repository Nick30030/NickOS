import { 
  Notification, 
  NotificationPreferences, 
  DeviceSubscription, 
  NotificationPriority,
  NotificationStatus,
  NotificationEventType
} from '../../types/notification';
import { generateId } from '../../lib/utils';

// Server-side database state
let serverNotifications: Notification[] = [];
let serverDevices: DeviceSubscription[] = [];
let serverPreferences: NotificationPreferences = {
  enableNotifications: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  reminderLeadTime: 10,
  accountabilityReminderTime: '21:00',
  enableTaskReminders: true,
  enableScheduleChange: true,
  enableAiProposals: true,
  enableInterruptionReminders: true,
  enableDailyReview: true,
};

// Idempotency trackers
const processedIdempotencyKeys = new Set<string>();

/**
 * DETERMINISTIC SERVER-SIDE NOTIFICATION ENGINE
 */
export class ServerNotificationEngine {
  
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

  /**
   * Evaluates if a given time falls inside quiet hours
   */
  public static isQuietHours(timeStr: string, prefs: NotificationPreferences): boolean {
    const currentMins = this.parseTimeToMinutes(timeStr);
    const startMins = this.parseTimeToMinutes(prefs.quietHoursStart);
    const endMins = this.parseTimeToMinutes(prefs.quietHoursEnd);

    if (startMins === endMins) return false;

    if (startMins < endMins) {
      // Quiet hours in same day (e.g. 13:00 - 15:00)
      return currentMins >= startMins && currentMins < endMins;
    } else {
      // Quiet hours spans midnight (e.g. 22:00 - 07:00)
      return currentMins >= startMins || currentMins < endMins;
    }
  }

  /**
   * Retrieve list of notifications
   */
  public static getNotifications(): Notification[] {
    return serverNotifications;
  }

  /**
   * Create & store a notification
   */
  public static createNotification(notif: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Notification {
    const now = new Date().toISOString();
    const id = generateId();
    
    if (notif.idempotencyKey) {
      if (processedIdempotencyKeys.has(notif.idempotencyKey)) {
        const found = serverNotifications.find(n => n.idempotencyKey === notif.idempotencyKey);
        if (found) return found;
      }
      processedIdempotencyKeys.add(notif.idempotencyKey);
    }

    const newNotification: Notification = {
      ...notif,
      id,
      createdAt: now,
      updatedAt: now,
    };

    serverNotifications.unshift(newNotification);
    return newNotification;
  }

  /**
   * Event-Driven Trigger Protocol
   * Maps rich backend domain events to custom notifications based on Nick's rules
   */
  public static triggerEvent(eventType: NotificationEventType, payload: any): Notification | null {
    if (!serverPreferences.enableNotifications) {
      console.log(`[ServerNotificationEngine] Notifications disabled by preferences. Skipping event: ${eventType}`);
      return null;
    }

    const idempotencyKey = payload.idempotencyKey || `${eventType}:${payload.id || payload.taskId || 'generic'}:${payload.scheduledTime || 'now'}`;
    if (processedIdempotencyKeys.has(idempotencyKey)) {
      console.log(`[ServerNotificationEngine] Skipping trigger for duplicate idempotency key: ${idempotencyKey}`);
      return null;
    }

    let title = '';
    let body = '';
    let priority: NotificationPriority = 'normal';
    let type = 'system_alert';
    let deepLink = '#/dashboard';

    switch (eventType) {
      case NotificationEventType.TASK_DUE_SOON:
        if (!serverPreferences.enableTaskReminders) return null;
        title = 'Upcoming Block reminder';
        body = `Your next block starts in ${serverPreferences.reminderLeadTime} minutes.`;
        priority = 'normal';
        type = 'now_alert';
        deepLink = '#/now';
        break;

      case NotificationEventType.TASK_STARTING:
        if (!serverPreferences.enableTaskReminders) return null;
        title = 'Focus Block Starting Now';
        body = `It's time for: ${payload.taskTitle || 'Scheduled Task'}.`;
        priority = 'high';
        type = 'now_alert';
        deepLink = '#/now';
        break;

      case NotificationEventType.TASK_OVERDUE:
        if (!serverPreferences.enableTaskReminders) return null;
        title = 'Focus Block Overdue';
        body = `[${payload.taskTitle || 'Task'}] is still unresolved. Keep executing.`;
        priority = 'high';
        type = 'now_alert';
        deepLink = '#/now';
        break;

      case NotificationEventType.DAY_REVIEW_DUE:
        if (!serverPreferences.enableDailyReview) return null;
        title = 'Daily Review Available';
        body = payload.unresolvedCount > 0 
          ? `You have ${payload.unresolvedCount} unresolved commitments to review.` 
          : 'Your daily review is ready. Finalize your execution scores now.';
        priority = 'high';
        type = 'accountability_review';
        deepLink = '#/accountability';
        break;

      case NotificationEventType.AI_PROPOSAL_READY:
        if (!serverPreferences.enableAiProposals) return null;
        title = 'Nick OS AI Brain suggestion';
        body = 'Nick OS has a planning suggestion for you.';
        priority = 'normal';
        type = 'ai_proposal';
        deepLink = `#/ai?proposalId=${payload.proposalId || ''}`;
        break;

      case NotificationEventType.PLAN_CHANGED:
        if (!serverPreferences.enableScheduleChange) return null;
        title = 'Schedule update';
        body = `Your schedule was updated. Deep Link to verify planned blocks.`;
        priority = 'low';
        type = 'schedule_change';
        deepLink = '#/today';
        break;

      case NotificationEventType.COMMITMENT_MISSED:
        title = 'Missed focus commitment';
        body = `You missed a planned commitment: "${payload.taskTitle || 'Task'}". Prepare to reconcile.`;
        priority = 'critical';
        type = 'system_alert';
        deepLink = '#/accountability';
        break;

      case NotificationEventType.EXECUTION_SESSION_INTERRUPTED:
        if (!serverPreferences.enableInterruptionReminders) return null;
        title = 'Focus Session Interrupted';
        body = 'Securing focus. Log your distraction to resume execution.';
        priority = 'high';
        type = 'system_alert';
        deepLink = '#/now';
        break;

      default:
        title = payload.title || 'Notification';
        body = payload.body || '';
        priority = payload.priority || 'normal';
    }

    // Apply quiet hours filter unless priority is critical
    const currentHourStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    if (this.isQuietHours(currentHourStr, serverPreferences) && priority !== 'critical' && priority !== 'high') {
      console.log(`[ServerNotificationEngine] Suppressing non-critical event [${eventType}] during quiet hours.`);
      return this.createNotification({
        userId: 'nick-sovereign',
        type,
        title,
        body,
        priority,
        scheduledFor: new Date().toISOString(),
        status: 'scheduled', // Keep as scheduled to deliver post-quiet hours
        metadata: { ...payload.metadata, deepLink },
        idempotencyKey,
      });
    }

    // Process notification as pending/sent
    const notif = this.createNotification({
      userId: 'nick-sovereign',
      type,
      title,
      body,
      priority,
      scheduledFor: new Date().toISOString(),
      status: 'pending',
      metadata: { ...payload.metadata, deepLink },
      idempotencyKey,
    });

    this.dispatchPushNotification(notif);
    return notif;
  }

  /**
   * Device push notification dispatch (Web Push dispatch pipeline)
   */
  private static dispatchPushNotification(notif: Notification) {
    notif.status = 'sent';
    notif.deliveredAt = new Date().toISOString();

    console.log(`[ServerNotificationEngine PUSH DISPATCH]`);
    console.log(`  Title: ${notif.title}`);
    console.log(`  Body: ${notif.body}`);
    console.log(`  Priority: ${notif.priority}`);
    console.log(`  Link: ${notif.metadata?.deepLink || 'None'}`);

    if (serverDevices.length === 0) {
      console.log(`  -> No devices registered. Notification queued in db.`);
      return;
    }

    serverDevices.forEach(device => {
      console.log(`  -> Delivering via push channel to device: [${device.deviceName}]`);
    });

    notif.status = 'delivered';
  }

  /**
   * Scheduler Loop: periodically evaluates upcoming blocks/reminders
   * Designed to continue running on the server independently of the client
   */
  public static runSchedulingCycle(
    timeBlocks: any[], 
    tasks: any[], 
    accountabilityRecords: any[],
    proposals: any[],
    currentTimeStr?: string
  ): Notification[] {
    const generated: Notification[] = [];
    const now = new Date();
    const currentMins = currentTimeStr 
      ? this.parseTimeToMinutes(currentTimeStr)
      : now.getHours() * 60 + now.getMinutes();

    const formattedTime = currentTimeStr || now.toTimeString().slice(0, 5);

    // 1. Task Reminders & Starting blocks
    timeBlocks.forEach(tb => {
      if (tb.status === 'scheduled' || tb.status === 'planned') {
        const startMins = this.parseTimeToMinutes(tb.startTime);
        const leadTime = serverPreferences.reminderLeadTime;

        // Trigger starting block (10 mins lead)
        if (startMins - currentMins === leadTime && startMins - currentMins > 0) {
          const matchedTask = tasks.find(t => t.id === tb.taskId);
          const notif = this.triggerEvent(NotificationEventType.TASK_DUE_SOON, {
            id: tb.id,
            taskTitle: matchedTask?.title || tb.title,
            scheduledTime: tb.startTime,
            idempotencyKey: `lead:${tb.id}:${tb.startTime}`,
          });
          if (notif) generated.push(notif);
        }

        // Trigger block start alert (exact startTime match)
        if (startMins === currentMins) {
          const matchedTask = tasks.find(t => t.id === tb.taskId);
          const notif = this.triggerEvent(NotificationEventType.TASK_STARTING, {
            id: tb.id,
            taskTitle: matchedTask?.title || tb.title,
            scheduledTime: tb.startTime,
            idempotencyKey: `start:${tb.id}:${tb.startTime}`,
          });
          if (notif) generated.push(notif);
        }

        // Trigger overdue blocker reminder
        const endMins = this.parseTimeToMinutes(tb.endTime);
        if (currentMins > endMins && tb.status !== 'completed' && tb.taskId) {
          const matchedTask = tasks.find(t => t.id === tb.taskId);
          if (matchedTask && matchedTask.status !== 'completed') {
            const notif = this.triggerEvent(NotificationEventType.TASK_OVERDUE, {
              id: matchedTask.id,
              taskTitle: matchedTask.title,
              scheduledTime: tb.endTime,
              idempotencyKey: `overdue:${matchedTask.id}:${tb.endTime}`,
            });
            if (notif) generated.push(notif);
          }
        }
      }
    });

    // 2. Accountability Review due (exact match of configured review time)
    const reviewMins = this.parseTimeToMinutes(serverPreferences.accountabilityReminderTime);
    if (currentMins === reviewMins) {
      // Find incomplete focus commitments
      const incompleteCount = tasks.filter(t => t.status !== 'completed' && t.status !== 'abandoned' && t.priority === 'high').length;
      const notif = this.triggerEvent(NotificationEventType.DAY_REVIEW_DUE, {
        unresolvedCount: incompleteCount,
        idempotencyKey: `review:${new Date().toISOString().slice(0, 10)}`,
      });
      if (notif) generated.push(notif);
    }

    // 3. AI Proposals triggering (any pending proposal generated today not yet sent)
    proposals.forEach(p => {
      if (p.status === 'pending') {
        const notif = this.triggerEvent(NotificationEventType.AI_PROPOSAL_READY, {
          proposalId: p.id,
          idempotencyKey: `proposal:${p.id}`,
        });
        if (notif) generated.push(notif);
      }
    });

    return generated;
  }

  /**
   * Preferences API integration
   */
  public static getPreferences(): NotificationPreferences {
    return serverPreferences;
  }

  public static updatePreferences(prefs: NotificationPreferences): NotificationPreferences {
    serverPreferences = { ...serverPreferences, ...prefs };
    return serverPreferences;
  }

  /**
   * Devices management API integration
   */
  public static getDevices(): DeviceSubscription[] {
    return serverDevices;
  }

  public static registerDevice(device: DeviceSubscription): DeviceSubscription {
    const existingIdx = serverDevices.findIndex(d => d.endpoint === device.endpoint);
    if (existingIdx !== -1) {
      serverDevices[existingIdx] = device;
    } else {
      serverDevices.push(device);
    }
    return device;
  }

  public static removeDevice(endpoint: string): boolean {
    const before = serverDevices.length;
    serverDevices = serverDevices.filter(d => d.endpoint !== endpoint);
    return serverDevices.length < before;
  }

  /**
   * Reset helper for testing
   */
  public static clearAll() {
    serverNotifications = [];
    serverDevices = [];
    processedIdempotencyKeys.clear();
  }
}
