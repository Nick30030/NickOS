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

// ==============================================================================
// FOCUS GUARD ENFORCEMENT & SETTINGS TYPES
// ==============================================================================

export type FocusGuardMode = 'blacklist' | 'whitelist';
export type UnknownSitePolicy = 'allow' | 'block' | 'warn';

export interface FocusGuardSettings {
  id?: string;
  userId?: string;
  enabled: boolean;
  mode: FocusGuardMode;
  allowedDomains: string[];
  blockedDomains: string[];
  blockedApps: string[];
  unknownSitePolicy: UnknownSitePolicy;
  updatedAt?: string;
}

export type FocusGuardClientType = 'browser_extension' | 'windows_agent';
export type FocusGuardClientStatus = 'connected' | 'enforcing' | 'paused' | 'error' | 'disconnected';

export interface FocusGuardAgentHeartbeat {
  id?: string;
  userId?: string;
  clientId: string;
  clientType: FocusGuardClientType;
  version: string;
  status: FocusGuardClientStatus;
  activeSessionId?: string | null;
  blockedEnforcementsCount: number;
  lastActionLog?: string;
  errorMessage?: string;
  lastHeartbeatAt: string;
}

export type FocusSessionUnifiedStatus = 'active' | 'paused' | 'completed' | 'abandoned' | 'disconnected';

export interface FocusGuardActiveSessionResponse {
  isProtectionActive: boolean;
  sessionState: FocusSessionUnifiedStatus;
  sessionId?: string | null;
  taskId?: string | null;
  taskTitle?: string | null;
  startTime?: string | null;
  elapsedSeconds?: number;
  settings: FocusGuardSettings;
  agents: FocusGuardAgentHeartbeat[];
}
