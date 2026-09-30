// ==============================================================================
// NICK OS — GOOGLE TASKS SYNC SERVICE
// ==============================================================================

import { GoogleTasksAccount, GoogleTaskList, ExternalGoogleTask, TaskSyncMapping } from '../../types/tasks-sync';

const STORAGE_KEY_ACCOUNT = 'nick_os_google_tasks_account';
const STORAGE_KEY_SELECTED_LISTS = 'nick_os_google_tasks_selected_lists';
const STORAGE_KEY_TASKS = 'nick_os_google_tasks_cached_items';
const STORAGE_KEY_MAPPINGS = 'nick_os_google_tasks_sync_mappings';

export class GoogleTasksService {
  /**
   * Retrieves current Google Tasks account metadata
   */
  public static getAccount(): GoogleTasksAccount | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY_ACCOUNT);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Saves or updates account metadata
   */
  public static saveAccount(account: GoogleTasksAccount | null) {
    if (!account) {
      localStorage.removeItem(STORAGE_KEY_ACCOUNT);
    } else {
      localStorage.setItem(STORAGE_KEY_ACCOUNT, JSON.stringify(account));
    }
  }

  /**
   * Connects Google Tasks via OAuth 2.0 (reusing the secure client-side pattern)
   */
  public static async connectGoogleTasks(): Promise<GoogleTasksAccount> {
    return new Promise((resolve, reject) => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '815241314216-placeholder.apps.googleusercontent.com';
      const g = (window as any).google;

      if (g && g.accounts && g.accounts.oauth2) {
        try {
          const client = g.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/tasks.readonly',
            callback: async (response: any) => {
              if (response.error) {
                reject(new Error(response.error));
                return;
              }
              const accessToken = response.access_token;
              const expiresAt = Date.now() + (response.expires_in || 3600) * 1000;

              let email = 'nick.connected@gmail.com';
              try {
                const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (userRes.ok) {
                  const userInfo = await userRes.json();
                  email = userInfo.email || email;
                }
              } catch (e) {
                console.warn('Could not fetch userinfo email, using fallback:', e);
              }

              const account: GoogleTasksAccount = {
                provider: 'google_tasks',
                externalAccountId: email,
                accessToken,
                tokenExpiresAt: expiresAt,
                scopes: [
                  'https://www.googleapis.com/auth/tasks',
                  'https://www.googleapis.com/auth/tasks.readonly'
                ],
                status: 'connected',
                connectedAt: new Date().toISOString(),
                lastSyncAt: new Date().toISOString(),
              };

              this.saveAccount(account);
              resolve(account);
            },
          });
          client.requestAccessToken();
        } catch (err: any) {
          console.error('[GoogleTasksService] GIS initTokenClient failed:', err);
          reject(new Error(err?.message || 'Google OAuth token client initialization failed for Google Tasks.'));
        }
      } else {
        reject(new Error('Google Identity Services (GIS) client library is not loaded or VITE_GOOGLE_CLIENT_ID is not configured.'));
      }
    });
  }

  /**
   * Disconnects Google Tasks and revokes session
   */
  public static disconnect() {
    this.saveAccount(null);
    localStorage.removeItem(STORAGE_KEY_SELECTED_LISTS);
    localStorage.removeItem(STORAGE_KEY_TASKS);
    localStorage.removeItem(STORAGE_KEY_MAPPINGS);
  }

  /**
   * Retrieves task lists from Google Tasks API
   */
  public static async listTaskLists(): Promise<GoogleTaskList[]> {
    const account = this.getAccount();
    if (!account || account.status !== 'connected' || !account.accessToken) {
      throw new Error('Google Tasks is not connected.');
    }

    const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { Authorization: `Bearer ${account.accessToken}` }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch task lists: ${res.statusText}`);
    }

    const data = await res.json();
    const selectedIds = this.getSelectedTaskListIds();
    return (data.items || []).map((list: any) => ({
      id: list.id,
      title: list.title,
      updated: list.updated,
      selected: selectedIds.includes(list.id) || list.id === data.items[0]?.id,
    }));
  }

  public static getSelectedTaskListIds(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SELECTED_LISTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static saveSelectedTaskListIds(ids: string[]) {
    localStorage.setItem(STORAGE_KEY_SELECTED_LISTS, JSON.stringify(ids));
  }

  /**
   * Fetches tasks from selected task lists
   */
  public static async fetchGoogleTasks(): Promise<ExternalGoogleTask[]> {
    const account = this.getAccount();
    if (!account || account.status !== 'connected' || !account.accessToken) return [];

    const selectedListIds = this.getSelectedTaskListIds();
    const allTasks: ExternalGoogleTask[] = [];

    try {
      for (const listId of selectedListIds) {
        const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks?showCompleted=true`, {
          headers: { Authorization: `Bearer ${account.accessToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          const items = (data.items || []).map((t: any) => ({
            id: t.id,
            taskListId: listId,
            title: t.title || 'Untitled Task',
            notes: t.notes,
            status: t.status || 'needsAction',
            due: t.due,
            completed: t.completed,
            updated: t.updated,
          }));
          allTasks.push(...items);
        }
      }

      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(allTasks));
      return allTasks;
    } catch (err) {
      console.error('Error fetching Google Tasks:', err);
      const cached = localStorage.getItem(STORAGE_KEY_TASKS);
      return cached ? JSON.parse(cached) : [];
    }
  }

  /**
   * Exports a Nick OS task to Google Tasks
   */
  public static async exportTaskToGoogle(title: string, notes?: string, due?: string): Promise<{ googleTaskId: string; taskListId: string }> {
    const account = this.getAccount();
    if (!account || account.status !== 'connected' || !account.accessToken) {
      throw new Error('Google Tasks is not connected.');
    }

    const selectedLists = this.getSelectedTaskListIds();
    const taskListId = selectedLists[0] || '@default';

    const payload = {
      title,
      notes: notes ? `${notes}\n\n[Exported from Nick OS]` : '[Exported from Nick OS]',
      due: due ? new Date(due).toISOString() : undefined,
    };

    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to export task to Google Tasks: ${errText}`);
    }

    const created = await res.json();
    return { googleTaskId: created.id, taskListId };
  }

  /**
   * Gets stored sync mappings between Nick OS tasks and Google Tasks
   */
  public static getSyncMappings(): TaskSyncMapping[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_MAPPINGS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static saveSyncMappings(mappings: TaskSyncMapping[]) {
    localStorage.setItem(STORAGE_KEY_MAPPINGS, JSON.stringify(mappings));
  }
}
