import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useGamification } from './GamificationContext';
import { playSuccessChime } from '../lib/audio';
import {
  Task,
  Project,
  Goal,
  LifeArea,
  Commitment,
  DayPlan,
  TimeBlock,
  ExecutionSession,
  SessionPause,
  SessionCheckIn,
  InboxItem,
  DailyAccountabilityRecord,
  ReconciledCommitment,
  ExternalBlockerRecord,
  WeeklyAccountabilityAggregate,
  ExecutionMetrics,
  NavigationTab,
  UserProfile,
  TaskStatus,
  TimeBlockStatus,
  AiProposal,
  AiProposalStatus,
} from '../types/domain';
import { BehavioralMetrics, BehaviorProfile, TransparencyInsight } from '../types/behavior';
import { FocusGuardSettings, FocusGuardAgentHeartbeat } from '../types/focus';
import { AdaptiveLearningService } from '../services/adaptive/AdaptiveLearningService';
import { getRepository, getActiveStorageMode } from '../services/storage';
import { executionService } from '../services/execution/ExecutionService';
import { AccountabilityService } from '../services/accountability/AccountabilityService';
import { getTodayString, timeToMinutes, generateId, playNotificationChime } from '../lib/utils';
import { VoiceCommandService } from '../services/voice/VoiceCommandService';
import { VoiceService } from '../services/voice/VoiceService';
import { NotificationService } from '../services/notifications/NotificationService';

interface ExecutionContextType {
  // Navigation
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;

  // Data
  lifeAreas: LifeArea[];
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  commitments: Commitment[];
  timeBlocks: TimeBlock[];
  inboxItems: InboxItem[];
  todayPlan: DayPlan | null;
  metrics: ExecutionMetrics | null;
  userProfile: UserProfile | null;
  activeExecutionSession: ExecutionSession | null;
  executionHistory: ExecutionSession[];
  
  // Adaptive Learning & Insights
  behaviorMetrics: BehavioralMetrics | null;
  behaviorProfile: BehaviorProfile | null;
  transparencyInsights: TransparencyInsight[];
  
  // Accountability Records & Reviews
  accountabilityRecord: DailyAccountabilityRecord | null;
  accountabilityRecords: DailyAccountabilityRecord[];
  selectedAccountabilityDate: string;
  setSelectedAccountabilityDate: (date: string) => void;
  loadAccountabilityForDate: (date: string) => Promise<DailyAccountabilityRecord>;
  reconcileCommitment: (taskId: string, updates: Partial<ReconciledCommitment>, date?: string) => Promise<void>;
  recordExternalBlocker: (blocker: Omit<ExternalBlockerRecord, 'id' | 'loggedAt'>, date?: string) => Promise<void>;
  deleteExternalBlocker: (blockerId: string, date?: string) => Promise<void>;
  addConcreteOutput: (output: string, date?: string) => Promise<void>;
  removeConcreteOutput: (index: number, date?: string) => Promise<void>;
  updateDailyNotes: (notes: string, date?: string) => Promise<void>;
  finalizeDay: (notes?: string, date?: string) => Promise<void>;
  reopenDay: (date?: string) => Promise<void>;
  getWeeklyAggregate: (startDate: string, endDate: string) => WeeklyAccountabilityAggregate;

  // Storage & Loading State
  isLoading: boolean;
  error: string | null;
  storageMode: 'supabase' | 'local_storage';

  // Active Focus Timer & Execution Session State
  activeFocusTaskId: string | null;
  activeTask: Task | null;
  activeTimeBlockId: string | null;
  isTimerRunning: boolean;
  timerElapsedSeconds: number;
  startFocusSession: (taskId: string, timeBlockId?: string) => Promise<void>;
  pauseFocusSession: (reason?: string, category?: SessionPause['category']) => Promise<void>;
  resumeFocusSession: () => Promise<void>;
  stopFocusSession: () => Promise<void>;
  completeActiveTask: (notes?: string) => Promise<void>;
  abandonOrPostponeTask: (taskId: string, reason: string, targetDate?: string) => Promise<void>;
  recordManualCheckIn: (type: SessionCheckIn['type'], note?: string) => Promise<void>;
  recordHeartbeat: () => Promise<void>;

  // Data Actions
  refreshData: () => Promise<void>;
  
