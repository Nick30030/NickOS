import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ExecutionProvider, useExecution } from './context/ExecutionContext';
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
    case 'dashboard':
      return (
        <ErrorBoundary sectionName="Dashboard">
          <DashboardView />
        </ErrorBoundary>
      );
    case 'today':
      return (
        <ErrorBoundary sectionName="Today's Planner">
          <TodayView />
        </ErrorBoundary>
      );
    case 'now':
      return (
        <ErrorBoundary sectionName="NOW Cockpit">
          <NowView />
        </ErrorBoundary>
      );
    case 'accountability':
      return (
        <ErrorBoundary sectionName="Accountability">
          <AccountabilityView />
        </ErrorBoundary>
      );
    case 'goals':
      return (
        <ErrorBoundary sectionName="Goals">
          <GoalsView />
        </ErrorBoundary>
      );
    case 'projects':
      return (
        <ErrorBoundary sectionName="Projects">
          <ProjectsView />
        </ErrorBoundary>
      );
    case 'tasks':
      return (
        <ErrorBoundary sectionName="Tasks">
          <TasksView />
        </ErrorBoundary>
      );
    case 'analytics':
      return (
        <ErrorBoundary sectionName="Analytics Command Center">
          <AnalyticsView />
        </ErrorBoundary>
      );
    case 'ai':
      return (
        <ErrorBoundary sectionName="AI Brain">
          <AiBrainView />
        </ErrorBoundary>
      );
    case 'settings':
      return (
        <ErrorBoundary sectionName="Settings">
          <SettingsView />
        </ErrorBoundary>
      );
    default:
      return (
        <ErrorBoundary sectionName="Dashboard">
          <DashboardView />
        </ErrorBoundary>
      );
  }
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ExecutionProvider>
            <AppShell>
              <MainContentRouter />
            </AppShell>
          </ExecutionProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
