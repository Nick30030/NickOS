import React from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { APP_CONFIG } from '../../config/app.config';
import { NavigationTab } from '../../types/domain';
import {
  LayoutDashboard,
  CalendarDays,
  Crosshair,
  Target,
  FolderKanban,
  CheckSquare,
  BarChart3,
  Settings,
  Sun,
  Moon,
  Database,
  Play,
  Pause,
  ChevronRight,
  Shield,
  ShieldCheck,
  BrainCircuit,
  HelpCircle,
  Compass,
  Globe,
} from 'lucide-react';
import { formatSecondsToTimer } from '../../lib/utils';

const ICON_MAP: Record<NavigationTab, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  today: CalendarDays,
  now: Crosshair,
  accountability: ShieldCheck,
  goals: Target,
  projects: FolderKanban,
  tasks: CheckSquare,
  analytics: BarChart3,
  ai: BrainCircuit,
  settings: Settings,
  help: HelpCircle,
  command: LayoutDashboard,
  vision: Compass,
  objectives: FolderKanban,
  execution: Crosshair,
  evolution: ShieldCheck,
  tools: Settings,
};

export const Sidebar: React.FC<{
  onCloseMobile?: () => void;
}> = ({ onCloseMobile }) => {
  const {
    activeTab,
    setActiveTab,
    activeTask,
    isTimerRunning,
    timerElapsedSeconds,
    pauseFocusSession,
    resumeFocusSession,
    tasks,
    storageMode,
    setIsSupabaseModalOpen,
  } = useExecution();

  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const handleNav = (tabId: NavigationTab) => {
    setActiveTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;

  return (
    <aside className="w-64 h-full flex flex-col justify-between bg-neutral-900/90 border-r border-neutral-800/80 p-5 select-none shrink-0 backdrop-blur-xs overflow-hidden">
      {/* Brand Header */}
      <div className="space-y-7">
        <div className="flex items-center justify-between px-1 pt-1">
          <div className="flex items-center gap-3">
            <img
              src="/apple-touch-icon.png"
              alt="NickOS Logo"
              className="w-8 h-8 rounded-xl shadow-md shadow-emerald-400/25 object-cover border border-emerald-500/30"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-wider text-neutral-100 font-mono">NickOS</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  v1.0
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-mono tracking-tight">Personal Execution System</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          {APP_CONFIG.navigation.map(item => {
            const Icon = ICON_MAP[item.id] || LayoutDashboard;
            const isActive = activeTab === item.id;
            
            // Badge calculation
            let badgeText: string | number | undefined;
            if (item.id === 'tasks' && todoCount > 0) badgeText = todoCount;
            if (item.id === 'now' && activeTask) badgeText = 'LIVE';

            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/12 text-emerald-300 font-semibold border border-emerald-500/25 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-emerald-400' : 'text-neutral-400 group-hover:text-neutral-300'
                    }`}
                  />
                  <span>{t(item.id) || item.label}</span>
                </div>

                {badgeText && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      item.id === 'now'
                        ? 'bg-emerald-400 text-neutral-950 font-bold animate-pulse'
                        : isActive
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {badgeText}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Area: Active Task Pill & Nick Status */}
      <div className="space-y-3.5 pt-5 border-t border-neutral-800/80">
        {/* Active Focus Mini-Widget */}
        {activeTask && (
          <div
            onClick={() => handleNav('now')}
            className="p-3.5 rounded-xl bg-neutral-950/80 border border-emerald-500/30 text-xs space-y-2.5 cursor-pointer hover:border-emerald-500/60 transition-all shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {t('nowCockpitHeader', 'EXECUTION COCKPIT')}
              </span>
              <span className="font-mono text-xs font-bold text-neutral-100">
                {formatSecondsToTimer(timerElapsedSeconds)}
              </span>
            </div>
            <p className="text-neutral-200 font-medium truncate">{activeTask.title}</p>
            <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400 font-mono">
              <span>{activeTask.estimatedMinutes}m {t('plannedTime', 'target')}</span>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  isTimerRunning ? pauseFocusSession() : resumeFocusSession();
                }}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 cursor-pointer"
              >
                {isTimerRunning ? <Pause className="w-3 h-3 text-emerald-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
              </button>
            </div>
          </div>
        )}

        {/* Storage Mode Pill */}
        <button
          onClick={() => setIsSupabaseModalOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-950/70 border border-neutral-800 hover:border-neutral-700 text-[11px] font-mono text-neutral-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>{storageMode === 'supabase' ? t('supabaseSync', 'Supabase Sync') : t('localDb', 'Local-First DB')}</span>
          </div>
          <span className="text-[10px] text-neutral-400">Config</span>
        </button>

        {/* Sovereign Language Selector - ONLY in the vertical sidebar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between px-1 text-[10px] font-mono text-neutral-400">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-neutral-300">
              <Globe className="w-3 h-3 text-emerald-400" />
              {t('language', 'Langue')}
            </span>
            <span className="text-emerald-400 uppercase font-bold">{language}</span>
          </div>
          <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-950/80 rounded-xl border border-neutral-800 text-[11px] font-mono">
            {[
              { code: 'fr', label: 'FR', title: 'Français' },
              { code: 'en', label: 'EN', title: 'English' },
              { code: 'es', label: 'ES', title: 'Español' },
              { code: 'zh', label: '中文', title: '中文' },
            ].map(l => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code as any)}
                title={l.title}
                className={`py-1 rounded-lg text-center transition-all cursor-pointer font-bold ${
                  language === l.code
                    ? 'bg-emerald-500 text-neutral-950 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* User Nick Badge & Theme Toggle */}
        <div className="flex items-center justify-between px-1 py-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-200">
              N
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-200 leading-tight">Nick</p>
              <p className="text-[10px] text-neutral-400 font-mono">Decision Maker</p>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
            title={t('toggleTheme', 'Toggle Dark / Light Theme')}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
};
