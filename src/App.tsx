import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ExecutionProvider, useExecution } from './context/ExecutionContext';
import { GamificationProvider } from './context/GamificationContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppShell } from './components/layout/AppShell';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Views
import { DashboardView } from './components/views/DashboardView';
import { TodayView } from './components/views/TodayView';
import { NowView } from './components/views/NowView';
import { GoalsView } from './components/views/GoalsView';
import { ProjectsView } from './components/views/ProjectsView';
import { TasksView } from './components/views/TasksView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { SettingsView } from './components/views/SettingsView';
import { AccountabilityView } from './components/views/AccountabilityView';
import { AiBrainView } from './components/views/AiBrainView';
import { HelpView } from './components/views/HelpView';
import { CommandCenterView } from './components/views/CommandCenterView';
import { VisionView } from './components/views/VisionView';

const MainContentRouter: React.FC = () => {
  const { activeTab, isLoading } = useExecution();
  const [loadingTimedOut, setLoadingTimedOut] = React.useState(false);

  // Auto-timeout safeguard: on iOS PWA or slow networks, never trap the user for more than 3.5s
  React.useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimedOut(true);
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      setLoadingTimedOut(false);
    }
  }, [isLoading]);

  if (isLoading && !loadingTimedOut) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 gap-5">
        <img
          src="/apple-touch-icon.png"
          alt="NickOS"
          className="w-16 h-16 rounded-2xl shadow-xl shadow-emerald-500/20 border border-emerald-500/40 object-cover"
          referrerPolicy="no-referrer"
        />
        <LoadingSpinner size="lg" label="Bootstrapping NickOS execution kernel..." />
        <button
          type="button"
          onClick={() => setLoadingTimedOut(true)}
          className="text-xs font-mono text-neutral-400 hover:text-emerald-400 underline transition-colors cursor-pointer pt-2"
        >
          Skip &amp; Open Workspace
        </button>
      </div>
    );
  }

  switch (activeTab) {
    case 'command':
    case 'dashboard':
      return (
        <ErrorBoundary sectionName="Command Center">
          <CommandCenterView />
        </ErrorBoundary>
      );
    case 'vision':
      return (
        <ErrorBoundary sectionName="Vision">
          <VisionView />
        </ErrorBoundary>
      );
    case 'objectives':
    case 'projects':
      return (
        <ErrorBoundary sectionName="Objectives & Projects">
          <ProjectsView />
        </ErrorBoundary>
      );
    case 'goals':
      return (
        <ErrorBoundary sectionName="Goals">
          <GoalsView />
        </ErrorBoundary>
      );
    case 'execution':
    case 'today':
      return (
        <ErrorBoundary sectionName="Execution Planner">
          <TodayView />
        </ErrorBoundary>
      );
    case 'now':
      return (
        <ErrorBoundary sectionName="Execution Cockpit">
          <NowView />
        </ErrorBoundary>
      );
    case 'tasks':
      return (
        <ErrorBoundary sectionName="Tasks">
          <TasksView />
        </ErrorBoundary>
      );
    case 'evolution':
    case 'accountability':
      return (
        <ErrorBoundary sectionName="Evolution & Reviews">
          <AccountabilityView />
        </ErrorBoundary>
      );
    case 'analytics':
      return (
        <ErrorBoundary sectionName="Analytics">
          <AnalyticsView />
        </ErrorBoundary>
      );
    case 'tools':
    case 'settings':
      return (
        <ErrorBoundary sectionName="Tools & Settings">
          <SettingsView />
        </ErrorBoundary>
      );
    case 'ai':
      return (
        <ErrorBoundary sectionName="AI Brain">
          <AiBrainView />
        </ErrorBoundary>
      );
    case 'help':
      return (
        <ErrorBoundary sectionName="Help & Guide">
          <HelpView />
        </ErrorBoundary>
      );
    default:
      return (
        <ErrorBoundary sectionName="Command Center">
          <CommandCenterView />
        </ErrorBoundary>
      );
  }
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider>
            <GamificationProvider>
              <ExecutionProvider>
                <AppShell>
                  <MainContentRouter />
                </AppShell>
              </ExecutionProvider>
            </GamificationProvider>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
