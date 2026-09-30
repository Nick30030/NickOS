// ==============================================================================
// NICK OS — GOOGLE TASKS INTEGRATION TYPES
// ==============================================================================

export interface GoogleTasksAccount {
  userId?: string;
  provider: 'google_tasks';
  externalAccountId: string;
  accessToken?: string;
  tokenExpiresAt?: number;
  scopes: string[];
  status: 'connected' | 'expired' | 'revoked' | 'disconnected';
  connectedAt: string;
  lastSyncAt?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
  selected: boolean;
}

export interface ExternalGoogleTask {
  id: string; // Google Task ID
  taskListId: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  updated?: string;
  syncedNickTaskId?: string;
}

export interface TaskSyncMapping {
  id: string;
  nickTaskId: string;
  googleTaskId: string;
  googleTaskListId: string;
  syncStatus: 'synced' | 'conflict' | 'pending_push' | 'pending_pull' | 'error';
  lastSyncedAt: string;
  source: 'google_tasks' | 'nick_os';
  conflictDetails?: {
    nickOsTitle: string;
    googleTitle: string;
    nickOsStatus: string;
    googleStatus: string;
  };
}
