// ==============================================================================
// NICK OS — DOMAIN MODELS & TYPES
// Strictly modeled around Nick's non-negotiable execution operating system.
// ==============================================================================

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type TaskPriority = Priority;
export type ProjectPriority = Priority;

export type TaskStatus = 'inbox' | 'todo' | 'planned' | 'in_progress' | 'completed' | 'blocked' | 'postponed' | 'abandoned' | 'cancelled';
export type CommitmentLevel = 'hard_commitment' | 'flexible' | 'stretch';
export type GoalCategory = 'business' | 'personal' | 'health' | 'finance' | 'learning' | 'spirituality' | 'relationships' | string;

// ==============================================================================
// 1. LIFE AREAS
// ==============================================================================

export interface LifeArea {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  slug?: string;
  sortOrder?: number;
  orderIndex?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ==============================================================================
// 2. GOALS (Outcome-oriented Strategic Targets)
// ==============================================================================

export type GoalHorizon = 'quarterly' | 'annual' | 'multi_year';
export type GoalStatus = 'active' | 'completed' | 'on_track' | 'at_risk' | 'paused' | 'cancelled' | 'behind' | 'achieved';

export interface Goal {
  id: string;
  userId?: string;
  lifeAreaId?: string;
  title: string;
  description?: string;
  category?: GoalCategory;
  targetDate?: string; // YYYY-MM-DD
  deadline?: string;
  horizon?: GoalHorizon;
  status: GoalStatus;
  progressPercentage?: number; // 0 - 100
  targetValue?: number;
  currentValue?: number;
  metricUnit?: string;
  metricTarget?: string;
  metricCurrent?: string;
  linkedProjectsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ==============================================================================
// 3. PROJECTS (Concrete Execution Containers)
// ==============================================================================

export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface Project {
  id: string;
  userId?: string;
  goalId?: string;
  lifeAreaId?: string;
  code?: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  color?: string;
  startDate?: string;
  targetDate?: string;
  deadline?: string;
  priority: Priority;
  taskCount?: number;
  completedTaskCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ==============================================================================
// 4. TASKS (Actionable Units of Work)
// ==============================================================================

export interface TaskChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  userId?: string;
  projectId?: string;
  goalId?: string;
  lifeAreaId?: string;
  title: string;
  description?: string;
  priority: Priority;
  commitmentLevel: CommitmentLevel;
  status: TaskStatus;
  
  // Time Estimates & Actuals
  estimatedMinutes: number;
  actualMinutes?: number;
  
  // Scheduling
  scheduledDate?: string; // YYYY-MM-DD
  scheduledStartTime?: string; // e.g. "09:00"
  scheduledEndTime?: string; // e.g. "10:30"
  deadline?: string; // YYYY-MM-DD
  dueDate?: string; // Alias
  
  // Execution Context
  energyRequired?: 'high' | 'medium' | 'low';
  contextTags?: string[]; // e.g. ['deep_work', 'admin', 'writing']
  tags?: string[];
  checklist?: TaskChecklistItem[];
  notes?: string;
  
  // Behavioral Accountability Signals
  startedAt?: string;
  completedAt?: string;
  blockerReason?: string;
  postponeCount?: number;
  lastPostponedAt?: string;
  postponeReason?: string;
  abandonReason?: string;
  
  createdAt?: string;
  updatedAt?: string;
}

// ==============================================================================
// 5. DAILY PLAN & TIME BLOCKS (Nick's Daily Schedule)
// ==============================================================================

export type TimeBlockType =
  | 'deep_work'
  | 'shallow_work'
  | 'routine'
  | 'exercise'
  | 'spirituality'
  | 'learning'
  | 'buffer'
  | 'break'
  | 'admin'
  | 'rest'
  | 'social'
  | 'personal'
  | 'other';

export type TimeBlockStatus =
  | 'scheduled'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'deviated';

export interface TimeBlock {
  id: string;
  userId?: string;
  dailyPlanId: string;
  taskId?: string;
  title: string;
  blockType: TimeBlockType;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "10:30"
  status: TimeBlockStatus;
  actualStart?: string;
  actualEnd?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type DayPlanStatus = 'draft' | 'confirmed' | 'active' | 'completed';

export interface DayPlan {
  id: string;
  userId?: string;
  date: string; // YYYY-MM-DD
  plannedStart?: string; // e.g. "08:30"
  plannedEnd?: string;   // e.g. "18:30"
  sleepRestConstraints?: string;
  notes?: string;
  status: DayPlanStatus;
  generatedByAi: boolean;
  approvedByUser: boolean;
  
