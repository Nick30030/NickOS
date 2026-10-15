import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, CheckCheck, Trash2, ShieldAlert, Sparkles, AlertCircle, RefreshCw, Zap, Laptop, Clock, Volume2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { NotificationService } from '../../services/notifications/NotificationService';
import type { Notification } from '../../types/notification';
import { PushSubscriptionManager } from '../../services/notifications/PushSubscriptionManager';
import { useExecution } from '../../context/ExecutionContext';
import { useLanguage } from '../../context/LanguageContext';
import { generateId } from '../../lib/utils';

export const NotificationCenter: React.FC = () => {
  const { desktopPermission, requestDesktopPermission, sendTestDesktopAlert, triggerInAppAlert } = useExecution();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelCoords, setPanelCoords] = useState<{ top: number; right: number }>({ top: 70, right: 16 });

  useEffect(() => {
    fetchNotifications();
    
    // Check local device state
    const devices = localStorage.getItem('nick_os_notification_devices');
    if (devices && JSON.parse(devices).length > 0) {
      setDeviceRegistered(true);
    }

    // Set up poller to automatically refresh notifications & trigger the scheduler
    const interval = setInterval(() => {
      fetchNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const updatePosition = () => {
        if (dropdownRef.current) {
          const rect = dropdownRef.current.getBoundingClientRect();
          setPanelCoords({
            top: rect.bottom + 8,
            right: Math.max(16, window.innerWidth - rect.right),
          });
        }
      };
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      const all = await NotificationService.getNotifications();
      setNotifications(all.slice(0, 20)); // Keep recent 20
      
      const unread = all.filter(n => n.status !== 'read' && n.status !== 'cancelled' && n.status !== 'failed');
      setUnreadCount(unread.length);

      // Trigger server-side scheduler sync
      // In local mode, we coordinate the client's current tasks & blocks to run the backend scheduler
      const storedTasks = localStorage.getItem('nick_os_tasks');
      const storedBlocks = localStorage.getItem('nick_os_time_blocks');
      const storedRecords = localStorage.getItem('nick_os_accountability');
      const storedProposals = localStorage.getItem('nick_os_ai_proposals');

      if (storedTasks || storedBlocks) {
        await fetch('/api/notifications/sync-scheduler', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tasks: storedTasks ? JSON.parse(storedTasks) : [],
            timeBlocks: storedBlocks ? JSON.parse(storedBlocks) : [],
            accountabilityRecords: storedRecords ? JSON.parse(storedRecords) : [],
            proposals: storedProposals ? JSON.parse(storedProposals) : [],
          })
        });
      }
    } catch (err) {
      console.warn('[NotificationCenter] Sync scheduler check failed.', err);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await NotificationService.markAsRead(id);
    await fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    await NotificationService.markAllAsRead();
    await fetchNotifications();
  };

  const handleToggleDevicePush = async () => {
    setIsRegistering(true);
    try {
      if (deviceRegistered) {
        await PushSubscriptionManager.unsubscribe();
        setDeviceRegistered(false);
      } else {
        const platformName = `${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'} Browser (${navigator.platform})`;
        const ok = await PushSubscriptionManager.initializeSubscription(platformName);
        if (ok) {
          setDeviceRegistered(true);
          // Trigger a welcome notification
          await NotificationService.notify(
            'system_alert',
            'Device Connected Successfully',
            'This device will now receive proactive NICK OS alerts independently.',
            'high',
            { deepLink: '#/settings' }
          );
        }
      }
      await fetchNotifications();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRegistering(false);
    }
  };

  const triggerTestNotification = async (type: string) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    try {
      if (type === 'now') {
        const notice = {
          title: '⚡ Focus Block Starting Now!',
          body: "It's time for 'Strategic Deep Work'. Click below to open your focus mode.",
          type: 'now_alert',
          priority: 'high' as const,
          metadata: { deepLink: '#/now' },
        };
        // Instant surface on desktop and in-app modal
        NotificationService.surfaceBrowserNotification({
          id: generateId('now-test'),
          userId: 'nick-sovereign',
          ...notice,
          scheduledFor: new Date().toISOString(),
          status: 'delivered',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        triggerInAppAlert(notice);

        await fetch('/api/notifications/trigger-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'TASK_STARTING',
            payload: { taskTitle: 'Strategic Deep Work', scheduledTime: '09:00' }
          })
        });
      } else if (type === 'ai') {
        const notice = {
          title: 'Nick OS AI Brain Suggestion',
          body: 'Schedule optimization proposal prepared for tomorrow based on your focus rhythms.',
          type: 'ai_proposal',
          priority: 'normal' as const,
          metadata: { deepLink: '#/ai' },
        };
        NotificationService.surfaceBrowserNotification({
          id: generateId('ai-test'),
          userId: 'nick-sovereign',
          ...notice,
          scheduledFor: new Date().toISOString(),
          status: 'delivered',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        triggerInAppAlert(notice);

        await fetch('/api/notifications/trigger-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'AI_PROPOSAL_READY',
            payload: { proposalId: 'test-proposal-id' }
          })
        });
      } else if (type === 'accountability') {
        const notice = {
          title: '📋 Evening Accountability Review',
          body: 'Audit today commitments, log your execution score, and sequence tomorrow plan.',
          type: 'accountability_review',
          priority: 'high' as const,
          metadata: { deepLink: '#/accountability' },
        };
        NotificationService.surfaceBrowserNotification({
          id: generateId('acc-test'),
          userId: 'nick-sovereign',
          ...notice,
          scheduledFor: new Date().toISOString(),
          status: 'delivered',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        triggerInAppAlert(notice);

        await fetch('/api/notifications/trigger-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'DAY_REVIEW_DUE',
            payload: { unresolvedCount: 3 }
          })
        });
      }
      await fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string, priority: string) => {
    if (priority === 'critical') return <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />;
    if (type === 'ai_proposal') return <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
    if (type === 'now_alert') return <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
    return <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />;
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-l-2 border-rose-500 bg-rose-500/5';
      case 'high': return 'border-l-2 border-amber-500 bg-amber-500/5';
      case 'normal': return 'border-l-2 border-emerald-500 bg-emerald-500/5';
      default: return 'border-l-2 border-neutral-700 bg-neutral-900/5';
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef} id="notification-center-dropdown">
      {/* Trigger Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
        title={t('notificationCenter', 'Notification Center')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 text-[9px] font-mono font-bold text-neutral-950 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel - Teleported via Portal directly into document.body to ensure it is always in front */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: `${panelCoords.top}px`,
            right: `${panelCoords.right}px`,
            zIndex: 9999,
          }}
          className="w-96 max-w-[calc(100vw-2rem)] bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Header */}
          <div className="p-3 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-200">
                {t('notificationCenter', 'Notification center')}
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-1.5 py-0.2 rounded">
                  {unreadCount} {t('unread', 'unread')}
                </span>
              )}
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] font-mono text-neutral-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{t('markAllRead', 'Mark all as read')}</span>
              </button>
            )}
          </div>

          {/* Desktop Work Notifications Status */}
          <div className="p-2.5 bg-neutral-950/90 border-b border-neutral-800/80 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-200 flex items-center gap-1.5 text-[11px] font-mono">
                <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                {t('desktopWorkAlerts', 'Desktop Work Alerts:')}
              </span>
              {desktopPermission === 'granted' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  {t('active', 'Active')}
                </span>
              ) : desktopPermission === 'denied' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  {t('blockedInBrowser', 'Blocked in Browser')}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {t('disabled', 'Disabled')}
                </span>
              )}
            </div>

            <p className="text-[10px] text-neutral-400 leading-tight">
              {desktopPermission === 'granted'
                ? t('desktopAlertsActiveDesc', 'Desktop OS alerts will pop up when focus blocks start and 10 minutes prior.')
                : desktopPermission === 'denied'
                ? t('desktopAlertsBlockedDesc', 'Permissions are blocked in your browser. Click the lock/settings icon in your address bar to allow alerts.')
                : t('desktopAlertsEnableDesc', 'Enable native desktop alerts to receive work and schedule notifications.')}
            </p>

            <div className="flex items-center gap-2 pt-0.5">
              {desktopPermission !== 'granted' ? (
                <button
                  onClick={requestDesktopPermission}
                  className="w-full py-1 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-mono font-bold cursor-pointer transition-colors"
                >
                  {t('enableDesktopAlerts', 'Enable Desktop Alerts')}
                </button>
              ) : (
                <button
                  onClick={sendTestDesktopAlert}
                  className="py-1 px-2.5 rounded bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white text-[10px] font-mono border border-neutral-750 cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                  <span>{t('sendTestAlert', 'Send Test Alert')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Push Activation */}
          <div className="p-2 bg-neutral-950 border-b border-neutral-800/80 flex items-center justify-between text-[11px] font-mono">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-neutral-500" />
              {t('webPushDelivery', 'Web Push Delivery:')}
            </span>
            <button
              onClick={handleToggleDevicePush}
              disabled={isRegistering}
              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                deviceRegistered 
                  ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' 
                  : 'bg-amber-500 text-neutral-950 hover:bg-amber-400'
              }`}
            >
              {isRegistering ? t('processing', 'Processing...') : deviceRegistered ? t('disableDevice', 'Disable Device') : t('enableDevice', 'Enable Device')}
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-800/60 bg-neutral-900/30">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 font-mono text-xs flex flex-col items-center gap-2">
                <Bell className="w-8 h-8 text-neutral-700 stroke-1" />
                <span>{t('noNotificationsGenerated', 'No notifications generated yet.')}</span>
                <span className="text-[10px] text-neutral-600">{t('schedulerAlertsDesc', 'The scheduler will trigger alerts based on your day plan.')}</span>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-3 transition-colors ${getPriorityStyle(notif.priority)} ${
                    notif.status !== 'read' ? 'bg-neutral-900/70' : 'bg-neutral-950/20 opacity-65'
                  }`}
                >
                  <div className="flex gap-2">
                    {getIcon(notif.type, notif.priority)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-xs font-bold block leading-tight ${notif.status !== 'read' ? 'text-neutral-100' : 'text-neutral-400'}`}>
                          {notif.title}
                        </span>
                        <span className="text-[9px] font-mono text-neutral-500 shrink-0 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTime(notif.scheduledFor)}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                        {notif.body}
                      </p>
                      
                      {/* Deep Link mapping or Actions */}
                      <div className="mt-2 flex items-center justify-between">
                        {notif.metadata?.deepLink ? (
                          <a 
                            href={notif.metadata.deepLink}
                            onClick={() => setIsOpen(false)}
                            className="text-[9px] font-mono text-amber-400 hover:underline hover:text-amber-300"
                          >
                            Execute →
                          </a>
                        ) : <div />}
                        
                        {notif.status !== 'read' && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="p-1 rounded text-neutral-500 hover:text-emerald-400 hover:bg-neutral-800/80 cursor-pointer"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Test Sandbox Footer */}
          <div className="p-2 border-t border-neutral-800 bg-neutral-950 text-[10px] font-mono text-neutral-500 flex flex-col gap-1.5">
            <span className="font-bold text-neutral-400 uppercase tracking-wider text-[9px]">
              {t('testTriggers', 'Trigger Test Events:')}
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => triggerTestNotification('now')}
                className="py-1 px-1.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded text-center truncate cursor-pointer hover:text-amber-400 transition-colors"
              >
                {t('nowBlock', 'Now Alert')}
              </button>
              <button
                onClick={() => triggerTestNotification('ai')}
                className="py-1 px-1.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded text-center truncate cursor-pointer hover:text-amber-400 transition-colors"
              >
                {t('aiProposal', 'AI Proposal')}
              </button>
              <button
                onClick={() => triggerTestNotification('accountability')}
                className="py-1 px-1.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded text-center truncate cursor-pointer hover:text-amber-400 transition-colors"
              >
                {t('dailyReview', 'Daily Review')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