  // Task Actions
  createTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  postponeTask: (taskId: string, targetDate?: string) => Promise<void>;
  toggleChecklistItem: (taskId: string, checkId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  // Goal Actions
  createGoal: (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Goal>;
  updateGoal: (goalId: string, updates: Partial<Goal>) => Promise<Goal>;
  deleteGoal: (goalId: string) => Promise<void>;

  // Project Actions
  createProject: (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'taskCount' | 'completedTaskCount'>) => Promise<Project>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;

  // Time Block Actions
  createTimeBlock: (blockData: Omit<TimeBlock, 'id' | 'createdAt' | 'updatedAt'>) => Promise<TimeBlock>;
  updateTimeBlock: (id: string, updates: Partial<TimeBlock>) => Promise<TimeBlock>;
  deleteTimeBlock: (id: string) => Promise<void>;
  shiftTimeBlock: (id: string, newStartTime: string, newEndTime: string) => Promise<TimeBlock>;

  // Anti-Dispersion / Inbox Actions
  quickCaptureThought: (title: string, description?: string) => Promise<InboxItem>;
  deleteInboxItem: (id: string) => Promise<void>;

  // Commitment & Plan Actions
  selectedPlannerDate: string;
  setSelectedPlannerDate: (date: string) => void;
  currentPlannerPlan: DayPlan | null;
  todayTimeBlocks: TimeBlock[];
  approveCommitment: (commitmentId: string, approved: boolean) => Promise<void>;
  commitDayPlan: (params: { date?: string; focusGoalToday: string; plannedTaskIds: string[]; energyTarget: 'maximum' | 'steady' | 'recovery'; notes?: string }) => Promise<DayPlan>;
  commitTodayPlan: (params: { focusGoalToday: string; plannedTaskIds: string[]; energyTarget: 'maximum' | 'steady' | 'recovery'; notes?: string }) => Promise<void>;

  // Desktop Notifications & In-App Alerts
  desktopPermission: NotificationPermission | 'unsupported';
  requestDesktopPermission: () => Promise<boolean>;
  sendTestDesktopAlert: () => Promise<void>;
  activeInAppAlert: {
    id: string;
    title: string;
    body: string;
    type: string;
    priority?: string;
    metadata?: { deepLink?: string };
  } | null;
  triggerInAppAlert: (alert: {
    title: string;
    body: string;
    type?: string;
    priority?: string;
    metadata?: { deepLink?: string };
  }) => void;
  dismissInAppAlert: () => void;

  // Task Modal state
  isTaskModalOpen: boolean;
  taskModalDefaults: Partial<Task> | null;
  editingTask: Task | null;
  openCreateTaskModal: (initialValues?: Partial<Task>) => void;
  openEditTaskModal: (task: Task) => void;
  closeTaskModal: () => void;
  
  // Aliases for backwards compatibility
  isCreateTaskModalOpen: boolean;
  setIsCreateTaskModalOpen: (open: boolean) => void;

  // Goal Modal state
  isGoalModalOpen: boolean;
  goalModalDefaults: Partial<Goal> | null;
  editingGoal: Goal | null;
  openCreateGoalModal: (initialValues?: Partial<Goal>) => void;
  openEditGoalModal: (goal: Goal) => void;
  closeGoalModal: () => void;

  // Project Modal state
  isProjectModalOpen: boolean;
  projectModalDefaults: Partial<Project> | null;
  editingProject: Project | null;
  openCreateProjectModal: (initialValues?: Partial<Project>) => void;
  openEditProjectModal: (project: Project) => void;
  closeProjectModal: () => void;

  // Time Block Modal state
  isTimeBlockModalOpen: boolean;
  timeBlockModalDefaults: Partial<TimeBlock> | null;
  editingTimeBlock: TimeBlock | null;
  openCreateTimeBlockModal: (initialValues?: Partial<TimeBlock>) => void;
  openEditTimeBlockModal: (block: TimeBlock) => void;
  closeTimeBlockModal: () => void;

  // Quick Capture Modal state
  isQuickCaptureOpen: boolean;
  setIsQuickCaptureOpen: (open: boolean) => void;

  // Other Modals state
  isPlanDayModalOpen: boolean;
  setIsPlanDayModalOpen: (open: boolean) => void;
  isSupabaseModalOpen: boolean;
  setIsSupabaseModalOpen: (open: boolean) => void;

  // AI Brain State & Methods
  aiProposals: AiProposal[];
  loadAiProposals: () => Promise<void>;
  createAiProposal: (proposal: Omit<AiProposal, 'id' | 'createdAt'>) => Promise<AiProposal>;
  updateAiProposalStatus: (id: string, status: AiProposalStatus) => Promise<void>;
  buildCompactContext: () => any;

  // Focus Guard State & Methods
  focusGuardSettings: FocusGuardSettings;
  updateFocusGuardSettings: (settings: Partial<FocusGuardSettings>) => Promise<FocusGuardSettings>;
  focusGuardAgents: FocusGuardAgentHeartbeat[];
  refreshFocusGuardAgents: () => Promise<void>;
}

const ExecutionContext = createContext<ExecutionContextType | undefined>(undefined);

export const ExecutionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser, mode: authMode } = useAuth();
  const { recordTaskCompletion } = useGamification();
  const [activeTab, setActiveTab] = useState<NavigationTab>('now');
  const [aiProposals, setAiProposals] = useState<AiProposal[]>([]);
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [todayTimeBlocks, setTodayTimeBlocks] = useState<TimeBlock[]>([]);
  const [selectedPlannerDate, setSelectedPlannerDate] = useState<string>(getTodayString());
  const [currentPlannerPlan, setCurrentPlannerPlan] = useState<DayPlan | null>(null);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [todayPlan, setTodayPlan] = useState<DayPlan | null>(null);
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [metrics, setMetrics] = useState<ExecutionMetrics | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeExecutionSession, setActiveExecutionSession] = useState<ExecutionSession | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ExecutionSession[]>([]);

  // Adaptive Learning & Insights State
  const [behaviorMetrics, setBehaviorMetrics] = useState<BehavioralMetrics | null>(null);
  const [behaviorProfile, setBehaviorProfile] = useState<BehaviorProfile | null>(null);
  const [transparencyInsights, setTransparencyInsights] = useState<TransparencyInsight[]>([]);

  // Accountability State
  const [accountabilityRecord, setAccountabilityRecord] = useState<DailyAccountabilityRecord | null>(null);
  const [accountabilityRecords, setAccountabilityRecords] = useState<DailyAccountabilityRecord[]>([]);
  const [selectedAccountabilityDate, setSelectedAccountabilityDate] = useState<string>(getTodayString());

  // Focus Guard State
  const [focusGuardSettings, setFocusGuardSettings] = useState<FocusGuardSettings>({
    enabled: true,
    mode: 'blacklist',
    allowedDomains: ['nickos.ai.studio', 'ai.studio', 'github.com', 'google.com', 'stackoverflow.com', 'docs.google.com'],
    blockedDomains: ['youtube.com', 'x.com', 'twitter.com', 'reddit.com', 'facebook.com', 'instagram.com', 'tiktok.com'],
    blockedApps: ['Discord.exe', 'Steam.exe', 'Spotify.exe', 'League of Legends.exe'],
    unknownSitePolicy: 'allow',
    updatedAt: new Date().toISOString(),
  });
  const [focusGuardAgents, setFocusGuardAgents] = useState<FocusGuardAgentHeartbeat[]>([]);
  const lastSyncedFocusSessionIdRef = useRef<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<'supabase' | 'local_storage'>('local_storage');

  // Focus Timer State
  const [activeFocusTaskId, setActiveFocusTaskId] = useState<string | null>(null);
  const [activeTimeBlockId, setActiveTimeBlockId] = useState<string | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerElapsedSeconds, setTimerElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDoneRef = useRef<boolean>(false);
  const lastBlockedCountRef = useRef<number>(0);

  // Task Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalDefaults, setTaskModalDefaults] = useState<Partial<Task> | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Goal Modal
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalModalDefaults, setGoalModalDefaults] = useState<Partial<Goal> | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Project Modal
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectModalDefaults, setProjectModalDefaults] = useState<Partial<Project> | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Time Block Modal
  const [isTimeBlockModalOpen, setIsTimeBlockModalOpen] = useState(false);
  const [timeBlockModalDefaults, setTimeBlockModalDefaults] = useState<Partial<TimeBlock> | null>(null);
  const [editingTimeBlock, setEditingTimeBlock] = useState<TimeBlock | null>(null);

  // Quick Capture Modal
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);

  // Plan & Supabase Modals
  const [isPlanDayModalOpen, setIsPlanDayModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  const today = getTodayString();
  const repo = getRepository();
  const accountabilityService = new AccountabilityService(repo);

  const refreshData = useCallback(async (options?: { forceLoading?: boolean }) => {
    try {
      if (!initialLoadDoneRef.current || options?.forceLoading) {
        setIsLoading(true);
      }
      setError(null);
      setStorageMode(getActiveStorageMode());

      // Safe timeout race to avoid freezing if network drops on mobile standalone PWA
      const fetchPromise = Promise.all([
        repo.getLifeAreas(),
        repo.getTasks(),
        repo.getProjects(),
        repo.getGoals(),
        repo.getCommitments(today),
        repo.getDayPlan(today),
        repo.getExecutionMetrics(today),
        repo.getUserProfile(),
        repo.getInboxItems(),
        repo.getExecutionSessions(),
        repo.getAccountabilityRecords(),
        repo.getAiProposals(),
        repo.getFocusGuardSettings().catch(() => focusGuardSettings),
        repo.getAgentHeartbeats().catch(() => []),
      ]);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Storage bootstrap timeout - fallback to local cache')), 6000)
      );

      const [
        loadedAreas,
        loadedTasks,
        loadedProjects,
        loadedGoals,
        loadedCommitments,
        loadedPlan,
        loadedMetrics,
        loadedProfile,
        loadedInbox,
        loadedSessions,
        loadedAccRecords,
        loadedAiProposals,
        loadedFgSettings,
        loadedFgAgents,
      ] = await Promise.race([fetchPromise, timeoutPromise]);

      const todayPlanId = loadedPlan?.id || `plan-${today}`;
      const loadedTodayBlocks = await repo.getTimeBlocks(todayPlanId).catch(() => []);
      setTodayTimeBlocks(loadedTodayBlocks);

      let activePlannerPlan = loadedPlan;
      let activePlannerBlocks = loadedTodayBlocks;

      if (selectedPlannerDate && selectedPlannerDate !== today) {
        activePlannerPlan = await repo.getDayPlan(selectedPlannerDate).catch(() => null);
        const plannerPlanId = activePlannerPlan?.id || `plan-${selectedPlannerDate}`;
        activePlannerBlocks = await repo.getTimeBlocks(plannerPlanId).catch(() => []);
      }

      setLifeAreas(loadedAreas);
      setTasks(loadedTasks);
      setProjects(loadedProjects);
      setGoals(loadedGoals);
      setCommitments(loadedCommitments);
      setTimeBlocks(activePlannerBlocks);
      setInboxItems(loadedInbox);
      setTodayPlan(loadedPlan);
      setCurrentPlannerPlan(activePlannerPlan);
      setMetrics(loadedMetrics);
      setUserProfile(loadedProfile);
      setExecutionHistory(loadedSessions);
      setAccountabilityRecords(loadedAccRecords);
      setAiProposals(loadedAiProposals);
      if (loadedFgSettings) setFocusGuardSettings(loadedFgSettings);
      if (loadedFgAgents) setFocusGuardAgents(loadedFgAgents);

      // Compute Adaptive behavioral aggregates and insights
      const computedMetrics = AdaptiveLearningService.calculateMetrics(
        loadedTasks,
        loadedPlan ? [loadedPlan] : [],
        loadedTodayBlocks,
        loadedSessions,
        loadedAccRecords,
        loadedProjects
      );
      const computedProfile = AdaptiveLearningService.buildProfile(computedMetrics, loadedTasks);
      const computedInsights = AdaptiveLearningService.generateInsights(computedMetrics, computedProfile);

      setBehaviorMetrics(computedMetrics);
      setBehaviorProfile(computedProfile);
      setTransparencyInsights(computedInsights);

      // Load or generate current accountability record for selected date
      const targetDate = selectedAccountabilityDate || today;
      const targetPlan = targetDate === today ? loadedPlan : await repo.getDayPlan(targetDate).catch(() => null);
      const curAcc = await accountabilityService.generateOrLoadDailyRecord(
        targetDate,
        loadedTasks,
        targetPlan,
        loadedSessions,
        loadedProjects,
        loadedGoals
      ).catch(() => null);
      if (curAcc) {
        setAccountabilityRecord(curAcc);
      }

      // Check for active or paused session in DB (Source of Truth Recovery)
      const persistedActiveSession = loadedSessions.find(s => s.status === 'active' || s.status === 'paused');
      if (persistedActiveSession) {
        setActiveExecutionSession(persistedActiveSession);
        setActiveFocusTaskId(persistedActiveSession.taskId);
        if (persistedActiveSession.timeBlockId) {
          setActiveTimeBlockId(persistedActiveSession.timeBlockId);
        }
        setIsTimerRunning(persistedActiveSession.status === 'active');
        
        // Compute exact net active duration from timestamps and pauses
        const computedSeconds = executionService.calculateSessionActiveSeconds(persistedActiveSession);
        setTimerElapsedSeconds(computedSeconds);
      } else {
        // Fallback: if a task is marked in_progress, select it safely without triggering loop
        const inProg = loadedTasks.find(t => t.status === 'in_progress');
        if (inProg) {
          setActiveFocusTaskId(prev => prev || inProg.id);
          if (inProg.actualMinutes && inProg.actualMinutes > 0) {
            setTimerElapsedSeconds(prev => (prev === 0 ? inProg.actualMinutes! * 60 : prev));
          }
        }
      }
    } catch (err) {
      console.warn('Kernel bootstrap warning:', err);
      // Only set error message if initial mount failed completely, otherwise soft degrade
      if (!initialLoadDoneRef.current) {
        setError(null);
      }
    } finally {
      initialLoadDoneRef.current = true;
      setIsLoading(false);
    }
  }, [today, repo, selectedAccountabilityDate, selectedPlannerDate]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Local Stopwatch Visual Tick (Synchronized to Session)
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Persistent Heartbeat Interval: sends active interface pulse every 20 seconds
  useEffect(() => {
    if (isTimerRunning && activeExecutionSession) {
      heartbeatRef.current = setInterval(async () => {
        try {
          const updated = await executionService.recordHeartbeat(activeExecutionSession.id);
          if (updated) {
            setActiveExecutionSession(updated);
          }
        } catch (err) {
          console.warn('Heartbeat background tick error:', err);
        }
      }, 20000);
    } else if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isTimerRunning, activeExecutionSession]);

  // Focus Guard Methods & Session Sync Effect
  const handleUpdateFocusGuardSettings = useCallback(async (updates: Partial<FocusGuardSettings>) => {
    const updated = await repo.saveFocusGuardSettings(updates);
    setFocusGuardSettings(updated);
    try {
      await fetch('/api/focus-guard/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.warn('Failed to sync Focus Guard settings to API:', err);
    }
    return updated;
  }, [repo]);

  const handleRefreshFocusGuardAgents = useCallback(async () => {
    try {
      const response = await fetch('/api/focus-guard/agents');
      if (!response.ok) throw new Error(`Focus Guard agents: HTTP ${response.status}`);
      const data = await response.json();
      setFocusGuardAgents(data.agents || []);
    } catch (error) {
      console.warn('Failed to refresh Focus Guard agents:', error);
      setFocusGuardAgents([]);
    }
  }, []);

  useEffect(() => {
    // Wait for persisted sessions and settings before publishing initial state.
    if (isLoading) return;
    const controller = new AbortController();
    const syncSession = async () => {
      let status: 'active' | 'paused' | 'completed' | 'abandoned' | 'disconnected' =
        lastSyncedFocusSessionIdRef.current ? 'completed' : 'disconnected';
      if (activeExecutionSession) {
        status = activeExecutionSession.status === 'postponed' ? 'abandoned' : activeExecutionSession.status;
        lastSyncedFocusSessionIdRef.current = activeExecutionSession.id;
      }
      const activeTask = tasks.find(t => t.id === activeFocusTaskId);
      try {
        const response = await fetch('/api/focus-guard/session-sync', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeExecutionSession?.id || lastSyncedFocusSessionIdRef.current,
            taskId: activeFocusTaskId || null,
            taskTitle: activeTask?.title || null,
            status,
            startTime: activeExecutionSession?.startTime || null,
            settings: focusGuardSettings,
          }),
        });
        if (!response.ok) throw new Error(`Focus Guard sync: HTTP ${response.status}`);
      } catch (error) {
        if (!controller.signal.aborted) console.warn('Focus Guard session sync failed:', error);
      }
    };

    syncSession();
    const interval = setInterval(syncSession, 10000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [isLoading, activeExecutionSession, activeFocusTaskId, tasks, focusGuardSettings]);

  useEffect(() => {
    if (!isLoading) handleRefreshFocusGuardAgents();
  }, [isLoading, handleRefreshFocusGuardAgents]);

  // Periodic agent check to trigger focus guard violation sounds
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkViolations = async () => {
      try {
        const res = await fetch('/api/focus-guard/active-session');
        if (res.ok) {
          const data = await res.json();
          setFocusGuardAgents(data.agents || []);
          const currentTotalBlocked = (data.agents || []).reduce((sum: number, ag: any) => sum + (ag.blockedEnforcementsCount || 0), 0);
          
          if (lastBlockedCountRef.current > 0 && currentTotalBlocked > lastBlockedCountRef.current) {
            // Focus Guard violation detected!
            VoiceService.triggerStateAlert(
              'focus_violation',
              "Avertissement Focus Guard ! Une application ou un site interdit a été détecté. Restez concentré."
            );
          }
          lastBlockedCountRef.current = currentTotalBlocked;
        }
      } catch {
        // quiet ignore
      }
    };

    const interval = setInterval(checkViolations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Desktop Notifications Handlers
  const [activeInAppAlert, setActiveInAppAlert] = useState<{
    id: string;
    title: string;
    body: string;
    type: string;
    priority?: string;
    metadata?: { deepLink?: string };
  } | null>(null);

  const dismissInAppAlert = useCallback(() => {
    setActiveInAppAlert(null);
  }, []);

  const triggerInAppAlert = useCallback((alert: {
    title: string;
    body: string;
    type?: string;
    priority?: string;
    metadata?: { deepLink?: string };
  }) => {
    playNotificationChime();
    setActiveInAppAlert({
      id: generateId('alert'),
      title: alert.title,
      body: alert.body,
      type: alert.type || 'system_alert',
      priority: alert.priority || 'high',
      metadata: alert.metadata,
    });
  }, []);

  const requestDesktopPermission = async (): Promise<boolean> => {
    const granted = await NotificationService.requestBrowserPermission();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setDesktopPermission(Notification.permission);
    }
    if (granted) {
      const activeNotice = {
        id: generateId('notif'),
        userId: 'nick-sovereign',
        type: 'system_alert',
        title: '⚡ NickOS Desktop Alerts Active',
        body: 'You will receive desktop alerts when your scheduled focus blocks start and 10 minutes prior.',
        priority: 'high' as const,
        scheduledFor: new Date().toISOString(),
        status: 'delivered' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: { deepLink: '#/today' },
      };
      NotificationService.surfaceBrowserNotification(activeNotice);
      triggerInAppAlert({
        title: activeNotice.title,
        body: activeNotice.body,
        type: activeNotice.type,
        priority: activeNotice.priority,
        metadata: activeNotice.metadata,
      });
    }
    return granted;
  };

  const sendTestDesktopAlert = async (): Promise<void> => {
    if (desktopPermission !== 'granted') {
      await requestDesktopPermission();
    }
    const testNotice = {
      id: generateId('test-notif'),
      userId: 'nick-sovereign',
      type: 'now_alert',
      title: '⚡ NickOS Work Notification',
      body: 'Desktop work notifications are fully operational! You will be alerted when focus blocks start.',
      priority: 'high' as const,
      scheduledFor: new Date().toISOString(),
      status: 'delivered' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: { deepLink: '#/now' },
    };
    NotificationService.surfaceBrowserNotification(testNotice);
    triggerInAppAlert({
      title: testNotice.title,
      body: testNotice.body,
      type: testNotice.type,
      priority: testNotice.priority,
      metadata: testNotice.metadata,
    });
  };

  // Active Desktop Work Notification Scheduler (Tick every 20s)
  const notifiedAlertKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const intervalId = setInterval(() => {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const todayStr = getTodayString();

      // Evaluate today's scheduled blocks
      const blocksToCheck = todayTimeBlocks.length > 0 ? todayTimeBlocks : (selectedPlannerDate === today ? timeBlocks : []);

      blocksToCheck.forEach(tb => {
        if (tb.status === 'completed' || tb.status === 'skipped') return;

        const startMins = timeToMinutes(tb.startTime);
        const leadDiff = startMins - currentMins;

        // 1. Upcoming block reminder (10 minutes before)
        if (leadDiff === 10) {
          const key = `lead_${tb.id}_${todayStr}`;
          if (!notifiedAlertKeysRef.current.has(key)) {
            notifiedAlertKeysRef.current.add(key);
            const notice = {
              id: generateId('notif'),
              userId: 'nick-sovereign',
              type: 'now_alert',
              title: `Upcoming: ${tb.title}`,
              body: `Starts in 10 minutes (${tb.startTime}). Wrap up and prepare focus.`,
              priority: 'normal' as const,
              scheduledFor: now.toISOString(),
              status: 'delivered' as const,
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
              metadata: { deepLink: '#/now' },
            };
            NotificationService.surfaceBrowserNotification(notice);
            triggerInAppAlert({
              title: notice.title,
              body: notice.body,
              type: notice.type,
              priority: notice.priority,
              metadata: notice.metadata,
            });
          }
        }

        // 2. Starting right now
        if (startMins === currentMins) {
          const key = `start_${tb.id}_${todayStr}`;
          if (!notifiedAlertKeysRef.current.has(key)) {
            notifiedAlertKeysRef.current.add(key);
            const notice = {
              id: generateId('notif'),
              userId: 'nick-sovereign',
              type: 'now_alert',
              title: `⚡ Focus Block Starting Now!`,
              body: `Time for: "${tb.title}" (${tb.startTime} - ${tb.endTime}). Click to open focus session.`,
              priority: 'high' as const,
              scheduledFor: now.toISOString(),
              status: 'delivered' as const,
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
              metadata: { deepLink: '#/now' },
            };
            NotificationService.surfaceBrowserNotification(notice);
            triggerInAppAlert({
              title: notice.title,
              body: notice.body,
              type: notice.type,
              priority: notice.priority,
              metadata: notice.metadata,
            });
          }
        }
      });

      // 3. Evening Review reminder at 21:00
      if (currentMins === 21 * 60) {
        const reviewKey = `review_${todayStr}`;
        if (!notifiedAlertKeysRef.current.has(reviewKey)) {
          notifiedAlertKeysRef.current.add(reviewKey);
          const notice = {
            id: generateId('notif'),
            userId: 'nick-sovereign',
            type: 'accountability_review',
            title: `📋 Evening Accountability Review`,
            body: `Time to audit today's commitments, score your execution, and sequence tomorrow's plan.`,
            priority: 'high' as const,
            scheduledFor: now.toISOString(),
            status: 'delivered' as const,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            metadata: { deepLink: '#/accountability' },
          };
          NotificationService.surfaceBrowserNotification(notice);
          triggerInAppAlert({
            title: notice.title,
            body: notice.body,
            type: notice.type,
            priority: notice.priority,
            metadata: notice.metadata,
          });
        }
      }
    }, 20000);

    return () => clearInterval(intervalId);
  }, [todayTimeBlocks, timeBlocks, selectedPlannerDate, today]);

  const activeTask = tasks.find(t => t.id === activeFocusTaskId) || null;

  // ============================================================================
  // FOCUS SESSION MANAGEMENT (WIRED TO EXECUTION SERVICE)
  // ============================================================================
  const startFocusSession = async (taskId: string, timeBlockId?: string) => {
    if (!taskId) return;
    setActiveFocusTaskId(taskId);
    if (timeBlockId) setActiveTimeBlockId(timeBlockId);
    setIsTimerRunning(true);

    try {
      const { session } = await executionService.startSession({
        taskId,
        timeBlockId,
        // Supabase RLS requires the real authenticated auth.users UUID.
        // Local/demo mode deliberately leaves this undefined so the repository
        // does not attempt to persist a fake local identity to Supabase.
        userId: authMode === 'supabase' ? authUser?.id : undefined,
      });

      setActiveExecutionSession(session);
      const computedSeconds = executionService.calculateSessionActiveSeconds(session);
      setTimerElapsedSeconds(computedSeconds);
      
      // Auto-speak task transition announcement
      const targetTask = tasks.find(t => t.id === taskId);
      const targetBlock = timeBlocks.find(b => b.id === timeBlockId || b.taskId === taskId);
      if (targetTask) {
        let duration = 45;
        if (targetBlock) {
          try {
            const [sh, sm] = targetBlock.startTime.split(':').map(Number);
            const [eh, em] = targetBlock.endTime.split(':').map(Number);
            duration = (eh * 60 + em) - (sh * 60 + sm);
          } catch {
            duration = 45;
          }
        }
        VoiceService.announceTaskTransition(
          taskId,
          targetTask.title,
          duration,
          targetTask.description || targetTask.notes || undefined,
          targetTask.priority
        );
      }

      await refreshData();
    } catch (err) {
      console.error('Error starting focus session:', err);
    }
  };

  const pauseFocusSession = async (reason?: string, category?: SessionPause['category']) => {
    setIsTimerRunning(false);
    if (!activeExecutionSession) return;

    try {
      const updated = await executionService.pauseSession({
        sessionId: activeExecutionSession.id,
        reason: reason || 'Focus paused',
        category: category || 'distraction',
      });
      setActiveExecutionSession(updated);
      setTimerElapsedSeconds(updated.durationSeconds);
      await refreshData();
    } catch (err) {
      console.error('Failed to log pause session:', err);
    }
  };

  const resumeFocusSession = async () => {
    if (!activeExecutionSession) {
      if (activeFocusTaskId) {
        await startFocusSession(activeFocusTaskId, activeTimeBlockId || undefined);
      }
      return;
    }

    try {
      const updated = await executionService.resumeSession(activeExecutionSession.id);
      setActiveExecutionSession(updated);
      setIsTimerRunning(true);
      
      // Trigger Vocal Vault / TTS break ending reminder
      VoiceService.triggerStateAlert(
        'break_ending',
        "Fin de la pause Nick. C'est l'heure de se remettre au travail et de rester concentré !"
      );

      await refreshData();
    } catch (err) {
      console.error('Failed to resume focus session:', err);
    }
  };

  const stopFocusSession = async () => {
    setIsTimerRunning(false);
    if (activeExecutionSession) {
      try {
        await executionService.pauseSession({
          sessionId: activeExecutionSession.id,
          reason: 'Manual session stop',
          category: 'other',
        });
      } catch (err) {
        console.error('Failed to stop session:', err);
      }
    }
    setTimerElapsedSeconds(0);
    setActiveExecutionSession(null);
    await refreshData();
  };

  const completeActiveTask = async (notes?: string) => {
    if (!activeFocusTaskId) return;
    setIsTimerRunning(false);

    try {
      if (activeExecutionSession) {
        await executionService.completeSession({
          sessionId: activeExecutionSession.id,
          notes,
        });
      } else {
        // Fallback transition if no active session object exists
        const addedMinutes = Math.max(1, Math.round(timerElapsedSeconds / 60));
        await executionService.addActualExecutionTime(activeFocusTaskId, addedMinutes);
        await executionService.transitionTaskStatus(activeFocusTaskId, 'completed');
      }

      setTimerElapsedSeconds(0);
      setActiveExecutionSession(null);
      setActiveTimeBlockId(null);

      // Trigger gamification
      recordTaskCompletion();
      playSuccessChime();

      // Trigger dynamic celebration clip
      VoiceService.triggerStateAlert(
        'task_completed',
        "Félicitations Nick, tâche terminée avec succès ! Excellent travail."
      );

      // Auto-pick next planned task for today
      const nextTask = tasks.find(
        t => t.id !== activeFocusTaskId && (t.status === 'planned' || t.status === 'todo')
      );
      setActiveFocusTaskId(nextTask ? nextTask.id : null);

      await refreshData();
    } catch (err) {
      console.error('Error completing active task:', err);
    }
  };

  const abandonOrPostponeTask = async (taskId: string, reason: string, targetDate?: string) => {
    setIsTimerRunning(false);

    try {
      if (activeExecutionSession && activeExecutionSession.taskId === taskId) {
        await executionService.abandonSession({
          sessionId: activeExecutionSession.id,
          reason,
          action: targetDate ? 'postpone' : 'abandon',
          targetDate,
        });
      } else {
        await executionService.postponeTask(taskId, targetDate);
      }

      setTimerElapsedSeconds(0);
      setActiveExecutionSession(null);
      setActiveFocusTaskId(null);
      setActiveTimeBlockId(null);

      await refreshData();
    } catch (err) {
      console.error('Error postponing task from focus session:', err);
    }
  };

  const recordManualCheckIn = async (type: SessionCheckIn['type'], note?: string) => {
    if (!activeExecutionSession) return;
    try {
      const updated = await executionService.recordCheckIn({
        sessionId: activeExecutionSession.id,
        type,
        note,
      });
      setActiveExecutionSession(updated);
      if (type === 'distracted' || type === 'break') {
        setIsTimerRunning(false);
      }
      await refreshData();
    } catch (err) {
      console.error('Failed to record check-in:', err);
    }
  };

  const recordHeartbeat = async () => {
    if (!activeExecutionSession) return;
    try {
      const updated = await executionService.recordHeartbeat(activeExecutionSession.id);
      if (updated) setActiveExecutionSession(updated);
    } catch (err) {
      console.warn('Manual heartbeat error:', err);
    }
  };

  // ============================================================================
  // TIME BLOCK ACTIONS
  // ============================================================================
  const createTimeBlock = async (blockData: Omit<TimeBlock, 'id' | 'createdAt' | 'updatedAt'>) => {
    const targetPlanId = blockData.dailyPlanId || currentPlannerPlan?.id || `plan-${selectedPlannerDate || today}`;
    const newBlock = await repo.createTimeBlock({
      ...blockData,
      dailyPlanId: targetPlanId,
    });
    await refreshData();
    return newBlock;
  };

  const updateTimeBlock = async (id: string, updates: Partial<TimeBlock>) => {
    const updated = await repo.updateTimeBlock(id, updates);
    await refreshData();
    return updated;
  };

  const deleteTimeBlock = async (id: string) => {
    await repo.deleteTimeBlock(id);
    await refreshData();
  };

  const shiftTimeBlock = async (id: string, newStartTime: string, newEndTime: string) => {
    const updated = await repo.updateTimeBlock(id, {
      startTime: newStartTime,
      endTime: newEndTime,
    });
    await refreshData();
    return updated;
  };

  // ============================================================================
  // ANTI-DISPERSION / INBOX ACTIONS
  // ============================================================================
  const quickCaptureThought = async (title: string, description?: string) => {
    const item = await repo.createInboxItem({
      title,
      description,
      source: 'now_cockpit',
      status: 'captured',
    });
    await refreshData();
    return item;
  };

  const deleteInboxItem = async (id: string) => {
    await repo.deleteInboxItem(id);
    await refreshData();
  };

  // ============================================================================
  // TASK ACTIONS
  // ============================================================================
  const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask = await repo.createTask(taskData);
    await refreshData();
    return newTask;
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const updated = await repo.updateTask(taskId, updates);
    await refreshData();
    return updated;
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    await executionService.transitionTaskStatus(taskId, status);
    await refreshData();
  };

  const postponeTask = async (taskId: string, targetDate?: string) => {
    await executionService.postponeTask(taskId, targetDate);
    await refreshData();
  };

  const toggleChecklistItem = async (taskId: string, checkId: string) => {
    await executionService.toggleChecklistItem(taskId, checkId);
    await refreshData();
  };

  const deleteTask = async (taskId: string) => {
    await repo.deleteTask(taskId);
    if (activeFocusTaskId === taskId) {
      setActiveFocusTaskId(null);
      setIsTimerRunning(false);
    }
    await refreshData();
  };

  // ============================================================================
  // GOAL ACTIONS
  // ============================================================================
  const createGoal = async (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newGoal = await repo.createGoal(goalData);
    await refreshData();
    return newGoal;
  };

  const updateGoal = async (goalId: string, updates: Partial<Goal>) => {
    const updated = await repo.updateGoal(goalId, updates);
    await refreshData();
    return updated;
  };

  const deleteGoal = async (goalId: string) => {
    await repo.deleteGoal(goalId);
    await refreshData();
  };

  // ============================================================================
  // PROJECT ACTIONS
  // ============================================================================
  const createProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'taskCount' | 'completedTaskCount'>) => {
    const newProject = await repo.createProject(projectData);
    await refreshData();
    return newProject;
  };

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    const updated = await repo.updateProject(projectId, updates);
    await refreshData();
    return updated;
  };

  const deleteProject = async (projectId: string) => {
    await repo.deleteProject(projectId);
    await refreshData();
  };

  // ============================================================================
  // COMMITMENTS & DAILY PLANNING
  // ============================================================================
  const approveCommitment = async (commitmentId: string, approved: boolean) => {
    await repo.updateCommitment(commitmentId, {
      status: approved ? 'confirmed' : 'pending',
      isApprovedByNick: approved,
      approvedAt: approved ? new Date().toISOString() : undefined,
    });
    await refreshData();
  };

  const commitDayPlan = async (params: {
    date?: string;
    focusGoalToday: string;
    plannedTaskIds: string[];
    energyTarget: 'maximum' | 'steady' | 'recovery';
    notes?: string;
  }): Promise<DayPlan> => {
    const targetDate = params.date || selectedPlannerDate || today;
    const existingPlan = targetDate === today ? todayPlan : (targetDate === selectedPlannerDate ? currentPlannerPlan : await repo.getDayPlan(targetDate).catch(() => null));
    const planId = existingPlan?.id || `plan-${targetDate}`;
    const savedPlan = await repo.saveDayPlan({
      id: planId,
      date: targetDate,
      focusGoalToday: params.focusGoalToday,
      plannedTaskIds: params.plannedTaskIds,
      energyTarget: params.energyTarget,
      notes: params.notes,
      status: targetDate === today ? 'active' : 'confirmed',
      approvedByUser: true,
      confirmedByNick: true,
      confirmedAt: new Date().toISOString(),
      generatedByAi: false,
      totalPlannedMinutes: params.plannedTaskIds.reduce((acc, tid) => {
        const t = tasks.find(task => task.id === tid);
        return acc + (t?.estimatedMinutes || 30);
      }, 0),
      totalActualMinutes: existingPlan?.totalActualMinutes || 0,
    });

    // Update tasks to planned and scheduled for targetDate
    for (const tid of params.plannedTaskIds) {
      await repo.updateTask(tid, {
        scheduledDate: targetDate,
        status: 'planned',
      });
    }

    await refreshData();
    return savedPlan;
  };

  const commitTodayPlan = async (params: {
    focusGoalToday: string;
    plannedTaskIds: string[];
    energyTarget: 'maximum' | 'steady' | 'recovery';
    notes?: string;
  }) => {
    await commitDayPlan({ ...params, date: today });
  };

  // ============================================================================
  // ACCOUNTABILITY ACTIONS
  // ============================================================================
  const loadAccountabilityForDate = async (date: string): Promise<DailyAccountabilityRecord> => {
    setSelectedAccountabilityDate(date);
    const targetPlan = await repo.getDayPlan(date);
    const rec = await accountabilityService.generateOrLoadDailyRecord(
      date,
      tasks,
      targetPlan,
      executionHistory,
      projects,
      goals
    );
    setAccountabilityRecord(rec);
    return rec;
  };

  const reconcileCommitment = async (
    taskId: string,
    updates: Partial<ReconciledCommitment>,
    date?: string
  ) => {
    const targetDate = date || selectedAccountabilityDate || today;
    const updated = await accountabilityService.reconcileCommitment(targetDate, taskId, updates);
    setAccountabilityRecord(updated);
    // Also if status was changed to completed, update the task
    if (updates.classification === 'completed') {
      await repo.updateTask(taskId, { status: 'completed' });
    } else if (updates.classification === 'postponed') {
      await repo.updateTask(taskId, { status: 'postponed', postponeReason: updates.reasonDetails });
    } else if (updates.classification === 'abandoned') {
      await repo.updateTask(taskId, { status: 'abandoned', abandonReason: updates.reasonDetails });
    } else if (updates.classification === 'blocked') {
      await repo.updateTask(taskId, { status: 'blocked' });
    }
    await refreshData();
  };

  const recordExternalBlocker = async (
    blocker: Omit<ExternalBlockerRecord, 'id' | 'loggedAt'>,
    date?: string
  ) => {
    const targetDate = date || selectedAccountabilityDate || today;
    const updated = await accountabilityService.recordExternalBlocker(targetDate, blocker);
    setAccountabilityRecord(updated);
    await refreshData();
  };

  const deleteExternalBlocker = async (blockerId: string, date?: string) => {
    const targetDate = date || selectedAccountabilityDate || today;
    const updated = await accountabilityService.deleteExternalBlocker(targetDate, blockerId);
    setAccountabilityRecord(updated);
    await refreshData();
  };

  const addConcreteOutput = async (output: string, date?: string) => {
    const targetDate = date || selectedAccountabilityDate || today;
    const updated = await accountabilityService.addConcreteOutput(targetDate, output);
    setAccountabilityRecord(updated);
    await refreshData();
  };

  const removeConcreteOutput = async (index: number, date?: string) => {
    const targetDate = date || selectedAccountabilityDate || today;
    const updated = await accountabilityService.removeConcreteOutput(targetDate, index);
    setAccountabilityRecord(updated);
    await refreshData();
  };

  const updateDailyNotes = async (notes: string, date?: string) => {
    const targetDate = date || selectedAccountabilityDate || today;
    const updated = await accountabilityService.updateNotes(targetDate, notes);
    setAccountabilityRecord(updated);
  };

  const finalizeDay = async (notes?: string, date?: string) => {
    const targetDate = date || selectedAccountabilityDate || today;
    const finalized = await accountabilityService.finalizeDay(targetDate, notes);
    setAccountabilityRecord(finalized);
    await refreshData();
  };

  const reopenDay = async (date?: string) => {
    const targetDate = date || selectedAccountabilityDate || today;
    const reopened = await accountabilityService.reopenDay(targetDate);
    setAccountabilityRecord(reopened);
    await refreshData();
  };

  const getWeeklyAggregate = (startDate: string, endDate: string): WeeklyAccountabilityAggregate => {
    return accountabilityService.computeWeeklyAggregate(
      accountabilityRecords,
      startDate,
      endDate,
      projects,
      goals
    );
  };

  // ============================================================================
  // MODAL CONTROLS
  // ============================================================================
  const openCreateTaskModal = (initialValues?: Partial<Task>) => {
    setEditingTask(null);
    setTaskModalDefaults(initialValues || null);
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setTaskModalDefaults(null);
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
    setTaskModalDefaults(null);
  };

  const openCreateGoalModal = (initialValues?: Partial<Goal>) => {
    setEditingGoal(null);
    setGoalModalDefaults(initialValues || null);
    setIsGoalModalOpen(true);
  };

  const openEditGoalModal = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalModalDefaults(null);
    setIsGoalModalOpen(true);
  };

  const closeGoalModal = () => {
    setIsGoalModalOpen(false);
    setEditingGoal(null);
    setGoalModalDefaults(null);
  };

  const openCreateProjectModal = (initialValues?: Partial<Project>) => {
    setEditingProject(null);
    setProjectModalDefaults(initialValues || null);
    setIsProjectModalOpen(true);
  };

  const openEditProjectModal = (project: Project) => {
    setEditingProject(project);
    setProjectModalDefaults(null);
    setIsProjectModalOpen(true);
  };

  const closeProjectModal = () => {
    setIsProjectModalOpen(false);
    setEditingProject(null);
    setProjectModalDefaults(null);
  };

  const openCreateTimeBlockModal = (initialValues?: Partial<TimeBlock>) => {
    setEditingTimeBlock(null);
    setTimeBlockModalDefaults(initialValues || null);
    setIsTimeBlockModalOpen(true);
  };

  const openEditTimeBlockModal = (block: TimeBlock) => {
    setEditingTimeBlock(block);
    setTimeBlockModalDefaults(null);
    setIsTimeBlockModalOpen(true);
  };

  const closeTimeBlockModal = () => {
    setIsTimeBlockModalOpen(false);
    setEditingTimeBlock(null);
    setTimeBlockModalDefaults(null);
  };

  // AI Brain Methods
  const loadAiProposals = useCallback(async () => {
    try {
      const loaded = await repo.getAiProposals();
      setAiProposals(loaded);
    } catch (err) {
      console.error('Failed to load AI proposals:', err);
    }
  }, [repo]);

  const createAiProposal = useCallback(async (proposalData: Omit<AiProposal, 'id' | 'createdAt'>) => {
    const created = await repo.createAiProposal(proposalData);
    await loadAiProposals();
    return created;
  }, [repo, loadAiProposals]);

  const updateAiProposalStatus = useCallback(async (id: string, status: AiProposalStatus) => {
    await repo.updateAiProposal(id, { status });
    await loadAiProposals();
  }, [repo, loadAiProposals]);

  const buildCompactContext = useCallback(() => {
    return {
      user: userProfile ? {
        workingHoursStart: userProfile.workingHoursStart,
        workingHoursEnd: userProfile.workingHoursEnd,
        timezone: userProfile.timezone,
        strictAccountabilityMode: userProfile.strictAccountabilityMode,
      } : null,
      goals: goals.filter(g => g.status === 'active' || g.status === 'on_track' || g.status === 'behind').map(g => ({
        id: g.id,
        title: g.title,
        horizon: g.horizon,
        category: g.category,
        status: g.status,
      })),
      projects: projects.filter(p => p.status === 'active' || p.status === 'planning').map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        priority: p.priority,
        status: p.status,
      })),
      tasks: tasks.filter(t => t.status === 'todo' || t.status === 'planned' || t.status === 'in_progress').map(t => ({
        id: t.id,
        title: t.title,
        projectId: t.projectId,
        goalId: t.goalId,
        priority: t.priority,
        commitmentLevel: t.commitmentLevel,
        estimatedMinutes: t.estimatedMinutes,
        status: t.status,
        postponeCount: t.postponeCount || 0,
      })),
      today: {
        date: today,
        plan: todayPlan ? {
          status: todayPlan.status,
          energyTarget: todayPlan.energyTarget,
          focusGoalToday: todayPlan.focusGoalToday,
        } : null,
        timeBlocks: timeBlocks.map(tb => ({
          title: tb.title,
          blockType: tb.blockType,
          startTime: tb.startTime,
          endTime: tb.endTime,
          status: tb.status,
          taskId: tb.taskId,
        })),
        calendar_constraints: (() => {
          try {
            const cachedEvents = localStorage.getItem('nick_os_google_calendar_events');
            const events = cachedEvents ? JSON.parse(cachedEvents) : [];
            return events.map((ev: any) => ({
              summary: ev.summary,
              start: ev.start?.dateTime || ev.start?.date,
              end: ev.end?.dateTime || ev.end?.date,
              type: ev.eventType || 'fixed_event',
            }));
          } catch {
            return [];
          }
        })(),
        external_google_tasks: (() => {
          try {
            const cachedTasks = localStorage.getItem('nick_os_google_tasks_cached_items');
            const tasks = cachedTasks ? JSON.parse(cachedTasks) : [];
            return tasks.map((t: any) => ({
              title: t.title,
              status: t.status,
              notes: t.notes,
            }));
          } catch {
            return [];
          }
        })(),
        focus_analytics: (() => {
          try {
            const interruptions = JSON.parse(localStorage.getItem('nick_os_focus_interruptions') || '[]');
            const visibility = JSON.parse(localStorage.getItem('nick_os_focus_visibility_events') || '[]');
            return {
              total_interruptions: interruptions.length,
              recent_interruptions: interruptions.slice(0, 5).map((i: any) => ({
                category: i.category,
                reason: i.reason,
                timestamp: i.timestamp,
              })),
              total_unobservable_periods: visibility.length,
            };
          } catch {
            return { total_interruptions: 0, recent_interruptions: [], total_unobservable_periods: 0 };
          }
        })(),
      },
      accountability_history: accountabilityRecords.slice(0, 3).map(r => ({
        date: r.date,
        executionRate: r.executionRate,
        timeExecutionRatio: r.timeExecutionRatio,
        notes: r.notes,
      })),
      behaviorProfile: behaviorProfile ? {
        estimation_bias: behaviorProfile.estimation_bias,
        average_session_duration: behaviorProfile.average_session_duration,
        common_blockers: behaviorProfile.common_blockers,
        postponement_patterns: behaviorProfile.postponement_patterns,
        execution_by_time_period: behaviorProfile.execution_by_time_period,
        project_distribution: behaviorProfile.project_distribution,
        context_switch_rate: behaviorProfile.context_switch_rate,
        daily_capacity_ratio: behaviorProfile.daily_capacity_ratio,
      } : null,
    };
  }, [userProfile, goals, projects, tasks, today, todayPlan, timeBlocks, accountabilityRecords, behaviorProfile]);

  // Dynamic Register of Voice Commands bound to contextual state closures
  useEffect(() => {
    // Helper to calculate time block duration in minutes
    const calculateBlockDuration = (start: string, end: string): number => {
      try {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        return (eh * 60 + em) - (sh * 60 + sm);
      } catch {
        return 45;
      }
    };

    // 1. WHATS_NEXT
    VoiceCommandService.registerHandler('WHATS_NEXT', () => {
      setActiveTab('now');
      if (activeFocusTaskId) {
        const tTask = tasks.find(t => t.id === activeFocusTaskId);
        if (tTask) {
          const tBlock = timeBlocks.find(b => b.taskId === tTask.id);
          const minutesLeft = tBlock ? calculateBlockDuration(tBlock.startTime, tBlock.endTime) : 45;
          return `Nick, your active task is: ${tTask.title}. Expected duration is ${minutesLeft} minutes.`;
        }
      }
      const nextBlock = timeBlocks.find(b => b.status === 'planned' || b.status === 'scheduled');
      if (nextBlock) {
        const nextT = tasks.find(t => t.id === nextBlock.taskId);
        return `You have no active task running, Nick. Next scheduled task is: ${nextT ? nextT.title : nextBlock.title} starting at ${nextBlock.startTime}.`;
      }
      return "You have no active task or upcoming scheduled blocks for today, Nick.";
    });

    // 2. START_ACTIVE_TASK
    VoiceCommandService.registerHandler('START_ACTIVE_TASK', async (params) => {
      const query = params?.taskQuery;
      if (query) {
        const found = tasks.find(t => t.title.toLowerCase().includes(query.toLowerCase()) && t.status !== 'completed');
        if (found) {
          await startFocusSession(found.id);
          return `Starting focus session on: ${found.title}.`;
        }
        return `Task matching "${query}" was not found or is already completed.`;
      }
      
      if (activeFocusTaskId) {
        await startFocusSession(activeFocusTaskId);
        const t = tasks.find(t => t.id === activeFocusTaskId);
        return `Starting focus task: ${t ? t.title : 'active task'}.`;
      }
      return "No active task available to start. Specify a task title, or check today's schedule.";
    });

    // 3. PAUSE_ACTIVE_SESSION
    VoiceCommandService.registerHandler('PAUSE_ACTIVE_SESSION', async () => {
      if (isTimerRunning) {
        await pauseFocusSession('Voice command pause', 'break');
        return "Focus session paused. Take a quick break.";
      }
      return "Focus timer is already paused or not running.";
    });

    // 4. RESUME_ACTIVE_SESSION
    VoiceCommandService.registerHandler('RESUME_ACTIVE_SESSION', async () => {
      if (!isTimerRunning) {
        await resumeFocusSession();
        return "Resuming focus session. Back to execution mode.";
      }
      return "Focus session is already active and running.";
    });

    // 5. COMPLETE_ACTIVE_TASK
    VoiceCommandService.registerHandler('COMPLETE_ACTIVE_TASK', async () => {
      if (activeFocusTaskId) {
        const t = tasks.find(t => t.id === activeFocusTaskId);
        await completeActiveTask();
        return `Excellent work, Nick! Completed: ${t ? t.title : 'focus task'}. Moving to next.`;
      }
      return "No active focus session running to complete.";
    });

    // 6. REPLAN_DAY
    VoiceCommandService.registerHandler('REPLAN_DAY', () => {
      setActiveTab('ai');
      setIsPlanDayModalOpen(true);
      return "Redirecting to your AI Brain Replan engine.";
    });

    // 7. REPORT_BLOCKER
    VoiceCommandService.registerHandler('REPORT_BLOCKER', async (params) => {
      const reason = params?.blockerReason || 'Voice logged blocker';
      await recordExternalBlocker({
        description: reason,
        category: 'other',
        severity: 'major_delay'
      });
      return `External blocker captured: "${reason}". Your accountability parameters have been adjusted.`;
    });

    // 8. QUICK_CAPTURE
    VoiceCommandService.registerHandler('QUICK_CAPTURE', async (params) => {
      const content = params?.captureContent;
      if (!content) {
        return "Please specify what you would like to capture.";
      }
      await quickCaptureThought(content);
      return `Idea captured in your inbox: ${content}.`;
    });

    // 9. WHATS_MY_PLAN
    VoiceCommandService.registerHandler('WHATS_MY_PLAN', () => {
      setActiveTab('today');
      if (timeBlocks.length === 0) {
        return "You have no time blocks scheduled for today, Nick. Would you like to replan?";
      }
      const sorted = [...timeBlocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
      const summaryList = sorted.map(b => {
        const t = tasks.find(t => t.id === b.taskId);
        const dur = calculateBlockDuration(b.startTime, b.endTime);
        return `${b.startTime}: ${t ? t.title : b.title} for ${dur} minutes`;
      }).join(', and ');
      return `Nick, today's focus commitments are: ${summaryList}.`;
    });
  }, [
    tasks,
    activeFocusTaskId,
    timeBlocks,
    isTimerRunning,
    startFocusSession,
    pauseFocusSession,
    resumeFocusSession,
    completeActiveTask,
    recordExternalBlocker,
    quickCaptureThought,
    setIsPlanDayModalOpen,
    setActiveTab
  ]);

  return (
    <ExecutionContext.Provider
      value={{
        activeTab,
        setActiveTab,
        lifeAreas,
        tasks,
        projects,
        goals,
        commitments,
        timeBlocks,
        inboxItems,
        todayPlan,
        metrics,
        userProfile,
        activeExecutionSession,
        executionHistory,
        accountabilityRecord,
        accountabilityRecords,
        selectedAccountabilityDate,
        setSelectedAccountabilityDate,
        loadAccountabilityForDate,
        reconcileCommitment,
        recordExternalBlocker,
        deleteExternalBlocker,
        addConcreteOutput,
        removeConcreteOutput,
        updateDailyNotes,
        finalizeDay,
        reopenDay,
        getWeeklyAggregate,
        isLoading,
        error,
        storageMode,
        activeFocusTaskId,
        activeTask,
        activeTimeBlockId,
        isTimerRunning,
        timerElapsedSeconds,
        startFocusSession,
        pauseFocusSession,
        resumeFocusSession,
        stopFocusSession,
        completeActiveTask,
        abandonOrPostponeTask,
        recordManualCheckIn,
        recordHeartbeat,
        refreshData,
        createTask,
        updateTask,
        updateTaskStatus,
        postponeTask,
        toggleChecklistItem,
        deleteTask,
        createGoal,
        updateGoal,
        deleteGoal,
        createProject,
        updateProject,
        deleteProject,
        createTimeBlock,
        updateTimeBlock,
        deleteTimeBlock,
        shiftTimeBlock,
        quickCaptureThought,
        deleteInboxItem,
        approveCommitment,
        selectedPlannerDate,
        setSelectedPlannerDate,
        currentPlannerPlan,
        todayTimeBlocks,
        commitDayPlan,
        commitTodayPlan,
        desktopPermission,
        requestDesktopPermission,
        sendTestDesktopAlert,
        activeInAppAlert,
        triggerInAppAlert,
        dismissInAppAlert,
        isTaskModalOpen,
        taskModalDefaults,
        editingTask,
        openCreateTaskModal,
        openEditTaskModal,
        closeTaskModal,
        isCreateTaskModalOpen: isTaskModalOpen,
        setIsCreateTaskModalOpen: setIsTaskModalOpen,
        isGoalModalOpen,
        goalModalDefaults,
        editingGoal,
        openCreateGoalModal,
        openEditGoalModal,
        closeGoalModal,
        isProjectModalOpen,
        projectModalDefaults,
        editingProject,
        openCreateProjectModal,
        openEditProjectModal,
        closeProjectModal,
        isTimeBlockModalOpen,
        timeBlockModalDefaults,
        editingTimeBlock,
        openCreateTimeBlockModal,
        openEditTimeBlockModal,
        closeTimeBlockModal,
        isQuickCaptureOpen,
        setIsQuickCaptureOpen,
        isPlanDayModalOpen,
        setIsPlanDayModalOpen,
        isSupabaseModalOpen,
        setIsSupabaseModalOpen,

        // Adaptive learning & Insights
        behaviorMetrics,
        behaviorProfile,
        transparencyInsights,

        // AI Brain state and methods
        aiProposals,
        loadAiProposals,
        createAiProposal,
        updateAiProposalStatus,
        buildCompactContext,

        // Focus Guard state and methods
        focusGuardSettings,
        updateFocusGuardSettings: handleUpdateFocusGuardSettings,
        focusGuardAgents,
        refreshFocusGuardAgents: handleRefreshFocusGuardAgents,
      }}
    >
      {children}
    </ExecutionContext.Provider>
  );
};

export function useExecution() {
  const context = useContext(ExecutionContext);
  if (!context) {
    throw new Error('useExecution must be used within an ExecutionProvider');
  }
  return context;
}
