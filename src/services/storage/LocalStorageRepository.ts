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
} from '../../types/domain';
import { FilterOptions, IExecutionRepository } from '../../types/repository';
import { FocusGuardSettings, FocusGuardAgentHeartbeat } from '../../types/focus';
import { APP_CONFIG } from '../../config/app.config';
import { generateId, getTodayString } from '../../lib/utils';

class SafeStorage {
  private mem = new Map<string, string>();

  getItem(key: string): string | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // fallback
    }
    return this.mem.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // fallback
    }
    this.mem.set(key, value);
  }

  removeItem(key: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      // fallback
    }
    this.mem.delete(key);
  }

  clear(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear();
        return;
      }
    } catch {
      // fallback
    }
    this.mem.clear();
  }
}

const safeStorage = new SafeStorage();

const STORAGE_KEYS = {
  LIFE_AREAS: 'nick_os_life_areas',
  GOALS: 'nick_os_goals',
  PROJECTS: 'nick_os_projects',
  TASKS: 'nick_os_tasks',
  DAY_PLANS: 'nick_os_day_plans',
  TIME_BLOCKS: 'nick_os_time_blocks',
  EXECUTION_SESSIONS: 'nick_os_execution_sessions',
  INBOX_ITEMS: 'nick_os_inbox_items',
  ACCOUNTABILITY: 'nick_os_accountability',
  COMMITMENTS: 'nick_os_commitments',
  USER_PROFILE: 'nick_os_user_profile',
  AI_PROPOSALS: 'nick_os_ai_proposals',
  FOCUS_GUARD_SETTINGS: 'nick_os_focus_guard_settings',
  FOCUS_GUARD_HEARTBEATS: 'nick_os_focus_guard_heartbeats',
};

export class LocalStorageRepository implements IExecutionRepository {
  constructor() {
    this.initializeDefaults();
  }

  private initializeDefaults() {
    const today = getTodayString();
    const now = new Date().toISOString();

    // 1. User Profile
    if (!safeStorage.getItem(STORAGE_KEYS.USER_PROFILE)) {
      safeStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(APP_CONFIG.defaultUser));
    }

    // 2. Life Areas
    if (!safeStorage.getItem(STORAGE_KEYS.LIFE_AREAS)) {
      const initialLifeAreas: LifeArea[] = [
        {
          id: 'area-deep-work',
          name: 'Deep Work & Engineering',
          slug: 'deep-work',
          description: 'Core system architecture, software engineering, and high-leverage building',
          icon: 'code',
          color: '#f59e0b',
          sortOrder: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'area-health',
          name: 'Health & Vitality',
          slug: 'health',
          description: 'Physical training, recovery, sleep hygiene, and nutrition',
          icon: 'activity',
          color: '#10b981',
          sortOrder: 2,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'area-mind',
          name: 'Mind & Discipline',
          slug: 'mind',
          description: 'Deliberate focus, review protocols, and cognitive performance',
          icon: 'brain',
          color: '#3b82f6',
          sortOrder: 3,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'area-operations',
          name: 'Operations & Life',
          slug: 'operations',
          description: 'Administrative responsibilities, personal logistics, and finances',
          icon: 'settings',
          color: '#8b5cf6',
          sortOrder: 4,
          createdAt: now,
          updatedAt: now,
        },
      ];
      safeStorage.setItem(STORAGE_KEYS.LIFE_AREAS, JSON.stringify(initialLifeAreas));
    }

