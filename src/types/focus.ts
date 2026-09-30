// ==============================================================================
// NICK OS — FOCUS & ANTI-DISTRACTION TYPES
// ==============================================================================

export type InterruptionCategory =
  | 'phone'
  | 'social_media'
  | 'unrelated_work'
  | 'idea'
  | 'message'
  | 'fatigue'
  | 'external_interruption'
  | 'other';

export interface InterruptionRecord {
  id: string;
  sessionId: string;
  taskId?: string;
  taskTitle?: string;
  category: InterruptionCategory;
  reason?: string;
  timestamp: string;
}

export interface VisibilityEvent {
  id: string;
  sessionId: string;
  hiddenAt: string;
  returnedAt?: string;
  durationSeconds: number;
  userConfirmation?: 'still_working' | 'distracted' | 'took_break' | 'interrupted';
}

export interface FocusPreferences {
  defaultDurationMinutes: number;
  interruptionReminderDelayMinutes: number;
  visibilityWarningThresholdMinutes: number;
  muteExternalNotifications: boolean;
  autoStartFocusMode: boolean;
}

export interface FocusSessionMetrics {
  plannedMinutes: number;
  actualActiveMinutes: number;
  interruptionsCount: number;
  interruptionDurationMinutes: number;
  contextSwitches: number;
  outcomeCompleted: boolean;
}