  // Executive Decision State
  confirmedByNick?: boolean;
  confirmedAt?: string;
  
  // Plan composition
  plannedTaskIds: string[];
  timeBlocks?: TimeBlock[];
  focusGoalToday?: string;
  energyTarget?: 'maximum' | 'steady' | 'recovery';
  executionScore?: number; // 0 - 100
  totalPlannedMinutes: number;
  totalActualMinutes: number;
  createdAt?: string;
  updatedAt?: string;
}

// ==============================================================================
// 6. EXECUTION SESSIONS (Stopwatch / Granular Focus Tracking)
// ==============================================================================

export type ExecutionSessionStatus = 'active' | 'paused' | 'completed' | 'abandoned' | 'postponed' | 'disconnected';

export interface SessionPause {
  id: string;
  pausedAt: string; // ISO
  resumedAt?: string; // ISO
  durationSeconds?: number;
  reason?: string;
  category?: 'distraction' | 'break' | 'interruption' | 'blocked' | 'other';
}

export interface SessionCheckIn {
  id: string;
  timestamp: string; // ISO
  type: 'working' | 'distracted' | 'break' | 'blocked' | 'milestone';
  note?: string;
}

export interface ExecutionSession {
  id: string;
  userId?: string;
  taskId: string;
  timeBlockId?: string;
  startTime: string; // ISO
  endTime?: string;  // ISO
  durationSeconds: number;
  durationMinutes?: number;
  status: ExecutionSessionStatus;
  pauses?: SessionPause[];
  checkIns?: SessionCheckIn[];
  lastHeartbeatAt?: string; // ISO
  heartbeatCount?: number;
  interruptionStatus: boolean;
  interruptionReason?: string;
  abandonReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// ==============================================================================
// 7. INBOX / DISTRACTIONS
// ==============================================================================

export type InboxItemStatus = 'captured' | 'processed' | 'converted_to_task' | 'dismissed';

export interface InboxItem {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  source?: string;
  status: InboxItemStatus;
  convertedToTaskId?: string;
  convertedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ==============================================================================
// 8. DAILY & WEEKLY ACCOUNTABILITY (Deterministic Source of Truth)
// ==============================================================================

export type CommitmentClassification =
  | 'completed'
  | 'partially_completed'
  | 'postponed'
  | 'abandoned'
  | 'blocked'
  | 'not_started';

export type MissedReasonCategory =
  | 'underestimated'
  | 'poor_planning'
  | 'distracted'
  | 'blocked'
  | 'external_interruption'
  | 'changed_priorities'
  | 'other';

export interface ReconciledCommitment {
  taskId: string;
  taskTitle: string;
  projectId?: string;
  projectName?: string;
  goalId?: string;
  goalTitle?: string;
  commitmentLevel: CommitmentLevel;
  plannedMinutes: number;
  actualMinutes: number;
  classification: CommitmentClassification;
  reasonCategory?: MissedReasonCategory;
  reasonDetails?: string;
  isExternalBlocker?: boolean;
  blockerDetails?: string;
  concreteOutcome?: string;
}

export interface ExternalBlockerRecord {
  id: string;
  taskId?: string;
  taskTitle?: string;
  category: 'external_dependency' | 'system_outage' | 'urgent_external_request' | 'health_emergency' | 'environment' | 'other';
  description: string;
  severity: 'blocking' | 'major_delay' | 'minor';
  loggedAt: string;
}

export interface DailyAccountabilityRecord {
  id: string;
  userId?: string;
  date: string; // YYYY-MM-DD
  plannedTasks: number;
  completedTasks: number;
  postponedTasks: number;
  abandonedTasks: number;
  blockedTasks: number;
  notStartedTasks: number;
  partiallyCompletedTasks: number;
  
  plannedMinutes: number;
  actualMinutes: number;
  
  interruptionCount: number;
  totalPauseMinutes: number;
  
  // Independent ratios (never merged into a single vanity score)
  executionRate: number; // 0.0 - 1.0 (completed planned commitments / total planned commitments)
  timeExecutionRatio: number; // actual execution minutes / planned execution minutes (e.g. 0.85)
  
  // Reconciled snapshot records
  reconciledCommitments: ReconciledCommitment[];
  externalBlockers: ExternalBlockerRecord[];
  concreteOutputs: string[]; // Tangible deliverables/milestones completed
  notes?: string;
  
