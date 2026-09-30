import { NotificationService } from './NotificationService';

export class PushSubscriptionManager {
  private static swPath = '/sw.js';

  /**
   * Registers the Service Worker and retrieves/creates push subscription
   */
  public static async initializeSubscription(deviceName: string): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[PushSubscriptionManager] Web Push is not supported on this device/browser.');
      return false;
    }

    try {
      // 1. Register Service Worker
      const registration = await navigator.serviceWorker.register(this.swPath);
      console.log('[PushSubscriptionManager] Service Worker registered with scope:', registration.scope);

      // 2. Request Permission
      const permitted = await NotificationService.requestBrowserPermission();
      if (!permitted) {
        console.warn('[PushSubscriptionManager] Browser notification permission denied.');
        return false;
      }

      // 3. Get Subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        const vapidKey = (import.meta.env as any).VITE_VAPID_PUBLIC_KEY;
        if (vapidKey) {
          try {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: vapidKey,
            });
          } catch (subErr) {
            console.warn('[PushSubscriptionManager] PushManager subscribe with VAPID key failed:', subErr);
          }
        }
      }

      // 4. Register Device on Server Side
      const subscriptionPayload = subscription ? subscription.toJSON() : {
        type: 'web_notification_device',
        registeredAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
      };
      await NotificationService.registerDevice(deviceName, subscriptionPayload);
      return true;
    } catch (err) {
      console.error('[PushSubscriptionManager] Failed to initialize Push subscription:', err);
      return false;
    }
  }

  /**
   * Unregisters Push subscription and removes the device
   */
  public static async unsubscribe(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await NotificationService.removeDevice(subscription.endpoint);
        return true;
      } else {
        // Fallback clean local devices
        const local = localStorage.getItem('nick_os_notification_devices');
        if (local) {
          const list = JSON.parse(local);
          if (list.length > 0) {
            const endpoint = list[0].endpoint;
            await NotificationService.removeDevice(endpoint);
          }
        }
      }
      return true;
    } catch (err) {
      console.error('[PushSubscriptionManager] Failed to unsubscribe:', err);
      return false;
    }
  }
}
