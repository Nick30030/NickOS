// ==============================================================================
// NICK OS — FOCUS CONTROL SERVICE
// ==============================================================================

import { FocusPreferences, InterruptionCategory, InterruptionRecord, VisibilityEvent } from '../../types/focus';

const STORAGE_KEY_PREFS = 'nick_os_focus_preferences';
const STORAGE_KEY_INTERRUPTIONS = 'nick_os_focus_interruptions';
const STORAGE_KEY_VISIBILITY = 'nick_os_focus_visibility_events';

export class FocusControlService {
  /**
   * Retrieves focus preferences
   */
  public static getPreferences(): FocusPreferences {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PREFS);
      if (data) return JSON.parse(data);
    } catch {}
    return {
      defaultDurationMinutes: 45,
      interruptionReminderDelayMinutes: 25,
      visibilityWarningThresholdMinutes: 3,
      muteExternalNotifications: true,
      autoStartFocusMode: true,
    };
  }

  public static savePreferences(prefs: FocusPreferences) {
    localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(prefs));
  }

  /**
   * Records a distraction / interruption
   */
  public static recordInterruption(sessionId: string, category: InterruptionCategory, reason?: string, taskId?: string, taskTitle?: string): InterruptionRecord {
    const interruption: InterruptionRecord = {
      id: 'interrupt_' + Date.now(),
      sessionId,
      taskId,
      taskTitle,
      category,
      reason,
      timestamp: new Date().toISOString(),
    };

    const existing = this.getInterruptions();
    existing.unshift(interruption);
    localStorage.setItem(STORAGE_KEY_INTERRUPTIONS, JSON.stringify(existing));
    return interruption;
  }

  public static getInterruptions(sessionId?: string): InterruptionRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_INTERRUPTIONS);
      const list: InterruptionRecord[] = data ? JSON.parse(data) : [];
      if (sessionId) {
        return list.filter(i => i.sessionId === sessionId);
      }
      return list;
    } catch {
      return [];
    }
  }

  /**
   * Records visibility hidden/returned events
   */
  public static recordVisibilityEvent(event: VisibilityEvent) {
    const existing = this.getVisibilityEvents();
    existing.unshift(event);
    localStorage.setItem(STORAGE_KEY_VISIBILITY, JSON.stringify(existing));
  }

  public static getVisibilityEvents(sessionId?: string): VisibilityEvent[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_VISIBILITY);
      const list: VisibilityEvent[] = data ? JSON.parse(data) : [];
      if (sessionId) return list.filter(e => e.sessionId === sessionId);
      return list;
    } catch {
      return [];
    }
  }

  /**
   * Future Architecture Abstraction: Windows Application & Screen Time Integration Points
   */
  public static getPlatformCapabilities() {
    return {
      browserFocusMode: true,
      visibilityChangeDetection: true,
      fullscreenApi: typeof document !== 'undefined' && !!document.documentElement.requestFullscreen,
      windowsNativeAppHook: {
        status: 'architectural_ready',
        description: 'Coarse active window & idle monitoring (no keystrokes or surveillance captured).',
      },
      iosScreenTimeHook: {
        status: 'architectural_ready',
        description: 'PWA notification & native companion readiness.',
      }
    };
  }
}