  isFinalized: boolean;
  finalizedAt?: string;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyAccountabilityAggregate {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  totalPlannedCommitments: number;
  totalCompletedCommitments: number;
  totalPostponedCommitments: number;
  totalAbandonedCommitments: number;
  totalBlockedCommitments: number;
  finalizedDaysCount?: number;
  totalPostponedTasks?: number;
  totalAbandonedTasks?: number;
  overallExecutionRate: number; // 0.0 - 1.0
  
  totalPlannedMinutes: number;
  totalActualMinutes: number;
  overallTimeRatio: number; // actual / planned
  
  totalInterruptions: number;
  totalPauseMinutes: number;
  
  dailyBreakdown: {
    date: string;
    dayName: string;
    planned: number;
    completed: number;
    postponed: number;
    blocked: number;
    executionRate: number;
    plannedMinutes: number;
    actualMinutes: number;
    isFinalized: boolean;
  }[];
  
  blockerCategoriesCount: Record<string, number>;
  reasonCategoriesCount: Record<string, number>;
  recurringMissedReasons?: { category: string; count: number; percentage: number }[];
  
  projectTimeDistribution: {
    projectId: string;
    projectName: string;
    actualMinutes: number;
    completedTasks: number;
  }[];
  projectTimeAllocation?: { projectId: string; projectName: string; actualMinutes: number; percentage: number }[];
  
  goalTimeDistribution: {
    goalId: string;
    goalTitle: string;
    actualMinutes: number;
  }[];
}

// ==============================================================================
// 9. DAILY COMMITMENTS (Nick Decision Confirmation Protocol)
// ==============================================================================

export interface Commitment {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  timeWindow?: string; // e.g. "09:00 - 11:30"
  category: 'deep_work' | 'meeting' | 'health' | 'review' | 'operational';
  status: 'pending' | 'confirmed' | 'in_progress' | 'fulfilled' | 'breached';
  isApprovedByNick: boolean; // Nick remains the sole decision maker
  approvedAt?: string;
  impactLevel: 'high' | 'medium' | 'low';
  createdAt?: string;
  updatedAt?: string;
}

// ==============================================================================
// 10. USER PROFILE & APP NAVIGATION
// ==============================================================================

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  timezone: string;
  workingHoursStart: string; // e.g. "08:30"
  workingHoursEnd: string;   // e.g. "18:30"
  themePreference: 'dark' | 'light' | 'system';
  strictAccountabilityMode: boolean;
  activeFocusTaskId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExecutionMetrics {
  date: string;
  totalPlannedTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  startedTasksCount?: number;
  postponedTasksCount?: number;
  abandonedTasksCount?: number;
  plannedMinutes: number;
  actualMinutes: number;
  executionScore: number; // 0-100 based on completion & on-time execution
  varianceMinutes: number; // actual - planned
  onTimeRatio: number; // 0 - 1
  hardCommitmentsFulfilled: number;
  totalHardCommitments: number;
  interruptionCount?: number;
  totalPauseMinutes?: number;
}

export type NavigationTab = 
  | 'dashboard' 
  | 'today' 
  | 'now' 
  | 'goals' 
  | 'projects' 
  | 'tasks' 
  | 'accountability'
  | 'analytics' 
  | 'settings'
  | 'ai'
  | 'help'
  | 'command'
  | 'vision'
  | 'objectives'
  | 'execution'
  | 'evolution'
  | 'tools';

// ==============================================================================
// 11. AI PROPOSALS & BRAIN MODELS
// ==============================================================================

export type AiProposalType = 'day_plan' | 'task_breakdown' | 'blocker_resolution' | 'replan';
export type AiProposalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface AiProposal {
  id: string;
  userId?: string;
  type: AiProposalType;
  payload: any; // Contextual payload containing the structured suggestions
  explanation: string;
  status: AiProposalStatus;
  createdAt: string;
  reviewedAt?: string;
}

export interface PlanningProposal {
  title: string;
  reason: string;
  task_ids: string[];
  suggested_start: string; // YYYY-MM-DD or HH:MM
  suggested_end: string;
  priority: Priority;
  confidence: number;
  explanation: string;
  time_blocks: {
    title: string;
    blockType: string;
    startTime: string;
    endTime: string;
    taskId?: string;
  }[];
}

export interface TaskSuggestion {
  title: string;
  description: string;
  estimated_minutes: number;
  project_id?: string;
  goal_id?: string;
  priority: Priority;
  reason: string;
}

export interface DailyAnalysis {
  observations: string[];
  risks: string[];
  suggested_adjustments: string[];
  unresolved_commitments: string[];
}

