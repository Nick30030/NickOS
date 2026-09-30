// ==============================================================================
// NICK OS — NOTIFICATION MODELS & TYPES
// ==============================================================================

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export type NotificationStatus =
  | 'scheduled'
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'cancelled';

export interface Notification {
  id: string;
  userId: string;
  type: string; // e.g. 'task_reminder', 'now_alert', 'accountability_review', 'ai_proposal', 'system_alert'
  title: string;
  body: string;
  priority: NotificationPriority;
  scheduledFor: string; // ISO string or time string
  deliveredAt?: string; // ISO string
  readAt?: string;      // ISO string
  status: NotificationStatus;
  metadata?: Record<string, any>; // e.g. { taskId: 'abc', deepLink: '/tasks/abc' }
  idempotencyKey?: string; // e.g. 'event_type:taskId:scheduledFor'
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  enableNotifications: boolean;
  quietHoursStart: string; // "HH:MM" e.g., "22:00"
  quietHoursEnd: string;   // "HH:MM" e.g., "07:00"
  reminderLeadTime: number; // minutes e.g., 10
  accountabilityReminderTime: string; // "HH:MM" e.g., "21:00"
  enableTaskReminders: boolean;
  enableScheduleChange: boolean;
  enableAiProposals: boolean;
  enableInterruptionReminders: boolean;
  enableDailyReview: boolean;
}

export interface DeviceSubscription {
  id: string;
  userId: string;
  deviceName: string; // e.g. "Chrome Browser (Windows)", "iPhone PWA"
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: string;
  updatedAt: string;
}

export enum NotificationEventType {
  TASK_DUE_SOON = 'TASK_DUE_SOON',
  TASK_STARTING = 'TASK_STARTING',
  TASK_OVERDUE = 'TASK_OVERDUE',
  EXECUTION_SESSION_STARTED = 'EXECUTION_SESSION_STARTED',
  EXECUTION_SESSION_INTERRUPTED = 'EXECUTION_SESSION_INTERRUPTED',
  EXECUTION_SESSION_ENDED = 'EXECUTION_SESSION_ENDED',
  DAY_REVIEW_DUE = 'DAY_REVIEW_DUE',
  AI_PROPOSAL_READY = 'AI_PROPOSAL_READY',
  PLAN_CHANGED = 'PLAN_CHANGED',
  COMMITMENT_MISSED = 'COMMITMENT_MISSED'
}
