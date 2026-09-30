// ==============================================================================
// NICK OS — GOOGLE CALENDAR INTEGRATION TYPES
// ==============================================================================

export interface CalendarAccount {
  userId?: string;
  provider: 'google';
  externalAccountId: string; // e.g. user email
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  scopes: string[];
  status: 'connected' | 'expired' | 'revoked' | 'disconnected';
  connectedAt: string;
  lastSyncAt?: string;
}

export interface GoogleCalendarItem {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  selected: boolean; // whether Nick OS uses this calendar for sync/constraints
  backgroundColor?: string;
  timeZone?: string;
}

export interface ExternalCalendarEvent {
  id: string; // Google Calendar Event ID
  calendarId: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string; // all-day
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string; // all-day
    timeZone?: string;
  };
  status?: string;
  htmlLink?: string;
  eventType: 'fixed_event' | 'meeting' | 'appointment' | 'reminder';
  syncedToNickOsTaskId?: string;
  lastSyncedAt?: string;
}

export interface CalendarSyncRecord {
  id: string;
  nickOsBlockId?: string; // TimeBlock or Task ID
  externalEventId: string; // Google Calendar event ID
  calendarId: string;
  source: 'google_calendar' | 'nick_os';
  lastSyncedAt: string;
  syncStatus: 'synced' | 'conflict' | 'pending_push' | 'pending_pull' | 'error';
  conflictDetails?: {
    nickOsTime: string;
    googleTime: string;
    description: string;
  };
}
