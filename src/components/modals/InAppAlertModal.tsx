import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useExecution } from '../../context/ExecutionContext';
import {
  Bell,
  Zap,
  Sparkles,
  ShieldAlert,
  Clock,
  ArrowRight,
  X,
  Volume2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../common/Button';

export const InAppAlertModal: React.FC = () => {
  const {
    activeInAppAlert,
    dismissInAppAlert,
    setActiveTab,
    triggerInAppAlert,
  } = useExecution();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeInAppAlert) {
        dismissInAppAlert();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeInAppAlert, dismissInAppAlert]);

  if (!activeInAppAlert) return null;
  if (typeof document === 'undefined') return null;

  const { title, body, type, metadata } = activeInAppAlert;

  const handleAction = () => {
    if (metadata?.deepLink) {
      const link = metadata.deepLink;
      if (link.includes('/now')) {
        setActiveTab('now');
      } else if (link.includes('/today')) {
        setActiveTab('today');
      } else if (link.includes('/accountability')) {
        setActiveTab('accountability');
      } else if (link.includes('/ai')) {
        setActiveTab('ai');
      } else if (link.includes('/tasks')) {
        setActiveTab('tasks');
      } else if (link.includes('/settings')) {
        setActiveTab('settings');
      }
    }
    dismissInAppAlert();
  };

  const handleSnooze = () => {
    const currentAlert = { ...activeInAppAlert };
    dismissInAppAlert();
    // Re-surface in 5 minutes
    setTimeout(() => {
      triggerInAppAlert({
        title: `[Snoozed] ${currentAlert.title}`,
        body: currentAlert.body,
        type: currentAlert.type,
        metadata: currentAlert.metadata,
      });
    }, 5 * 60 * 1000);
  };

  const getTheme = () => {
    switch (type) {
      case 'now_alert':
        return {
          icon: <Zap className="w-5 h-5 text-emerald-400" />,
          badge: 'Focus Block Alert',
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          borderClass: 'border-emerald-500/40 shadow-emerald-950/50',
          btnVariant: 'primary' as const,
          actionLabel: 'Open Focus Cockpit',
        };
      case 'accountability_review':
        return {
          icon: <Clock className="w-5 h-5 text-amber-400" />,
          badge: 'Accountability Audit',
          badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          borderClass: 'border-amber-500/40 shadow-amber-950/50',
          btnVariant: 'secondary' as const,
          actionLabel: 'Open Evening Review',
        };
      case 'ai_proposal':
        return {
          icon: <Sparkles className="w-5 h-5 text-sky-400" />,
          badge: 'AI Brain Suggestion',
          badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
          borderClass: 'border-sky-500/40 shadow-sky-950/50',
          btnVariant: 'secondary' as const,
          actionLabel: 'Review Optimization',
        };
      default:
        return {
          icon: <Bell className="w-5 h-5 text-amber-400" />,
          badge: 'NickOS Alert',
          badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          borderClass: 'border-neutral-700 shadow-neutral-950/50',
          btnVariant: 'primary' as const,
          actionLabel: 'View Details',
        };
    }
  };

  const theme = getTheme();

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
    >
      {/* Dim backdrop with blur */}
      <div
        className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={dismissInAppAlert}
      />

      {/* Alert Modal Card - Always on top of daily planner and every view */}
      <div
        className={`relative w-full max-w-md rounded-2xl bg-neutral-900 border ${theme.borderClass} text-neutral-100 shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col`}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-neutral-850 border border-neutral-750 flex items-center justify-center shrink-0">
              {theme.icon}
            </div>
            <div className="min-w-0">
              <span
                className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase tracking-wider ${theme.badgeClass}`}
              >
                {theme.badge}
              </span>
              <span className="text-[11px] font-mono text-neutral-500 ml-2">Just Now</span>
            </div>
          </div>
          <button
            onClick={dismissInAppAlert}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
            title="Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-3">
          <h2
            id="alert-dialog-title"
            className="text-base sm:text-lg font-bold text-neutral-100 leading-snug tracking-tight"
          >
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
            {body}
          </p>

          <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-neutral-500">
            <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
            <span>Chime tone played • Prioritized schedule notification</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-4 border-t border-neutral-800/80 bg-neutral-950/60 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleSnooze}
            className="text-xs font-mono text-neutral-400 hover:text-neutral-200 px-3 py-2 rounded-lg hover:bg-neutral-850 transition-colors cursor-pointer"
          >
            Snooze 5m
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissInAppAlert}
            >
              Dismiss
            </Button>

            <Button
              variant={theme.btnVariant}
              size="sm"
              onClick={handleAction}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              {theme.actionLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
