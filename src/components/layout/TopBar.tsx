import React from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
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
  Sun,
  Moon,
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

  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  const todayStr = getTodayString();
  const friendlyDate = formatFriendlyDate(todayStr);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'today':
        return t('dailyPlannerHeader', 'DAILY PLANNER');
      case 'now':
        return t('nowCockpitHeader', 'NOW COCKPIT');
      case 'dashboard':
        return t('dashboard', 'COMMAND CENTER').toUpperCase();
      case 'goals':
        return t('goals', 'GOALS').toUpperCase();
      case 'projects':
        return t('projects', 'PROJECTS').toUpperCase();
      case 'tasks':
        return t('tasks', 'TASKS').toUpperCase();
      case 'accountability':
        return t('accountability', 'ACCOUNTABILITY').toUpperCase();
      case 'analytics':
        return t('analytics', 'ANALYTICS').toUpperCase();
      case 'settings':
        return t('settings', 'SETTINGS').toUpperCase();
      case 'ai':
        return t('ai', 'AI BRAIN').toUpperCase();
      case 'help':
        return t('help', 'HELP & MANUAL').toUpperCase();
      default:
        return activeTab.toUpperCase();
    }
  };

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
              {getTabTitle()}
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
                <span className="truncate">{t('runningTask', 'Running:')} {activeTask.title}</span>
                <span className="font-mono text-[11px] text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30 shrink-0">
                  {formatSecondsToTimer(timerElapsedSeconds)}
                </span>
              </button>
            ) : (
              <span>{t('standby', 'Standby — Ready for planned commitments')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Quick Action Buttons, Language, Theme & Status Indicators */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Anti-Dispersion Quick Capture */}
        <button
          onClick={() => setIsQuickCaptureOpen(true)}
          title={t('quickCapture', 'Quick Capture')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs font-mono text-neutral-300 hover:text-emerald-300 hover:border-emerald-500/50 transition-all cursor-pointer shadow-xs"
        >
          <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="hidden sm:inline">{t('quickCapture', 'Quick Capture')}</span>
          <span className="sm:hidden text-[11px]">Capture</span>
        </button>

        {/* Database state */}
        <button
          onClick={() => setIsSupabaseModalOpen(true)}
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-neutral-950/80 border border-neutral-800 text-[11px] font-mono text-neutral-400 hover:border-neutral-700 transition-colors cursor-pointer"
        >
          <Database className={`w-3.5 h-3.5 ${storageMode === 'supabase' ? 'text-emerald-400' : 'text-neutral-400'}`} />
          <span>{storageMode === 'supabase' ? t('supabaseSync', 'Supabase') : t('localDb', 'Local')}</span>
        </button>


        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={t('toggleTheme', 'Toggle Light/Dark Theme')}
          className="p-2 rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />}
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
            {t('planDay', 'Plan Day')}
          </Button>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateTaskModalOpen(true)}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          <span className="hidden sm:inline">{t('createTask', 'Create Task')}</span>
          <span className="sm:hidden">{t('createTask', 'New')}</span>
        </Button>
      </div>
    </header>
  );
};