    // 3. Goals
    if (!safeStorage.getItem(STORAGE_KEYS.GOALS)) {
      const initialGoals: Goal[] = [
        {
          id: 'goal-01',
          lifeAreaId: 'area-deep-work',
          title: 'Launch NICK OS Foundation & Data Architecture',
          category: 'quarterly',
          targetValue: 100,
          currentValue: 85,
          metricUnit: '%',
          deadline: '2026-10-31',
          status: 'on_track',
          linkedProjectsCount: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'goal-02',
          lifeAreaId: 'area-mind',
          title: 'Achieve >85% Planned vs Actual Execution Ratio',
          category: 'quarterly',
          targetValue: 85,
          currentValue: 78,
          metricUnit: '%',
          deadline: '2026-12-31',
          status: 'on_track',
          linkedProjectsCount: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'goal-03',
          lifeAreaId: 'area-health',
          title: 'Daily 2-Hour Deep Work Focus Block & Mobility Reset',
          category: 'habit',
          targetValue: 30,
          currentValue: 22,
          metricUnit: 'days',
          deadline: '2026-10-15',
          status: 'on_track',
          linkedProjectsCount: 0,
          createdAt: now,
          updatedAt: now,
        },
      ];
      safeStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(initialGoals));
    }

    // 4. Projects
    if (!safeStorage.getItem(STORAGE_KEYS.PROJECTS)) {
      const initialProjects: Project[] = [
        {
          id: 'proj-01',
          name: 'NICK OS Core Engine',
          code: 'NOS-CORE',
          description: 'Core application shell, domain services, execution tracking, and storage repository.',
          goalId: 'goal-01',
          lifeAreaId: 'area-deep-work',
          status: 'active',
          priority: 'critical',
          color: '#3b82f6',
          deadline: '2026-10-15',
          taskCount: 5,
          completedTaskCount: 2,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'proj-02',
          name: 'Executive Daily Planning Protocol',
          code: 'NOS-PLAN',
          description: 'Structuring morning commitments, decision verification, and accountability checks.',
          goalId: 'goal-02',
          lifeAreaId: 'area-mind',
          status: 'active',
          priority: 'high',
          color: '#10b981',
          deadline: '2026-10-25',
          taskCount: 4,
          completedTaskCount: 1,
          createdAt: now,
          updatedAt: now,
        },
      ];
      safeStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(initialProjects));
    }

    // 5. Commitments
    if (!safeStorage.getItem(STORAGE_KEYS.COMMITMENTS)) {
      const initialCommitments: Commitment[] = [
        {
          id: 'comm-01',
          title: 'Deep Work: System Architecture & Repository Boundaries',
          description: 'Zero distractions, complete the data layer and state machine foundations.',
          date: today,
          timeWindow: '09:00 - 11:30',
          category: 'deep_work',
          status: 'confirmed',
          isApprovedByNick: true,
          approvedAt: now,
          impactLevel: 'high',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'comm-02',
          title: 'Review Execution Metrics with Focus',
          description: 'Inspect past 7 days planned vs actual variance and adjust block buffers.',
          date: today,
          timeWindow: '14:00 - 14:45',
          category: 'review',
          status: 'confirmed',
          isApprovedByNick: true,
          approvedAt: now,
          impactLevel: 'medium',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'comm-03',
          title: 'Physical Health & Mobility Reset Block',
          description: 'Mid-day zone-2 cardio & mobility workout.',
          date: today,
          timeWindow: '17:00 - 17:30',
          category: 'health',
          status: 'pending',
          isApprovedByNick: false,
          impactLevel: 'high',
          createdAt: now,
          updatedAt: now,
        },
      ];
      safeStorage.setItem(STORAGE_KEYS.COMMITMENTS, JSON.stringify(initialCommitments));
    }

    // 6. Tasks
    if (!safeStorage.getItem(STORAGE_KEYS.TASKS)) {
      const initialTasks: Task[] = [
        {
          id: 'task-01',
          title: 'Architect NICK OS domain boundaries & clean interfaces',
          description: 'Establish type contracts, repository pattern, and relational schema without coupling presentation to storage.',
          status: 'in_progress',
          priority: 'critical',
          commitmentLevel: 'hard_commitment',
          estimatedMinutes: 60,
          actualMinutes: 35,
          scheduledDate: today,
          scheduledStartTime: '09:00',
          scheduledEndTime: '10:00',
          projectId: 'proj-01',
          goalId: 'goal-01',
          lifeAreaId: 'area-deep-work',
          tags: ['architecture', 'core-engine'],
          checklist: [
            { id: 'c1', text: 'Define domain interfaces in src/types', done: true },
            { id: 'c2', text: 'Create Supabase & LocalStorage repository pattern', done: true },
            { id: 'c3', text: 'Build modular executive dashboard UI', done: false },
          ],
          notes: 'Nick holds decision-making authority for all commitment confirmations.',
          createdAt: now,
          updatedAt: now,
          startedAt: now,
        },
        {
          id: 'task-02',
          title: 'Assemble Supabase PostgreSQL schema with RLS policies',
          description: 'Write complete migration SQL for 10 core domain tables, constraints, and audit logs.',
          status: 'completed',
          priority: 'high',
          commitmentLevel: 'hard_commitment',
          estimatedMinutes: 45,
          actualMinutes: 40,
          scheduledDate: today,
          scheduledStartTime: '10:15',
          scheduledEndTime: '11:00',
          projectId: 'proj-01',
          goalId: 'goal-01',
          lifeAreaId: 'area-deep-work',
          tags: ['database', 'supabase'],
          checklist: [
            { id: 'c4', text: 'Define DDL for 10 core tables', done: true },
            { id: 'c5', text: 'Add user-level Row Level Security policies', done: true },
          ],
          createdAt: now,
          updatedAt: now,
          completedAt: now,
        },
        {
          id: 'task-03',
          title: 'Implement "NOW" Execution Cockpit with focus timer',
          description: 'Build single-task distraction-free view with active countdown, checklists, and manual completion triggers.',
          status: 'planned',
          priority: 'critical',
          commitmentLevel: 'hard_commitment',
          estimatedMinutes: 50,
          actualMinutes: 0,
          scheduledDate: today,
          scheduledStartTime: '11:30',
          scheduledEndTime: '12:20',
          projectId: 'proj-01',
          goalId: 'goal-01',
          lifeAreaId: 'area-deep-work',
          tags: ['focus', 'cockpit', 'ui'],
          checklist: [
            { id: 'c6', text: 'Integrate active focus stopwatch & countdown', done: false },
            { id: 'c7', text: 'Add fast task step toggle', done: false },
          ],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'task-04',
          title: 'Build Day Planning sequence modal for Nick',
          description: 'Provide deliberate review workflow allowing Nick to confirm commitments, sequence tasks, and set daily focus targets.',
          status: 'planned',
          priority: 'high',
          commitmentLevel: 'flexible',
          estimatedMinutes: 40,
          actualMinutes: 0,
          scheduledDate: today,
          scheduledStartTime: '14:00',
          scheduledEndTime: '14:40',
          projectId: 'proj-02',
          goalId: 'goal-02',
          lifeAreaId: 'area-mind',
          tags: ['planning', 'decision'],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'task-05',
          title: 'Setup Planned vs Actual execution analytics view',
          description: 'Track time variance, discipline score, and completed ratio without fake AI assertions.',
          status: 'planned',
          priority: 'medium',
          commitmentLevel: 'stretch',
          estimatedMinutes: 45,
          actualMinutes: 0,
          scheduledDate: today,
          scheduledStartTime: '15:00',
          scheduledEndTime: '15:45',
          projectId: 'proj-02',
          goalId: 'goal-02',
          lifeAreaId: 'area-mind',
          tags: ['analytics', 'metrics'],
          createdAt: now,
          updatedAt: now,
        },
      ];
      safeStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(initialTasks));
    }

    // 7. Time Blocks
    if (!safeStorage.getItem(STORAGE_KEYS.TIME_BLOCKS)) {
      const initialTimeBlocks: TimeBlock[] = [
        {
          id: 'tb-01',
          dailyPlanId: `plan-${today}`,
          taskId: 'task-01',
          title: 'Deep Architecture & Relational Contracts',
          blockType: 'deep_work',
          startTime: '09:00',
          endTime: '10:00',
          status: 'in_progress',
          actualStart: '09:05',
          notes: 'Focus on clean separation of concerns',
          createdAt: now,
        },
        {
          id: 'tb-02',
          dailyPlanId: `plan-${today}`,
          taskId: 'task-02',
          title: 'PostgreSQL Schema & Security Policies',
          blockType: 'deep_work',
          startTime: '10:15',
          endTime: '11:00',
          status: 'completed',
          actualStart: '10:15',
          actualEnd: '10:55',
          createdAt: now,
        },
        {
          id: 'tb-03',
          dailyPlanId: `plan-${today}`,
          taskId: 'task-03',
          title: 'Cockpit Execution Engine',
          blockType: 'deep_work',
          startTime: '11:30',
          endTime: '12:20',
          status: 'planned',
          createdAt: now,
        },
      ];
      safeStorage.setItem(STORAGE_KEYS.TIME_BLOCKS, JSON.stringify(initialTimeBlocks));
    }

    // 8. Day Plan
    if (!safeStorage.getItem(STORAGE_KEYS.DAY_PLANS)) {
      const initialDayPlan: DayPlan = {
        id: `plan-${today}`,
        date: today,
        plannedStart: '08:30',
        plannedEnd: '18:30',
        sleepRestConstraints: 'Target 8h sleep. Scheduled break at 13:00.',
        notes: 'Priority is structural integrity, typed domain layers, and responsive execution cockpit.',
        status: 'active',
        generatedByAi: false,
        approvedByUser: true,
        confirmedByNick: true,
        confirmedAt: now,
        plannedTaskIds: ['task-01', 'task-02', 'task-03', 'task-04', 'task-05'],
        focusGoalToday: 'Complete foundational data architecture and execution cockpit for NICK OS.',
        energyTarget: 'steady',
        executionScore: 78,
        totalPlannedMinutes: 240,
        totalActualMinutes: 75,
        createdAt: now,
        updatedAt: now,
      };
      safeStorage.setItem(STORAGE_KEYS.DAY_PLANS, JSON.stringify({ [today]: initialDayPlan }));
    }

    // 9. Inbox Items
    if (!safeStorage.getItem(STORAGE_KEYS.INBOX_ITEMS)) {
      const initialInbox: InboxItem[] = [
        {
          id: 'inbox-01',
          title: 'Investigate Web Audio API for subtle cockpit completion chime',
          description: 'Tactile sound design for timer completions without intrusive alerts',
          source: 'thought',
          status: 'captured',
          createdAt: now,
          updatedAt: now,
        },
      ];
      safeStorage.setItem(STORAGE_KEYS.INBOX_ITEMS, JSON.stringify(initialInbox));
    }
  }

  // ============================================================================
  // 1. LIFE AREAS
  // ============================================================================
  async getLifeAreas(): Promise<LifeArea[]> {
    const raw = safeStorage.getItem(STORAGE_KEYS.LIFE_AREAS);
    return raw ? JSON.parse(raw) : [];
  }

  async getLifeAreaById(id: string): Promise<LifeArea | null> {
    const areas = await this.getLifeAreas();
    return areas.find(a => a.id === id) || null;
  }

  async createLifeArea(areaData: Omit<LifeArea, 'id' | 'createdAt' | 'updatedAt'>): Promise<LifeArea> {
    const areas = await this.getLifeAreas();
    const now = new Date().toISOString();
    const newArea: LifeArea = {
      ...areaData,
      id: generateId('area'),
      createdAt: now,
      updatedAt: now,
    };
    areas.push(newArea);
    safeStorage.setItem(STORAGE_KEYS.LIFE_AREAS, JSON.stringify(areas));
    return newArea;
  }

  async updateLifeArea(id: string, updates: Partial<LifeArea>): Promise<LifeArea> {
    const areas = await this.getLifeAreas();
    const idx = areas.findIndex(a => a.id === id);
    if (idx === -1) throw new Error(`Life area with ID ${id} not found`);
    areas[idx] = { ...areas[idx], ...updates, updatedAt: new Date().toISOString() };
    safeStorage.setItem(STORAGE_KEYS.LIFE_AREAS, JSON.stringify(areas));
    return areas[idx];
  }

  async deleteLifeArea(id: string): Promise<boolean> {
    const areas = await this.getLifeAreas();
    const filtered = areas.filter(a => a.id !== id);
    safeStorage.setItem(STORAGE_KEYS.LIFE_AREAS, JSON.stringify(filtered));
    return true;
  }

  // ============================================================================
  // 2. GOALS
  // ============================================================================
  async getGoals(lifeAreaId?: string): Promise<Goal[]> {
    const raw = safeStorage.getItem(STORAGE_KEYS.GOALS);
    let goals: Goal[] = raw ? JSON.parse(raw) : [];
    if (lifeAreaId) {
      goals = goals.filter(g => g.lifeAreaId === lifeAreaId);
    }
    return goals;
  }

  async getGoalById(id: string): Promise<Goal | null> {
    const goals = await this.getGoals();
    return goals.find(g => g.id === id) || null;
  }

  async createGoal(goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> {
    const goals = await this.getGoals();
    const now = new Date().toISOString();
    const newGoal: Goal = {
      ...goalData,
      id: generateId('goal'),
      createdAt: now,
      updatedAt: now,
    };
    goals.push(newGoal);
    safeStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
    return newGoal;
  }

  async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal> {
    const goals = await this.getGoals();
    const idx = goals.findIndex(g => g.id === id);
    if (idx === -1) throw new Error(`Goal with ID ${id} not found`);
    goals[idx] = { ...goals[idx], ...updates, updatedAt: new Date().toISOString() };
    safeStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
    return goals[idx];
  }

  async deleteGoal(id: string): Promise<boolean> {
    const goals = await this.getGoals();
    const filtered = goals.filter(g => g.id !== id);
    safeStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(filtered));
    return true;
  }

  // ============================================================================
  // 3. PROJECTS
  // ============================================================================
  async getProjects(goalId?: string): Promise<Project[]> {
    const raw = safeStorage.getItem(STORAGE_KEYS.PROJECTS);
    let projects: Project[] = raw ? JSON.parse(raw) : [];
    if (goalId) {
      projects = projects.filter(p => p.goalId === goalId);
    }
    return projects;
  }

  async getProjectById(id: string): Promise<Project | null> {
    const projects = await this.getProjects();
    return projects.find(p => p.id === id) || null;
  }

  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'taskCount' | 'completedTaskCount'>): Promise<Project> {
    const projects = await this.getProjects();
    const now = new Date().toISOString();
    const newProj: Project = {
      ...projectData,
      id: generateId('proj'),
      taskCount: 0,
      completedTaskCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    projects.push(newProj);
    safeStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    return newProj;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const projects = await this.getProjects();
    const idx = projects.findIndex(p => p.id === id);
    if (idx === -1) throw new Error(`Project with ID ${id} not found`);
    projects[idx] = { ...projects[idx], ...updates, updatedAt: new Date().toISOString() };
    safeStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    return projects[idx];
  }

  async deleteProject(id: string): Promise<boolean> {
    const projects = await this.getProjects();
    const filtered = projects.filter(p => p.id !== id);
    safeStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(filtered));
    return true;
  }

  // ============================================================================
  // 4. TASKS
  // ============================================================================
  async getTasks(filters?: FilterOptions): Promise<Task[]> {
    const raw = safeStorage.getItem(STORAGE_KEYS.TASKS);
    let tasks: Task[] = raw ? JSON.parse(raw) : [];

    if (filters) {
      if (filters.status) {
        tasks = tasks.filter(t => t.status === filters.status);
      }
      if (filters.priority) {
        tasks = tasks.filter(t => t.priority === filters.priority);
      }
      if (filters.projectId) {
        tasks = tasks.filter(t => t.projectId === filters.projectId);
      }
      if (filters.goalId) {
        tasks = tasks.filter(t => t.goalId === filters.goalId);
      }
      if (filters.lifeAreaId) {
        tasks = tasks.filter(t => t.lifeAreaId === filters.lifeAreaId);
      }
      if (filters.date) {
        tasks = tasks.filter(t => t.scheduledDate === filters.date);
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        tasks = tasks.filter(t => 
          t.title.toLowerCase().includes(query) || 
          t.description?.toLowerCase().includes(query) ||
          (t.tags || []).some((tag: string) => tag.toLowerCase().includes(query))
        );
      }
    }

    return tasks;
  }

  async getTaskById(id: string): Promise<Task | null> {
    const tasks = await this.getTasks();
    return tasks.find(t => t.id === id) || null;
  }

  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const tasks = await this.getTasks();
    const now = new Date().toISOString();
    const newTask: Task = {
      ...taskData,
      id: generateId('task'),
      createdAt: now,
      updatedAt: now,
    };
    tasks.unshift(newTask);
    safeStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    return newTask;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error(`Task with ID ${id} not found`);
    }

    const updatedTask: Task = {
      ...tasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.status === 'completed' && !tasks[index].completedAt) {
      updatedTask.completedAt = new Date().toISOString();
    }
    if (updates.status === 'in_progress' && !tasks[index].startedAt) {
      updatedTask.startedAt = new Date().toISOString();
    }

    tasks[index] = updatedTask;
    safeStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    const tasks = await this.getTasks();
    const filtered = tasks.filter(t => t.id !== id);
    safeStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(filtered));
    return true;
  }

  // ============================================================================
  // 5. DAILY PLANS
  // ============================================================================
  async getDayPlan(date: string): Promise<DayPlan | null> {
    const raw = safeStorage.getItem(STORAGE_KEYS.DAY_PLANS);
    const plans: Record<string, DayPlan> = raw ? JSON.parse(raw) : {};
    return plans[date] || null;
  }

  async saveDayPlan(planData: Omit<DayPlan, 'id'> & { id?: string }): Promise<DayPlan> {
    const raw = safeStorage.getItem(STORAGE_KEYS.DAY_PLANS);
    const plans: Record<string, DayPlan> = raw ? JSON.parse(raw) : {};
    const now = new Date().toISOString();
    const plan: DayPlan = {
      id: planData.id || `plan-${planData.date}`,
      ...planData,
      updatedAt: now,
    };
    plans[plan.date] = plan;
    safeStorage.setItem(STORAGE_KEYS.DAY_PLANS, JSON.stringify(plans));
    return plan;
  }

  // ============================================================================
  // 6. TIME BLOCKS
  // ============================================================================
  async getTimeBlocks(dailyPlanId: string): Promise<TimeBlock[]> {
    const raw = safeStorage.getItem(STORAGE_KEYS.TIME_BLOCKS);
    const blocks: TimeBlock[] = raw ? JSON.parse(raw) : [];
    return blocks.filter(b => b.dailyPlanId === dailyPlanId);
  }

  async createTimeBlock(blockData: Omit<TimeBlock, 'id' | 'createdAt' | 'updatedAt'>): Promise<TimeBlock> {
    const raw = safeStorage.getItem(STORAGE_KEYS.TIME_BLOCKS);
    const blocks: TimeBlock[] = raw ? JSON.parse(raw) : [];
    const now = new Date().toISOString();
    const newBlock: TimeBlock = {
      ...blockData,
      id: generateId('block'),
      createdAt: now,
      updatedAt: now,
    };
    blocks.push(newBlock);
    safeStorage.setItem(STORAGE_KEYS.TIME_BLOCKS, JSON.stringify(blocks));
    return newBlock;
  }

  async updateTimeBlock(id: string, updates: Partial<TimeBlock>): Promise<TimeBlock> {
    const raw = safeStorage.getItem(STORAGE_KEYS.TIME_BLOCKS);
    const blocks: TimeBlock[] = raw ? JSON.parse(raw) : [];
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) throw new Error(`TimeBlock ${id} not found`);
    blocks[idx] = { ...blocks[idx], ...updates, updatedAt: new Date().toISOString() };
    safeStorage.setItem(STORAGE_KEYS.TIME_BLOCKS, JSON.stringify(blocks));
    return blocks[idx];
  }

  async deleteTimeBlock(id: string): Promise<boolean> {
    const raw = safeStorage.getItem(STORAGE_KEYS.TIME_BLOCKS);
    const blocks: TimeBlock[] = raw ? JSON.parse(raw) : [];
    const filtered = blocks.filter(b => b.id !== id);
    safeStorage.setItem(STORAGE_KEYS.TIME_BLOCKS, JSON.stringify(filtered));
    return true;
  }

  // ============================================================================
  // 7. EXECUTION SESSIONS
  // ============================================================================
  async getExecutionSessions(filters?: { taskId?: string; date?: string; status?: string }): Promise<ExecutionSession[]> {
    const raw = safeStorage.getItem(STORAGE_KEYS.EXECUTION_SESSIONS);
    let sessions: ExecutionSession[] = raw ? JSON.parse(raw) : [];

    if (filters) {
      if (filters.taskId) {
        sessions = sessions.filter(s => s.taskId === filters.taskId);
      }
      if (filters.status) {
        sessions = sessions.filter(s => s.status === filters.status);
      }
      if (filters.date) {
        sessions = sessions.filter(s => s.startTime.startsWith(filters.date!));
      }
    }

    return sessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }

  async getSessionById(id: string): Promise<ExecutionSession | null> {
    const sessions = await this.getExecutionSessions();
    return sessions.find(s => s.id === id) || null;
  }

  async getActiveSession(): Promise<ExecutionSession | null> {
    const sessions = await this.getExecutionSessions();
    return sessions.find(s => s.status === 'active' || s.status === 'paused') || null;
  }

  async createExecutionSession(sessionData: Omit<ExecutionSession, 'id' | 'createdAt'>): Promise<ExecutionSession> {
    const raw = safeStorage.getItem(STORAGE_KEYS.EXECUTION_SESSIONS);
    const sessions: ExecutionSession[] = raw ? JSON.parse(raw) : [];
    const now = new Date().toISOString();
    
    const newSession: ExecutionSession = {
      ...sessionData,
      id: generateId('sess'),
      status: sessionData.status || 'active',
      durationSeconds: Math.max(0, sessionData.durationSeconds || 0),
      durationMinutes: Math.round(Math.max(0, sessionData.durationSeconds || 0) / 60),
      pauses: sessionData.pauses || [],
      checkIns: sessionData.checkIns || [],
      heartbeatCount: sessionData.heartbeatCount ?? 1,
      lastHeartbeatAt: sessionData.lastHeartbeatAt || now,
      interruptionStatus: sessionData.interruptionStatus || false,
      createdAt: now,
      updatedAt: now,
    };
    
    sessions.unshift(newSession);
    safeStorage.setItem(STORAGE_KEYS.EXECUTION_SESSIONS, JSON.stringify(sessions));
    return newSession;
  }

  async updateExecutionSession(id: string, updates: Partial<ExecutionSession>): Promise<ExecutionSession> {
    const raw = safeStorage.getItem(STORAGE_KEYS.EXECUTION_SESSIONS);
    const sessions: ExecutionSession[] = raw ? JSON.parse(raw) : [];
    const idx = sessions.findIndex(s => s.id === id);
    if (idx === -1) throw new Error(`Session ${id} not found`);

    const updatedSeconds = updates.durationSeconds !== undefined
      ? Math.max(0, updates.durationSeconds)
      : sessions[idx].durationSeconds;

    sessions[idx] = {
      ...sessions[idx],
      ...updates,
      durationSeconds: updatedSeconds,
      durationMinutes: Math.round(updatedSeconds / 60),
      updatedAt: new Date().toISOString(),
    };

    safeStorage.setItem(STORAGE_KEYS.EXECUTION_SESSIONS, JSON.stringify(sessions));
    return sessions[idx];
  }

  async deleteExecutionSession(id: string): Promise<boolean> {
    const raw = safeStorage.getItem(STORAGE_KEYS.EXECUTION_SESSIONS);
    const sessions: ExecutionSession[] = raw ? JSON.parse(raw) : [];
    const filtered = sessions.filter(s => s.id !== id);
    safeStorage.setItem(STORAGE_KEYS.EXECUTION_SESSIONS, JSON.stringify(filtered));
    return true;
  }

  // ============================================================================
  // 8. INBOX / DISTRACTIONS
  // ============================================================================
  async getInboxItems(status?: InboxItemStatus): Promise<InboxItem[]> {
    const raw = safeStorage.getItem(STORAGE_KEYS.INBOX_ITEMS);
    let items: InboxItem[] = raw ? JSON.parse(raw) : [];
    if (status) {
      items = items.filter(i => i.status === status);
    }
    return items;
  }

  async createInboxItem(itemData: Omit<InboxItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InboxItem> {
    const items = await this.getInboxItems();
    const now = new Date().toISOString();
    const newItem: InboxItem = {
      ...itemData,
      id: generateId('inbox'),
      createdAt: now,
      updatedAt: now,
    };
    items.unshift(newItem);
    safeStorage.setItem(STORAGE_KEYS.INBOX_ITEMS, JSON.stringify(items));
    return newItem;
  }

  async updateInboxItem(id: string, updates: Partial<InboxItem>): Promise<InboxItem> {
    const items = await this.getInboxItems();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) throw new Error(`Inbox item ${id} not found`);
    items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
    safeStorage.setItem(STORAGE_KEYS.INBOX_ITEMS, JSON.stringify(items));
    return items[idx];
  }

  async convertInboxItemToTask(inboxItemId: string, taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const task = await this.createTask(taskData);
    await this.updateInboxItem(inboxItemId, {
      status: 'converted_to_task',
      convertedToTaskId: task.id,
      convertedAt: new Date().toISOString(),
    });
    return task;
  }

  async deleteInboxItem(id: string): Promise<boolean> {
    const items = await this.getInboxItems();
    const filtered = items.filter(i => i.id !== id);
    safeStorage.setItem(STORAGE_KEYS.INBOX_ITEMS, JSON.stringify(filtered));
    return true;
  }

  // ============================================================================
  // 9. DAILY ACCOUNTABILITY RECORDS
  // ============================================================================
  async getAccountabilityRecord(date: string): Promise<DailyAccountabilityRecord | null> {
    const raw = safeStorage.getItem(STORAGE_KEYS.ACCOUNTABILITY);
    const records: Record<string, DailyAccountabilityRecord> = raw ? JSON.parse(raw) : {};
    return records[date] || null;
  }

  async getAccountabilityRecords(range?: { startDate?: string; endDate?: string }): Promise<DailyAccountabilityRecord[]> {
    const raw = safeStorage.getItem(STORAGE_KEYS.ACCOUNTABILITY);
    const recordsObj: Record<string, DailyAccountabilityRecord> = raw ? JSON.parse(raw) : {};
    let records = Object.values(recordsObj);

    if (range) {
      if (range.startDate) {
        records = records.filter(r => r.date >= range.startDate!);
      }
      if (range.endDate) {
        records = records.filter(r => r.date <= range.endDate!);
      }
    }

    return records.sort((a, b) => b.date.localeCompare(a.date));
  }

  async saveAccountabilityRecord(recordData: Omit<DailyAccountabilityRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<DailyAccountabilityRecord> {
    const raw = safeStorage.getItem(STORAGE_KEYS.ACCOUNTABILITY);
    const records: Record<string, DailyAccountabilityRecord> = raw ? JSON.parse(raw) : {};
    const now = new Date().toISOString();
    const existing = records[recordData.date];

    const record: DailyAccountabilityRecord = {
      id: recordData.id || existing?.id || generateId('acc'),
      ...recordData,
      reconciledCommitments: recordData.reconciledCommitments || existing?.reconciledCommitments || [],
      externalBlockers: recordData.externalBlockers || existing?.externalBlockers || [],
      concreteOutputs: recordData.concreteOutputs || existing?.concreteOutputs || [],
      generatedAt: recordData.generatedAt || existing?.generatedAt || now,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    records[record.date] = record;
    safeStorage.setItem(STORAGE_KEYS.ACCOUNTABILITY, JSON.stringify(records));
    return record;
  }

  async finalizeAccountabilityRecord(date: string, recordUpdates: Partial<DailyAccountabilityRecord>): Promise<DailyAccountabilityRecord> {
    const raw = safeStorage.getItem(STORAGE_KEYS.ACCOUNTABILITY);
    const records: Record<string, DailyAccountabilityRecord> = raw ? JSON.parse(raw) : {};
    const existing = records[date];
    const now = new Date().toISOString();

    const finalized: DailyAccountabilityRecord = {
      ...(existing || {
        id: generateId('acc'),
        date,
        plannedTasks: 0,
        completedTasks: 0,
        postponedTasks: 0,
        abandonedTasks: 0,
        blockedTasks: 0,
        notStartedTasks: 0,
        partiallyCompletedTasks: 0,
        plannedMinutes: 0,
        actualMinutes: 0,
        interruptionCount: 0,
        totalPauseMinutes: 0,
        executionRate: 0,
        timeExecutionRatio: 0,
        reconciledCommitments: [],
        externalBlockers: [],
        concreteOutputs: [],
        generatedAt: now,
        createdAt: now,
      }),
      ...recordUpdates,
      isFinalized: true,
      finalizedAt: now,
      updatedAt: now,
    };

    records[date] = finalized;
    safeStorage.setItem(STORAGE_KEYS.ACCOUNTABILITY, JSON.stringify(records));
    return finalized;
  }

  async reopenAccountabilityRecord(date: string): Promise<DailyAccountabilityRecord> {
    const raw = safeStorage.getItem(STORAGE_KEYS.ACCOUNTABILITY);
    const records: Record<string, DailyAccountabilityRecord> = raw ? JSON.parse(raw) : {};
    const existing = records[date];
    if (!existing) {
      throw new Error(`No accountability record found for date ${date}`);
    }

    const updated: DailyAccountabilityRecord = {
      ...existing,
      isFinalized: false,
      updatedAt: new Date().toISOString(),
    };

    records[date] = updated;
    safeStorage.setItem(STORAGE_KEYS.ACCOUNTABILITY, JSON.stringify(records));
    return updated;
  }

  // ============================================================================
  // 10. COMMITMENTS
  // ============================================================================
  async getCommitments(date?: string): Promise<Commitment[]> {
    const raw = safeStorage.getItem(STORAGE_KEYS.COMMITMENTS);
    const commitments: Commitment[] = raw ? JSON.parse(raw) : [];
    if (date) {
      return commitments.filter(c => c.date === date);
    }
    return commitments;
  }

  async createCommitment(data: Omit<Commitment, 'id'>): Promise<Commitment> {
    const commitments = await this.getCommitments();
    const now = new Date().toISOString();
    const newCommitment: Commitment = {
      ...data,
      id: generateId('comm'),
      createdAt: now,
      updatedAt: now,
    };
    commitments.push(newCommitment);
    safeStorage.setItem(STORAGE_KEYS.COMMITMENTS, JSON.stringify(commitments));
    return newCommitment;
  }

  async updateCommitment(id: string, updates: Partial<Commitment>): Promise<Commitment> {
    const commitments = await this.getCommitments();
    const index = commitments.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Commitment with ID ${id} not found`);
    }
    commitments[index] = { ...commitments[index], ...updates, updatedAt: new Date().toISOString() };
    safeStorage.setItem(STORAGE_KEYS.COMMITMENTS, JSON.stringify(commitments));
    return commitments[index];
  }

  async deleteCommitment(id: string): Promise<boolean> {
    const commitments = await this.getCommitments();
    const filtered = commitments.filter(c => c.id !== id);
    safeStorage.setItem(STORAGE_KEYS.COMMITMENTS, JSON.stringify(filtered));
    return true;
  }

  // ============================================================================
  // USER PROFILE
  // ============================================================================
  async getUserProfile(): Promise<UserProfile> {
    const raw = safeStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return raw ? JSON.parse(raw) : APP_CONFIG.defaultUser;
  }

  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const profile = await this.getUserProfile();
    const updated = { ...profile, ...updates };
    safeStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
    return updated;
  }

  // ============================================================================
  // METRICS (Planned vs Actual Calculation)
  // ============================================================================
  async getExecutionMetrics(date: string): Promise<ExecutionMetrics> {
    const tasks = await this.getTasks({ date });
    const sessions = await this.getExecutionSessions({ date });

    const totalPlannedTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const startedTasksCount = tasks.filter(t => t.status !== 'planned' && t.status !== 'todo').length;
    const postponedTasksCount = tasks.filter(t => t.status === 'postponed').length;
    const abandonedTasksCount = sessions.filter(s => s.status === 'abandoned').length;

    const plannedMinutes = tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
    const actualMinutes = tasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);

    const hardCommitments = tasks.filter(t => t.commitmentLevel === 'hard_commitment');
    const hardFulfilled = hardCommitments.filter(t => t.status === 'completed').length;

    // Interruptions & pauses from sessions
    const interruptionCount = sessions.reduce((sum, s) => {
      const pauseCount = s.pauses ? s.pauses.length : 0;
      return sum + pauseCount + (s.interruptionStatus ? 1 : 0);
    }, 0);

    const totalPauseSeconds = sessions.reduce((sum, s) => {
      if (!s.pauses) return sum;
      return sum + s.pauses.reduce((pSum, p) => pSum + (p.durationSeconds || 0), 0);
    }, 0);
    const totalPauseMinutes = Math.round(totalPauseSeconds / 60);

    const onTimeRatio = totalPlannedTasks > 0 ? completedTasks / totalPlannedTasks : 0;
    const executionScore = totalPlannedTasks > 0 
      ? Math.round((completedTasks / totalPlannedTasks) * 70 + (hardCommitments.length > 0 ? (hardFulfilled / hardCommitments.length) * 30 : 30))
      : 0;

    return {
      date,
      totalPlannedTasks,
      completedTasks,
      inProgressTasks,
      startedTasksCount,
      postponedTasksCount,
      abandonedTasksCount,
      plannedMinutes,
      actualMinutes,
      executionScore,
      varianceMinutes: actualMinutes - plannedMinutes,
      onTimeRatio,
      hardCommitmentsFulfilled: hardFulfilled,
      totalHardCommitments: hardCommitments.length,
      interruptionCount,
      totalPauseMinutes,
    };
  }

  // ============================================================================
  // AI PROPOSALS
  // ============================================================================
  async getAiProposals(): Promise<AiProposal[]> {
    const raw = safeStorage.getItem(STORAGE_KEYS.AI_PROPOSALS);
    return raw ? JSON.parse(raw) : [];
  }

  async createAiProposal(proposal: Omit<AiProposal, 'id' | 'createdAt'>): Promise<AiProposal> {
    const proposals = await this.getAiProposals();
    const newProposal: AiProposal = {
      ...proposal,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    proposals.push(newProposal);
    safeStorage.setItem(STORAGE_KEYS.AI_PROPOSALS, JSON.stringify(proposals));
    return newProposal;
  }

  async updateAiProposal(id: string, updates: Partial<AiProposal>): Promise<AiProposal> {
    const proposals = await this.getAiProposals();
    const index = proposals.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`AI Proposal with ID ${id} not found`);
    }
    proposals[index] = {
      ...proposals[index],
      ...updates,
      reviewedAt: new Date().toISOString(),
    };
    safeStorage.setItem(STORAGE_KEYS.AI_PROPOSALS, JSON.stringify(proposals));
    return proposals[index];
  }

  // ============================================================================
  // FOCUS GUARD SETTINGS & HEARTBEATS
  // ============================================================================
  async getFocusGuardSettings(): Promise<FocusGuardSettings> {
    const raw = safeStorage.getItem(STORAGE_KEYS.FOCUS_GUARD_SETTINGS);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    const defaultSettings: FocusGuardSettings = {
      enabled: true,
      mode: 'blacklist',
      allowedDomains: ['nickos.ai.studio', 'ai.studio', 'github.com', 'google.com', 'stackoverflow.com', 'docs.google.com'],
      blockedDomains: ['youtube.com', 'x.com', 'twitter.com', 'reddit.com', 'facebook.com', 'instagram.com', 'tiktok.com'],
      blockedApps: ['Discord.exe', 'Steam.exe', 'Spotify.exe', 'League of Legends.exe'],
      unknownSitePolicy: 'allow',
      updatedAt: new Date().toISOString(),
    };
    safeStorage.setItem(STORAGE_KEYS.FOCUS_GUARD_SETTINGS, JSON.stringify(defaultSettings));
    return defaultSettings;
  }

  async saveFocusGuardSettings(updates: Partial<FocusGuardSettings>): Promise<FocusGuardSettings> {
    const current = await this.getFocusGuardSettings();
    const updated: FocusGuardSettings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    safeStorage.setItem(STORAGE_KEYS.FOCUS_GUARD_SETTINGS, JSON.stringify(updated));
    return updated;
  }

  async recordAgentHeartbeat(heartbeat: FocusGuardAgentHeartbeat): Promise<FocusGuardAgentHeartbeat> {
    const heartbeats = await this.getAgentHeartbeats();
    const index = heartbeats.findIndex(h => h.clientId === heartbeat.clientId);
    const updatedRecord: FocusGuardAgentHeartbeat = {
      ...heartbeat,
      id: heartbeat.id || generateId('hb'),
      lastHeartbeatAt: new Date().toISOString(),
    };
    if (index >= 0) {
      heartbeats[index] = updatedRecord;
    } else {
      heartbeats.push(updatedRecord);
    }
    safeStorage.setItem(STORAGE_KEYS.FOCUS_GUARD_HEARTBEATS, JSON.stringify(heartbeats));
    return updatedRecord;
  }

  async getAgentHeartbeats(): Promise<FocusGuardAgentHeartbeat[]> {
    const raw = safeStorage.getItem(STORAGE_KEYS.FOCUS_GUARD_HEARTBEATS);
    if (!raw) return [];
    try {
      const list: FocusGuardAgentHeartbeat[] = JSON.parse(raw);
      const cutoff = Date.now() - 45000; // 45 seconds stale cutoff
      return list.map(h => {
        const last = new Date(h.lastHeartbeatAt).getTime();
        if (isNaN(last) || last < cutoff) {
          return { ...h, status: 'disconnected' };
        }
        return h;
      });
    } catch {
      return [];
    }
  }
}
