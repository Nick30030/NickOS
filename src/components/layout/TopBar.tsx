import React from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { Button } from '../common/Button';
import { formatFriendlyDate, getTodayString, formatSecondsToTimer } from '../../lib/utils';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { VoiceButton } from '../voice/VoiceButton';
import {
  Plus,
  Calendar,
  Menu,
  Crosshair,
  Zap,
  Database,
  Inbox,
  Play,
} from 'lucide-react';

export const TopBar: React.FC<{
  onOpenMobile: () => void;
}> = ({ onOpenMobile }) => {
  const {
    activeTab,
    setActiveTab,
    setIsCreateTaskModalOpen,
    setIsPlanDayModalOpen,
    setIsQuickCaptureOpen,
    activeTask,
    isTimerRunning,
    timerElapsedSeconds,
    storageMode,
    setIsSupabaseModalOpen,
  } = useExecution();

  const todayStr = getTodayString();
  const friendlyDate = formatFriendlyDate(todayStr);

  return (
    <header className="h-16 sm:h-18 border-b border-neutral-800/80 bg-neutral-900/80 backdrop-blur-md px-3 sm:px-8 flex items-center justify-between sticky top-0 z-30 shrink-0 max-w-full">
      {/* Left: Mobile hamburger & Context Header */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400 truncate">
              {activeTab === 'today' ? 'DAILY PLANNER' : activeTab === 'now' ? 'NOW COCKPIT' : activeTab.toUpperCase()}
            </span>
            <span className="text-neutral-600 hidden sm:inline">•</span>
            <span className="text-xs font-mono text-neutral-400 hidden sm:inline">
              {friendlyDate}
            </span>
          </div>
          <div className="text-xs text-neutral-400 hidden md:flex items-center gap-2 mt-0.5">
            {activeTask ? (
              <button
                onClick={() => setActiveTab('now')}
                className="flex items-center gap-2 text-emerald-300 font-medium hover:underline cursor-pointer min-w-0 truncate"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${isTimerRunning ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'}`} />
                <span className="truncate">Running: {activeTask.title}</span>
                <span className="font-mono text-[11px] text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30 shrink-0">
                  {formatSecondsToTimer(timerElapsedSeconds)}
                </span>
              </button>
            ) : (
              <span>Standby — Ready for planned commitments</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Quick Action Buttons & Status Indicators */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Anti-Dispersion Quick Capture */}
        <button
          onClick={() => setIsQuickCaptureOpen(true)}
          title="Anti-Dispersion Quick Capture (Store idea without losing focus)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs font-mono text-neutral-300 hover:text-emerald-300 hover:border-emerald-500/50 transition-all cursor-pointer shadow-xs"
        >
          <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="hidden sm:inline">Quick Capture</span>
          <span className="sm:hidden text-[11px]">Capture</span>
        </button>

        {/* Database state */}
        <button
          onClick={() => setIsSupabaseModalOpen(true)}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-neutral-950/80 border border-neutral-800 text-[11px] font-mono text-neutral-400 hover:border-neutral-700 transition-colors cursor-pointer"
        >
          <Database className={`w-3.5 h-3.5 ${storageMode === 'supabase' ? 'text-emerald-400' : 'text-neutral-400'}`} />
          <span>{storageMode === 'supabase' ? 'Supabase' : 'Local'}</span>
        </button>

        <VoiceButton />

        <NotificationCenter />

        <div className="hidden sm:block">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPlanDayModalOpen(true)}
            icon={<Calendar className="w-3.5 h-3.5 text-neutral-400" />}
          >
            Plan Day
          </Button>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateTaskModalOpen(true)}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          <span className="hidden sm:inline">Create Task</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>
    </header>
  );
};
