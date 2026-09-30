// ==============================================================================
// NICK OS — ADVANCED BEHAVIORAL LEARNING TYPES
// ==============================================================================

export interface EstimationErrorRecord {
  taskId: string;
  taskTitle: string;
  estimatedMinutes: number;
  actualMinutes: number;
  differenceMinutes: number;
  accuracyRatio: number;
}

export interface TimePeriodExecution {
  morning: { plannedCount: number; completedCount: number; ratio: number; sessionsCount: number };
  afternoon: { plannedCount: number; completedCount: number; ratio: number; sessionsCount: number };
  evening: { plannedCount: number; completedCount: number; ratio: number; sessionsCount: number };
}

export interface DayOfWeekExecution {
  [day: string]: { plannedCount: number; completedCount: number; ratio: number };
}

export interface ProjectTimeAllocation {
  projectId: string;
  projectName: string;
  plannedMinutes: number;
  actualMinutes: number;
  neglectFactor: number;
  completionRate: number;
  overdueTasksCount: number;
  postponedTasksCount: number;
  recentActivity: boolean;
}

export interface BlockerOccurrence {
  category: string;
  count: number;
  tasksLinked: string[];
}

export interface TaskTypePerformance {
  category: string;
  plannedMinutes: number;
  actualMinutes: number;
  completionRate: number;
  postponeRate: number;
}

export interface BehavioralMemoryItem<T> {
  value: T;
  confidence: 'low' | 'moderate' | 'high';
  confidenceScore: number;
  sampleSize: number;
  lastUpdated: string;
}

export interface BehavioralMemoryProfile {
  planning_capacity: BehavioralMemoryItem<{ actualAverageDailyMins: number; plannedAverageDailyMins: number; ratio: number }>;
  estimation_bias: BehavioralMemoryItem<{ biasMultiplier: number; percentageUnderBudget: number }>;
  preferred_execution_windows: BehavioralMemoryItem<{ bestWindow: string; morningRatio: number; afternoonRatio: number; eveningRatio: number }>;
  common_blockers: BehavioralMemoryItem<string[]>;
  interruption_patterns: BehavioralMemoryItem<{ frequentCategory: string; frequencyRate: number }>;
  postponement_patterns: BehavioralMemoryItem<{ totalPostponed: number; topTaskTitle: string }>;
  context_switch_rate: BehavioralMemoryItem<number>;
  project_allocation_patterns: BehavioralMemoryItem<{ neglectedProjectsCount: number; balancedProjectsCount: number }>;
}

export interface AdaptiveEstimateResult {
  taskId?: string;
  originalEstimate: number;
  suggestedEstimate: number;
  confidence: 'low' | 'moderate' | 'high';
  reason: string;
  sampleSize: number;
}

export interface TaskFrictionRecord {
  taskId: string;
  taskTitle: string;
  frictionScore: number; // 0 - 100
  postponeCount: number;
  interruptionCount: number;
  daysPending: number;
  abandoned: boolean;
  explanation: string;
}

export interface RecencyWeightConfig {
  highRelevanceDays: number;
  mediumRelevanceDays: number;
  highWeight: number;
  mediumWeight: number;
  lowWeight: number;
}

export interface BehavioralMetrics {
  totalSessionsAnalyzed: number;
  averagePlannedDuration: number;
  averageActualDuration: number;
  estimationErrorRate: number;
  completionRate: number;
  postponementRate: number;
  abandonmentRate: number;
  interruptionFrequency: number;
  executionByTimeOfDay: TimePeriodExecution;
  executionByDayOfWeek: DayOfWeekExecution;
  projectExecutionDistribution: ProjectTimeAllocation[];
  recurringBlockerCategories: BlockerOccurrence[];
  taskTypePerformance: TaskTypePerformance[];
  contextSwitchRate: number;
}

export interface TransparencyInsight {
  id: string;
  title: string;
  observation: string;
  data: string;
  implication: string;
  recommendation: string;
  confidence: number;
  confidenceLevel: 'low' | 'moderate' | 'high';
  category: 'estimation' | 'postponement' | 'capacity' | 'time_of_day' | 'context_switch' | 'project_balance' | 'blockers';
  sampleSize: number;
  period: string;
  traceability: {
    observation: string;
    data: string;
    period: string;
    reason: string;
  };
}

export interface PlanQualityWarning {
  id: string;
  type: 'conflict' | 'capacity_overload' | 'overdue' | 'missing_buffer' | 'excessive_switches' | 'no_estimate' | 'repeated_postponements';
  severity: 'high' | 'medium' | 'info';
  message: string;
}

export interface BehaviorProfile {
  estimation_bias: number;
  average_session_duration: number;
  common_blockers: string[];
  postponement_patterns: {
    totalPostponedCount: number;
    highestPostponedTasks: { id: string; title: string; postponeCount: number }[];
  };
  execution_by_time_period: {
    morning: number;
    afternoon: number;
    evening: number;
  };
  project_distribution: { [projectId: string]: number };
  context_switch_rate: number;
  daily_capacity_ratio: number;
}

export interface LearningThresholds {
  insufficientLimit: number;
  preliminaryLimit: number;
  strongLimit: number;
}

