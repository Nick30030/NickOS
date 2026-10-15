import React, { useState } from 'react';
import { useExecution } from '../../context/ExecutionContext';
import { NavigationTab } from '../../types/domain';
import { 
  Crosshair, 
  Calendar, 
  Zap, 
  CheckSquare, 
  Menu, 
  X,
  LayoutDashboard,
  Target,
  FolderKanban,
  BarChart3,
  ShieldCheck,
  BrainCircuit,
  Settings,
  Bell
} from 'lucide-react';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { useLanguage } from '../../context/LanguageContext';

export const MobileNavBar: React.FC = () => {
  const { activeTab, setActiveTab, setIsQuickCaptureOpen } = useExecution();
  const { t } = useLanguage();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const primaryTabs = [
    { id: 'now' as NavigationTab, label: t('now', 'NOW'), icon: Crosshair },
    { id: 'today' as NavigationTab, label: t('today', 'Today'), icon: Calendar },
    { id: 'capture', label: t('quickCapture', 'Capture'), icon: Zap, isAction: true },
    { id: 'tasks' as NavigationTab, label: t('tasks', 'Tasks'), icon: CheckSquare },
  ];

  const secondaryTabs = [
    { id: 'dashboard' as NavigationTab, label: t('dashboard', 'Dashboard'), icon: LayoutDashboard },
    { id: 'ai' as NavigationTab, label: t('ai', 'AI Brain'), icon: BrainCircuit },
    { id: 'accountability' as NavigationTab, label: t('accountability', 'Review'), icon: ShieldCheck },
    { id: 'projects' as NavigationTab, label: t('projects', 'Projects'), icon: FolderKanban },
    { id: 'goals' as NavigationTab, label: t('goals', 'Goals'), icon: Target },
    { id: 'analytics' as NavigationTab, label: t('analytics', 'Analytics'), icon: BarChart3 },
    { id: 'settings' as NavigationTab, label: t('settings', 'Settings'), icon: Settings },
  ];

  const handlePrimaryClick = (tab: typeof primaryTabs[0]) => {
    if (tab.isAction) {
      setIsQuickCaptureOpen(true);
    } else if (tab.id) {
      setActiveTab(tab.id as NavigationTab);
      setIsMoreMenuOpen(false);
    }
  };

  const handleSecondaryClick = (tabId: NavigationTab) => {
    setActiveTab(tabId);
    setIsMoreMenuOpen(false);
  };

  return (
    <>
      {/* Bottom Tab Bar (lg:hidden) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-neutral-900 border-t border-neutral-800 flex items-center justify-around px-2 z-40 pb-safe shadow-lg" id="mobile-tab-navigation">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && !tab.isAction;
          
          if (tab.isAction) {
            return (
              <button
                key={tab.label}
                onClick={() => handlePrimaryClick(tab)}
                className="flex flex-col items-center justify-center -mt-6 w-12 h-12 rounded-full bg-emerald-400 text-neutral-950 shadow-md active:scale-95 transition-transform cursor-pointer"
                title="Quick Anti-Dispersion Capture"
              >
                <Icon className="w-5.5 h-5.5" />
              </button>
            );
          }

          return (
            <button
              key={tab.label}
              onClick={() => handlePrimaryClick(tab)}
              className={`flex flex-col items-center justify-center w-14 h-12 rounded-lg cursor-pointer transition-colors ${
                isActive ? 'text-emerald-400' : 'text-neutral-400 active:text-neutral-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-mono font-medium mt-0.5">{tab.label}</span>
            </button>
          );
        })}

        {/* Secondary Navigation Trigger (More Menu) */}
        <button
          onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
          className={`flex flex-col items-center justify-center w-14 h-12 rounded-lg cursor-pointer transition-colors ${
            isMoreMenuOpen ? 'text-emerald-400' : 'text-neutral-400 active:text-neutral-200'
          }`}
        >
          {isMoreMenuOpen ? <X className="w-5 h-5 text-emerald-400" /> : <Menu className="w-5 h-5" />}
          <span className="text-[10px] font-mono font-medium mt-0.5">More</span>
        </button>
      </nav>

      {/* Slide-Up Overlay Sheet for Secondary Navigation */}
      {isMoreMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-35 flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMoreMenuOpen(false)}
          />

          {/* Slide-Up Panel */}
          <div className="relative z-10 bg-neutral-900 border-t border-neutral-800 rounded-t-2xl px-4 pt-5 pb-20 shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Grabber indicator */}
            <div className="w-12 h-1 bg-neutral-800 rounded-full mx-auto mb-4" />
            
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold">
                Secondary Cockpits
              </span>
              <NotificationCenter />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {secondaryTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSecondaryClick(tab.id)}
                    className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl border border-neutral-850 active:scale-95 transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                        : 'bg-neutral-950/40 text-neutral-300 hover:text-neutral-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="text-[9px] font-mono text-center leading-tight truncate w-full">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
