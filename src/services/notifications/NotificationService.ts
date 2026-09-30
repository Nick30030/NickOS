import type { 
  Notification,
} from '../../types/notification';
import {
  NotificationPreferences, 
  DeviceSubscription, 
  NotificationPriority,
  NotificationStatus
} from '../../types/notification';
import { generateId, playNotificationChime } from '../../lib/utils';

const LOCAL_STORAGE_KEYS = {
  NOTIFICATIONS: 'nick_os_notifications',
  PREFERENCES: 'nick_os_notification_preferences',
  DEVICES: 'nick_os_notification_devices',
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
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

export class NotificationService {
  private static apiBase = '/api/notifications';

  /**
   * Safe fetch helper
   */
  private static async request(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any) {
    try {
      const response = await fetch(`${this.apiBase}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn(`[NotificationService] API request to ${endpoint} failed, utilizing local fallback.`, err);
    }
    return null;
  }

  /**
   * 1. Get Notification Preferences
   */
  public static async getPreferences(): Promise<NotificationPreferences> {
    const serverPrefs = await this.request('/preferences');
    if (serverPrefs) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.PREFERENCES, JSON.stringify(serverPrefs));
      return serverPrefs;
    }

    const local = localStorage.getItem(LOCAL_STORAGE_KEYS.PREFERENCES);
    if (local) {
      return JSON.parse(local);
    }
    return DEFAULT_PREFERENCES;
  }

  /**
   * 2. Update Notification Preferences
   */
  public static async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const current = await this.getPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(LOCAL_STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));

    const serverResponse = await this.request('/preferences', 'POST', updated);
    return serverResponse || updated;
  }

  /**
   * 3. Register Device Subscription
   */
  public static async registerDevice(deviceName: string, subscription: any): Promise<DeviceSubscription> {
    const payload = {
      deviceName,
      subscription,
    };
    
    // Fallback local storage logging
    const localDevices = this.getLocalDevices();
    const existing = localDevices.find(d => d.endpoint === subscription.endpoint);
    let newDevice: DeviceSubscription;

    if (existing) {
      newDevice = { ...existing, deviceName, updatedAt: new Date().toISOString() };
      const filtered = localDevices.filter(d => d.endpoint !== subscription.endpoint);
      localStorage.setItem(LOCAL_STORAGE_KEYS.DEVICES, JSON.stringify([...filtered, newDevice]));
    } else {
      newDevice = {
        id: generateId(),
        userId: 'nick-sovereign',
        deviceName,
        endpoint: subscription.endpoint,
        keys: subscription.keys || { p256dh: '', auth: '' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(LOCAL_STORAGE_KEYS.DEVICES, JSON.stringify([...localDevices, newDevice]));
    }

    const serverDevice = await this.request('/register-device', 'POST', newDevice);
    return serverDevice || newDevice;
  }

  /**
   * 4. Remove Device Subscription
   */
  public static async removeDevice(endpoint: string): Promise<boolean> {
    const localDevices = this.getLocalDevices();
    const filtered = localDevices.filter(d => d.endpoint !== endpoint);
    localStorage.setItem(LOCAL_STORAGE_KEYS.DEVICES, JSON.stringify(filtered));

    const response = await this.request('/remove-device', 'POST', { endpoint });
    return response ? response.success : true;
  }

  private static getLocalDevices(): DeviceSubscription[] {
    const local = localStorage.getItem(LOCAL_STORAGE_KEYS.DEVICES);
    return local ? JSON.parse(local) : [];
  }

  /**
   * 5. Get Notifications list
   */
  public static async getNotifications(): Promise<Notification[]> {
    const serverNotifications = await this.request('/list');
    if (serverNotifications) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(serverNotifications));
      return serverNotifications;
    }

    const local = localStorage.getItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS);
    return local ? JSON.parse(local) : [];
  }

  /**
   * 6. Get Unread Notifications
   */
  public static async getUnreadNotifications(): Promise<Notification[]> {
    const list = await this.getNotifications();
    return list.filter(n => n.status !== 'read' && n.status !== 'cancelled' && n.status !== 'failed');
  }

  /**
   * 7. Trigger Immediate Notification
   */
  public static async notify(
    type: string,
    title: string,
    body: string,
    priority: NotificationPriority = 'normal',
    metadata?: Record<string, any>
  ): Promise<Notification> {
    const now = new Date().toISOString();
    const newNotification: Notification = {
      id: generateId(),
      userId: 'nick-sovereign',
      type,
      title,
      body,
      priority,
      scheduledFor: now,
      status: 'pending',
      metadata,
      createdAt: now,
      updatedAt: now,
    };

    // Client-side visual trigger if permissions exist
    this.surfaceBrowserNotification(newNotification);

    const local = await this.getNotifications();
    localStorage.setItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([newNotification, ...local]));

    const serverResponse = await this.request('/create', 'POST', newNotification);
    return serverResponse || newNotification;
  }

  /**
   * 8. Schedule a Future Notification with Idempotency Key
   */
  public static async scheduleNotification(
    type: string,
    title: string,
    body: string,
    priority: NotificationPriority,
    scheduledFor: string, // ISO string or time block ID reference
    metadata?: Record<string, any>,
    idempotencyKey?: string
  ): Promise<Notification | null> {
    const now = new Date().toISOString();
    
    // Idempotency validation client-side
    if (idempotencyKey) {
      const local = await this.getNotifications();
      const duplicate = local.find(n => n.idempotencyKey === idempotencyKey);
      if (duplicate) {
        console.log(`[NotificationService] Duplicate schedule attempt skipped for idempotency key: ${idempotencyKey}`);
        return duplicate;
      }
    }

    const newNotification: Notification = {
      id: generateId(),
      userId: 'nick-sovereign',
      type,
      title,
      body,
      priority,
      scheduledFor,
      status: 'scheduled',
      metadata,
      idempotencyKey,
      createdAt: now,
      updatedAt: now,
    };

    const local = await this.getNotifications();
    localStorage.setItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([newNotification, ...local]));

    const serverResponse = await this.request('/schedule', 'POST', newNotification);
    return serverResponse || newNotification;
  }

  /**
   * 9. Cancel a scheduled notification
   */
  public static async cancelNotification(id: string): Promise<boolean> {
    const list = await this.getNotifications();
    const updated = list.map(n => n.id === id ? { ...n, status: 'cancelled' as NotificationStatus, updatedAt: new Date().toISOString() } : n);
    localStorage.setItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));

    const response = await this.request(`/cancel/${id}`, 'POST');
    return response ? response.success : true;
  }

  /**
   * 10. Mark a notification as read
   */
  public static async markAsRead(id: string): Promise<boolean> {
    const list = await this.getNotifications();
    const updated = list.map(n => n.id === id ? { ...n, status: 'read' as NotificationStatus, readAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : n);
    localStorage.setItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));

    const response = await this.request(`/read/${id}`, 'POST');
    return response ? response.success : true;
  }

  /**
   * 11. Mark all notifications as read
   */
  public static async markAllAsRead(): Promise<boolean> {
    const list = await this.getNotifications();
    const nowStr = new Date().toISOString();
    const updated = list.map(n => n.status !== 'read' ? { ...n, status: 'read' as NotificationStatus, readAt: nowStr, updatedAt: nowStr } : n);
    localStorage.setItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));

    const response = await this.request('/mark-all-read', 'POST');
    return response ? response.success : true;
  }

  /**
   * Utility to surface instant browser notice if visible/permitted
   */
  public static surfaceBrowserNotification(notif: Notification) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        playNotificationChime();
        const options: NotificationOptions = {
          body: notif.body,
          tag: notif.id,
          data: notif.metadata,
          icon: '/assets/favicon.ico',
        };
        const n = new Notification(notif.title, options);
        n.onclick = (e) => {
          e.preventDefault();
          const deepLink = notif.metadata?.deepLink;
          if (deepLink) {
            window.location.hash = deepLink; // Support hash or standard path mapping
          }
          n.close();
        };
      } catch (err) {
        console.error('[NotificationService] Standard web notice delivery failed:', err);
      }
    }
  }

  /**
   * Request native browser permission
   */
  public static async requestBrowserPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    
    try {
      const res = await Notification.requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }
}
