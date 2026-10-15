import {
  Task,
  LifeArea,
  Project,
  Goal,
  Commitment,
  DayPlan,
  TimeBlock,
  ExecutionSession,
  InboxItem,
  DailyAccountabilityRecord,
  ExecutionMetrics,
  UserProfile,
  InboxItemStatus,
  AiProposal,
} from './domain';
import { FocusGuardSettings, FocusGuardAgentHeartbeat } from './focus';

export interface FilterOptions {
  status?: string;
  priority?: string;
  projectId?: string;
  goalId?: string;
  lifeAreaId?: string;
  date?: string;
  searchQuery?: string;
}

export interface IExecutionRepository {
  // 1. Life Areas
  getLifeAreas(): Promise<LifeArea[]>;
  getLifeAreaById(id: string): Promise<LifeArea | null>;
  createLifeArea(lifeArea: Omit<LifeArea, 'id' | 'createdAt' | 'updatedAt'>): Promise<LifeArea>;
  updateLifeArea(id: string, updates: Partial<LifeArea>): Promise<LifeArea>;
  deleteLifeArea(id: string): Promise<boolean>;

  // 2. Goals
  getGoals(lifeAreaId?: string): Promise<Goal[]>;
  getGoalById(id: string): Promise<Goal | null>;
  createGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal>;
  updateGoal(id: string, updates: Partial<Goal>): Promise<Goal>;
  deleteGoal(id: string): Promise<boolean>;

  // 3. Projects
  getProjects(goalId?: string): Promise<Project[]>;
  getProjectById(id: string): Promise<Project | null>;
  createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'taskCount' | 'completedTaskCount'>): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<boolean>;

  // 4. Tasks
  getTasks(filters?: FilterOptions): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | null>;
  createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<boolean>;

  // 5. Daily Plans
  getDayPlan(date: string): Promise<DayPlan | null>;
  saveDayPlan(plan: Omit<DayPlan, 'id'> & { id?: string }): Promise<DayPlan>;

  // 6. Time Blocks
  getTimeBlocks(dailyPlanId: string): Promise<TimeBlock[]>;
  createTimeBlock(block: Omit<TimeBlock, 'id' | 'createdAt' | 'updatedAt'>): Promise<TimeBlock>;
  updateTimeBlock(id: string, updates: Partial<TimeBlock>): Promise<TimeBlock>;
  deleteTimeBlock(id: string): Promise<boolean>;

  // 7. Execution Sessions
  getExecutionSessions(filters?: { taskId?: string; date?: string; status?: string }): Promise<ExecutionSession[]>;
  getSessionById(id: string): Promise<ExecutionSession | null>;
  getActiveSession(): Promise<ExecutionSession | null>;
  createExecutionSession(session: Omit<ExecutionSession, 'id' | 'createdAt'>): Promise<ExecutionSession>;
  updateExecutionSession(id: string, updates: Partial<ExecutionSession>): Promise<ExecutionSession>;
  deleteExecutionSession(id: string): Promise<boolean>;

  // 8. Inbox & Distractions
  getInboxItems(status?: InboxItemStatus): Promise<InboxItem[]>;
  createInboxItem(item: Omit<InboxItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InboxItem>;
  updateInboxItem(id: string, updates: Partial<InboxItem>): Promise<InboxItem>;
  convertInboxItemToTask(inboxItemId: string, taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  deleteInboxItem(id: string): Promise<boolean>;

  // 9. Daily Accountability Records
  getAccountabilityRecord(date: string): Promise<DailyAccountabilityRecord | null>;
  getAccountabilityRecords(range?: { startDate?: string; endDate?: string }): Promise<DailyAccountabilityRecord[]>;
  saveAccountabilityRecord(record: Omit<DailyAccountabilityRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<DailyAccountabilityRecord>;
  finalizeAccountabilityRecord(date: string, recordUpdates: Partial<DailyAccountabilityRecord>): Promise<DailyAccountabilityRecord>;
  reopenAccountabilityRecord(date: string): Promise<DailyAccountabilityRecord>;

  // 10. Commitments
  getCommitments(date?: string): Promise<Commitment[]>;
  createCommitment(commitment: Omit<Commitment, 'id'>): Promise<Commitment>;
  updateCommitment(id: string, updates: Partial<Commitment>): Promise<Commitment>;
  deleteCommitment(id: string): Promise<boolean>;

  // User Profile & Settings
  getUserProfile(): Promise<UserProfile>;
  updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile>;

  // Execution Metrics
  getExecutionMetrics(date: string): Promise<ExecutionMetrics>;

  // 11. AI Proposals
  getAiProposals(): Promise<AiProposal[]>;
  createAiProposal(proposal: Omit<AiProposal, 'id' | 'createdAt'>): Promise<AiProposal>;
  updateAiProposal(id: string, updates: Partial<AiProposal>): Promise<AiProposal>;

  // 12. Focus Guard Settings & Agent Heartbeats
  getFocusGuardSettings(): Promise<FocusGuardSettings>;
  saveFocusGuardSettings(settings: Partial<FocusGuardSettings>): Promise<FocusGuardSettings>;
  recordAgentHeartbeat(heartbeat: FocusGuardAgentHeartbeat): Promise<FocusGuardAgentHeartbeat>;
  getAgentHeartbeats(): Promise<FocusGuardAgentHeartbeat[]>;
}
