// ==============================================================================
// NICK OS — CALENDAR SYNC SERVICE (GOOGLE CALENDAR INTEGRATION)
// ==============================================================================

import { CalendarAccount, GoogleCalendarItem, ExternalCalendarEvent, CalendarSyncRecord } from '../../types/calendar';

const STORAGE_KEY_ACCOUNT = 'nick_os_google_calendar_account';
const STORAGE_KEY_SELECTED_CALENDARS = 'nick_os_google_calendar_selected';
const STORAGE_KEY_EVENTS = 'nick_os_google_calendar_events';
const STORAGE_KEY_SYNC_RECORDS = 'nick_os_google_calendar_sync_records';

export class CalendarSyncService {
  /**
   * Retrieves current stored calendar account metadata
   */
  public static getAccount(): CalendarAccount | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY_ACCOUNT);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Saves or updates calendar account metadata
   */
  public static saveAccount(account: CalendarAccount | null) {
    if (!account) {
      localStorage.removeItem(STORAGE_KEY_ACCOUNT);
    } else {
      localStorage.setItem(STORAGE_KEY_ACCOUNT, JSON.stringify(account));
    }
  }

  /**
   * Initiates Google OAuth popup client-side flow for Calendar scopes
   */
  public static async connectGoogleCalendar(): Promise<CalendarAccount> {
    return new Promise((resolve, reject) => {
      // Check if Google GIS is available or load dynamically
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '815241314216-placeholder.apps.googleusercontent.com';
      
      // If we are in the AI Studio preview environment, we can simulate or trigger GIS token client if google object exists,
      // or open standard Google OAuth token popup.
      const g = (window as any).google;
      if (g && g.accounts && g.accounts.oauth2) {
        try {
          const client = g.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly',
            callback: async (response: any) => {
              if (response.error) {
                reject(new Error(response.error));
                return;
              }
              const accessToken = response.access_token;
              const expiresAt = Date.now() + (response.expires_in || 3600) * 1000;

              // Fetch user profile email
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

              const account: CalendarAccount = {
                provider: 'google',
                externalAccountId: email,
                accessToken,
                tokenExpiresAt: expiresAt,
                scopes: [
                  'https://www.googleapis.com/auth/calendar',
                  'https://www.googleapis.com/auth/calendar.events',
                  'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
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
          console.error('[CalendarSyncService] GIS initTokenClient failed:', err);
          reject(new Error(err?.message || 'Google OAuth token client initialization failed. Please check browser popup blocker or authorized JavaScript origins.'));
        }
      } else {
        reject(new Error('Google Identity Services (GIS) client library is not loaded or VITE_GOOGLE_CLIENT_ID is not configured. Please configure Google OAuth credentials in your environment.'));
      }
    });
  }

  /**
   * Disconnects Google Calendar and revokes stored credentials
   */
  public static disconnect() {
    this.saveAccount(null);
    localStorage.removeItem(STORAGE_KEY_SELECTED_CALENDARS);
    localStorage.removeItem(STORAGE_KEY_EVENTS);
    localStorage.removeItem(STORAGE_KEY_SYNC_RECORDS);
  }

  /**
   * Retrieves list of calendars from Google Calendar API
   */
  public static async listCalendars(): Promise<GoogleCalendarItem[]> {
    const account = this.getAccount();
    if (!account || account.status !== 'connected' || !account.accessToken) {
      throw new Error('Google Calendar is not connected.');
    }

    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${account.accessToken}` }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch calendars from Google: ${res.statusText}`);
    }

    const data = await res.json();
    const items = (data.items || []).map((item: any) => ({
      id: item.id,
      summary: item.summary,
      description: item.description,
      primary: item.primary || false,
      selected: true,
      backgroundColor: item.backgroundColor || '#4285F4',
      timeZone: item.timeZone,
    }));

    return items;
  }

  /**
   * Saves selected calendar IDs
   */
  public static getSelectedCalendarIds(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SELECTED_CALENDARS);
      return data ? JSON.parse(data) : ['primary'];
    } catch {
      return ['primary'];
    }
  }

  public static saveSelectedCalendarIds(ids: string[]) {
    localStorage.setItem(STORAGE_KEY_SELECTED_CALENDARS, JSON.stringify(ids));
  }

  /**
   * Fetches events from authorized Google calendars
   */
  public static async fetchCalendarEvents(): Promise<ExternalCalendarEvent[]> {
    const account = this.getAccount();
    if (!account || account.status !== 'connected') {
      return [];
    }

    const selectedIds = this.getSelectedCalendarIds();
    const allEvents: ExternalCalendarEvent[] = [];

    try {
      for (const calId of selectedIds) {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?singleEvents=true&orderBy=startTime`, {
          headers: { Authorization: `Bearer ${account.accessToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          const items = (data.items || []).map((ev: any) => ({
            id: ev.id,
            calendarId: calId,
            summary: ev.summary || 'Untitled Event',
            description: ev.description,
            location: ev.location,
            start: ev.start,
            end: ev.end,
            status: ev.status,
            htmlLink: ev.htmlLink,
            eventType: (ev.summary || '').toLowerCase().includes('meeting') ? 'meeting' : 'fixed_event',
          }));
          allEvents.push(...items);
        }
      }

      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(allEvents));
      return allEvents;
    } catch (err) {
      console.error('Error fetching Google Calendar events:', err);
      const cached = localStorage.getItem(STORAGE_KEY_EVENTS);
      return cached ? JSON.parse(cached) : [];
    }
  }

  /**
   * Pushes a Nick OS TimeBlock or Task to Google Calendar
   */
  public static async exportBlockToGoogleCalendar(title: string, startTime: string, endTime: string, date: string, description?: string): Promise<string> {
    const account = this.getAccount();
    if (!account || account.status !== 'connected' || !account.accessToken) {
      throw new Error('Google Calendar is not connected.');
    }

    const selectedIds = this.getSelectedCalendarIds();
    const targetCalendarId = selectedIds[0] || 'primary';

    const startDateTime = `${date}T${startTime}:00-07:00`;
    const endDateTime = `${date}T${endTime}:00-07:00`;

    const eventPayload = {
      summary: `Nick OS — ${title}`,
      description: description ? `${description}\n\n[Managed by Nick OS Execution Engine]` : '[Managed by Nick OS Execution Engine]',
      start: { dateTime: startDateTime, timeZone: 'America/Los_Angeles' },
      end: { dateTime: endDateTime, timeZone: 'America/Los_Angeles' },
    };

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Failed to export event to Google Calendar: ${errBody}`);
    }

    const created = await res.json();
    return created.id;
  }

  /**
   * Detects scheduling conflicts between Nick OS time blocks and external Google Calendar fixed events
   */
  public static detectConflicts(timeBlocks: Array<{ startTime: string; endTime: string; title: string }>, calendarEvents: ExternalCalendarEvent[]): Array<{ conflictMessage: string; blockTitle: string; eventSummary: string }> {
    const conflicts: Array<{ conflictMessage: string; blockTitle: string; eventSummary: string }> = [];

    for (const block of timeBlocks) {
      const [bStartH, bStartM] = block.startTime.split(':').map(Number);
      const [bEndH, bEndM] = block.endTime.split(':').map(Number);
      const bStartMin = bStartH * 60 + bStartM;
      const bEndMin = bEndH * 60 + bEndM;

      for (const ev of calendarEvents) {
        if (!ev.start?.dateTime || !ev.end?.dateTime) continue;
        try {
          const evStartTime = new Date(ev.start.dateTime);
          const evEndTime = new Date(ev.end.dateTime);
          const evStartMin = evStartTime.getHours() * 60 + evStartTime.getMinutes();
          const evEndMin = evEndTime.getHours() * 60 + evEndTime.getMinutes();

          // Check overlap
          if (bStartMin < evEndMin && bEndMin > evStartMin) {
            conflicts.push({
              conflictMessage: `Scheduling conflict detected between Nick OS block "${block.title}" (${block.startTime}-${block.endTime}) and Google Calendar event "${ev.summary}" (${evStartTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}-${evEndTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}).`,
              blockTitle: block.title,
              eventSummary: ev.summary,
            });
          }
        } catch {
          // parse error skip
        }
      }
    }

    return conflicts;
  }
}
