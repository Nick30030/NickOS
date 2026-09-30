import { NavigationTab, UserProfile } from '../types/domain';

export interface NavItemConfig {
  id: NavigationTab;
  label: string;
  badge?: string | number;
  description: string;
  icon: string;
}

export const APP_CONFIG = {
  name: 'NICK OS',
  tagline: 'Personal Execution Operating System',
  version: '1.0.0-foundation',
  defaultUser: {
    id: 'user-nick-01',
    name: 'Nick',
    email: 'ncorp237@gmail.com',
    timezone: 'Europe/London',
    workingHoursStart: '08:30',
    workingHoursEnd: '18:30',
    themePreference: 'dark',
    strictAccountabilityMode: true,
  } as UserProfile,
  
  navigation: [
    { id: 'dashboard', label: 'Dashboard', description: 'Overview & Today execution status', icon: 'LayoutDashboard' },
    { id: 'today', label: 'Today', description: 'Daily timeblock execution program', icon: 'CalendarDays' },
    { id: 'now', label: 'NOW', description: 'Zero-distraction active execution cockpit', icon: 'Crosshair' },
    { id: 'goals', label: 'Goals', description: 'Quarterly & high-level targets', icon: 'Target' },
    { id: 'projects', label: 'Projects', description: 'Active project registry', icon: 'FolderKanban' },
    { id: 'tasks', label: 'Tasks', description: 'Master actionable backlog', icon: 'CheckSquare' },
    { id: 'accountability', label: 'Accountability', description: 'Daily reviews, reconciliation & factual history', icon: 'ShieldCheck' },
    { id: 'analytics', label: 'Analytics', description: 'Planned vs actual execution metrics', icon: 'BarChart3' },
    { id: 'ai', label: 'AI Brain', description: 'Nick OS Contextual Planner & Unblocker', icon: 'BrainCircuit' },
    { id: 'settings', label: 'Settings', description: 'Supabase, profile & integrations', icon: 'Settings' },
  ] as NavItemConfig[],

  priorityColors: {
    critical: {
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      dot: 'bg-rose-500',
    },
    high: {
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      dot: 'bg-amber-500',
    },
    medium: {
      bg: 'bg-blue-500/15',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      dot: 'bg-blue-500',
    },
    low: {
      bg: 'bg-neutral-500/15',
      text: 'text-neutral-400',
      border: 'border-neutral-500/30',
      dot: 'bg-neutral-400',
    },
  },

  commitmentColors: {
    hard_commitment: {
      label: 'Hard Commitment',
      badge: 'bg-rose-950/60 text-rose-300 border-rose-800/50',
    },
    flexible: {
      label: 'Flexible',
      badge: 'bg-neutral-900 text-neutral-300 border-neutral-700/50',
    },
    stretch: {
      label: 'Stretch Goal',
      badge: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/40',
    },
  },

  statusColors: {
    todo: { label: 'To Do', color: 'text-neutral-400', bg: 'bg-neutral-800' },
    in_progress: { label: 'In Progress', color: 'text-amber-400', bg: 'bg-amber-500/20' },
    completed: { label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    blocked: { label: 'Blocked', color: 'text-rose-400', bg: 'bg-rose-500/20' },
    deferred: { label: 'Deferred', color: 'text-neutral-500', bg: 'bg-neutral-900' },
    backlog: { label: 'Backlog', color: 'text-neutral-400', bg: 'bg-neutral-800' },
  },

  featuresRoadmap: [
    { title: 'Supabase PostgreSQL DB', status: 'Ready for Configuration', ready: true },
    { title: 'Local-First Persistence', status: 'Active (Production-Ready)', ready: true },
    { title: 'AI Planning & Scheduling', status: 'Architectural Hook Prepared', ready: false },
    { title: 'Google Calendar API', status: 'OAuth & Service Skeleton Ready', ready: false },
    { title: 'Google Tasks API', status: 'Contract Ready', ready: false },
    { title: 'Push & iOS Notifications', status: 'Service Layer Ready', ready: false },
    { title: 'Voice / TTS Notifications', status: 'Future Phase Hook', ready: false },
  ],
};
