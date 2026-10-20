import { SupabaseClient } from '@supabase/supabase-js';
import {
  Task,
  LifeArea,
  Project,
  Goal,
  Commitment,
  DayPlan,
  TimeBlock,
  ExecutionSession,
  ExecutionSessionStatus,
  InboxItem,
  DailyAccountabilityRecord,
  ExecutionMetrics,
  UserProfile,
  InboxItemStatus,
  AiProposal,
} from '../../types/domain';
import { FilterOptions, IExecutionRepository } from '../../types/repository';
import { FocusGuardSettings, FocusGuardAgentHeartbeat } from '../../types/focus';
import { LocalStorageRepository } from './LocalStorageRepository';

export class SupabaseRepository implements IExecutionRepository {
  private fallback: LocalStorageRepository;

  constructor(private client: SupabaseClient) {
    this.fallback = new LocalStorageRepository();
  }

  private async requireCreationOwner(): Promise<string> {
    const { data: { user }, error } = await this.client.auth.getUser();
    if (error || !user) {
      throw new Error('Connectez-vous à votre compte dans Configuration Supabase avant de créer des données cloud. La clé publique seule ne suffit pas.');
    }
    // Projects/tasks reference profiles, not auth.users directly. Preserve an existing profile.
    const { error: profileError } = await this.client.from('profiles').upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Nick',
    }, { onConflict: 'id', ignoreDuplicates: true });
    if (profileError) throw new Error(`Impossible de préparer le profil Supabase : ${profileError.message}`);
    return user.id;
  }

  // ============================================================================
  // 1. LIFE AREAS
  // ============================================================================
  async getLifeAreas(): Promise<LifeArea[]> {
    try {
      const { data, error } = await this.client
        .from('life_areas')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error || !data) {
        console.warn('Supabase getLifeAreas fallback:', error?.message);
        return this.fallback.getLifeAreas();
      }
      return data.map(this.mapDbLifeAreaToDomain);
    } catch (err) {
      console.error('Supabase query failed, using local fallback:', err);
      return this.fallback.getLifeAreas();
    }
  }

  async getLifeAreaById(id: string): Promise<LifeArea | null> {
    try {
      const { data, error } = await this.client
        .from('life_areas')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return this.fallback.getLifeAreaById(id);
      return this.mapDbLifeAreaToDomain(data);
    } catch {
      return this.fallback.getLifeAreaById(id);
    }
  }

  async createLifeArea(areaData: Omit<LifeArea, 'id' | 'createdAt' | 'updatedAt'>): Promise<LifeArea> {
    try {
      const payload = {
        name: areaData.name,
        slug: areaData.slug,
        description: areaData.description,
        icon: areaData.icon,
        color: areaData.color,
        sort_order: areaData.sortOrder,
      };
      const { data, error } = await this.client.from('life_areas').insert([payload]).select().single();
      if (error || !data) return this.fallback.createLifeArea(areaData);
      return this.mapDbLifeAreaToDomain(data);
    } catch {
      return this.fallback.createLifeArea(areaData);
    }
  }

  async updateLifeArea(id: string, updates: Partial<LifeArea>): Promise<LifeArea> {
    try {
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.slug !== undefined) payload.slug = updates.slug;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.icon !== undefined) payload.icon = updates.icon;
      if (updates.color !== undefined) payload.color = updates.color;
      if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;

      const { data, error } = await this.client.from('life_areas').update(payload).eq('id', id).select().single();
      if (error || !data) return this.fallback.updateLifeArea(id, updates);
      return this.mapDbLifeAreaToDomain(data);
    } catch {
      return this.fallback.updateLifeArea(id, updates);
    }
  }

  async deleteLifeArea(id: string): Promise<boolean> {
    try {
      const { error } = await this.client.from('life_areas').delete().eq('id', id);
      if (error) return this.fallback.deleteLifeArea(id);
      return true;
    } catch {
      return this.fallback.deleteLifeArea(id);
    }
  }

  // ============================================================================
  // 2. GOALS
  // ============================================================================
  async getGoals(lifeAreaId?: string): Promise<Goal[]> {
    try {
      let query = this.client.from('goals').select('*');
      if (lifeAreaId) query = query.eq('life_area_id', lifeAreaId);
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error || !data) return this.fallback.getGoals(lifeAreaId);
      return data.map(this.mapDbGoalToDomain);
    } catch {
      return this.fallback.getGoals(lifeAreaId);
    }
  }

  async getGoalById(id: string): Promise<Goal | null> {
    try {
      const { data, error } = await this.client.from('goals').select('*').eq('id', id).single();
      if (error || !data) return this.fallback.getGoalById(id);
      return this.mapDbGoalToDomain(data);
    } catch {
      return this.fallback.getGoalById(id);
    }
  }

  async createGoal(goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> {
    try {
      const payload = {
        title: goalData.title,
        description: goalData.description,
        category: goalData.category,
        target_value: goalData.targetValue,
        current_value: goalData.currentValue,
        metric_unit: goalData.metricUnit,
        deadline: goalData.deadline,
        status: goalData.status,
        life_area_id: goalData.lifeAreaId,
      };
      const { data, error } = await this.client.from('goals').insert([payload]).select().single();
      if (error || !data) return this.fallback.createGoal(goalData);
      return this.mapDbGoalToDomain(data);
    } catch {
      return this.fallback.createGoal(goalData);
    }
  }

  async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal> {
    try {
      const payload: Record<string, unknown> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.targetValue !== undefined) payload.target_value = updates.targetValue;
      if (updates.currentValue !== undefined) payload.current_value = updates.currentValue;
      if (updates.metricUnit !== undefined) payload.metric_unit = updates.metricUnit;
      if (updates.deadline !== undefined) payload.deadline = updates.deadline;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.lifeAreaId !== undefined) payload.life_area_id = updates.lifeAreaId;

      const { data, error } = await this.client.from('goals').update(payload).eq('id', id).select().single();
      if (error || !data) return this.fallback.updateGoal(id, updates);
      return this.mapDbGoalToDomain(data);
    } catch {
      return this.fallback.updateGoal(id, updates);
    }
  }

  async deleteGoal(id: string): Promise<boolean> {
    try {
      const { error } = await this.client.from('goals').delete().eq('id', id);
      if (error) return this.fallback.deleteGoal(id);
      return true;
    } catch {
      return this.fallback.deleteGoal(id);
    }
  }

  // ============================================================================
  // 3. PROJECTS
  // ============================================================================
  async getProjects(goalId?: string): Promise<Project[]> {
    try {
      let query = this.client.from('projects').select('*');
      if (goalId) query = query.eq('goal_id', goalId);
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error || !data) return this.fallback.getProjects(goalId);
      return data.map(this.mapDbProjectToDomain);
    } catch {
      return this.fallback.getProjects(goalId);
    }
  }

  async getProjectById(id: string): Promise<Project | null> {
    try {
      const { data, error } = await this.client.from('projects').select('*').eq('id', id).single();
      if (error || !data) return this.fallback.getProjectById(id);
      return this.mapDbProjectToDomain(data);
    } catch {
      return this.fallback.getProjectById(id);
    }
  }

  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'taskCount' | 'completedTaskCount'>): Promise<Project> {
    try {
      const userId = await this.requireCreationOwner();
      const payload = {
        user_id: userId,
        name: projectData.name,
        code: projectData.code,
        description: projectData.description,
        status: projectData.status,
        priority: projectData.priority,
        color: projectData.color,
        deadline: projectData.deadline,
        goal_id: projectData.goalId,
        life_area_id: projectData.lifeAreaId,
      };
      const { data, error } = await this.client.from('projects').insert([payload]).select().single();
      if (error || !data) throw new Error(error?.message || 'Supabase n’a retourné aucun enregistrement.');
      return this.mapDbProjectToDomain(data);
    } catch (error) {
      throw new Error(`Création du projet impossible : ${error instanceof Error ? error.message : 'Erreur Supabase inconnue'}`);
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    try {
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.code !== undefined) payload.code = updates.code;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.color !== undefined) payload.color = updates.color;
      if (updates.deadline !== undefined) payload.deadline = updates.deadline;
      if (updates.goalId !== undefined) payload.goal_id = updates.goalId;
      if (updates.lifeAreaId !== undefined) payload.life_area_id = updates.lifeAreaId;

      const { data, error } = await this.client.from('projects').update(payload).eq('id', id).select().single();
      if (error || !data) return this.fallback.updateProject(id, updates);
      return this.mapDbProjectToDomain(data);
    } catch {
      return this.fallback.updateProject(id, updates);
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    try {
      const { error } = await this.client.from('projects').delete().eq('id', id);
      if (error) return this.fallback.deleteProject(id);
      return true;
    } catch {
      return this.fallback.deleteProject(id);
    }
  }

  // ============================================================================
  // 4. TASKS
  // ============================================================================
  async getTasks(filters?: FilterOptions): Promise<Task[]> {
    try {
      let query = this.client.from('tasks').select('*');

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.priority) query = query.eq('priority', filters.priority);
      if (filters?.projectId) query = query.eq('project_id', filters.projectId);
      if (filters?.goalId) query = query.eq('goal_id', filters.goalId);
      if (filters?.lifeAreaId) query = query.eq('life_area_id', filters.lifeAreaId);
      if (filters?.date) query = query.eq('scheduled_date', filters.date);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error || !data) {
        return this.fallback.getTasks(filters);
      }

      return data.map(this.mapDbTaskToDomain);
    } catch {
      return this.fallback.getTasks(filters);
    }
  }

  async getTaskById(id: string): Promise<Task | null> {
    try {
      const { data, error } = await this.client.from('tasks').select('*').eq('id', id).single();
      if (error || !data) return this.fallback.getTaskById(id);
      return this.mapDbTaskToDomain(data);
    } catch {
      return this.fallback.getTaskById(id);
    }
  }

  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    try {
      const userId = await this.requireCreationOwner();
      const dbPayload = {
        user_id: userId,
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        commitment_level: taskData.commitmentLevel,
        estimated_duration: taskData.estimatedMinutes,
        actual_duration: taskData.actualMinutes,
        due_date: taskData.dueDate,
        scheduled_date: taskData.scheduledDate,
        scheduled_start: taskData.scheduledStartTime,
        scheduled_end: taskData.scheduledEndTime,
        project_id: taskData.projectId,
        goal_id: taskData.goalId,
        life_area_id: taskData.lifeAreaId,
        tags: taskData.tags,
        checklist: taskData.checklist,
        notes: taskData.notes,
        blocker_reason: taskData.blockerReason,
      };

      const { data, error } = await this.client.from('tasks').insert([dbPayload]).select().single();
      if (error || !data) throw new Error(error?.message || 'Supabase n’a retourné aucun enregistrement.');
      return this.mapDbTaskToDomain(data);
    } catch (error) {
      throw new Error(`Création de la tâche impossible : ${error instanceof Error ? error.message : 'Erreur Supabase inconnue'}`);
    }
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.commitmentLevel !== undefined) dbUpdates.commitment_level = updates.commitmentLevel;
      if (updates.estimatedMinutes !== undefined) dbUpdates.estimated_duration = updates.estimatedMinutes;
      if (updates.actualMinutes !== undefined) dbUpdates.actual_duration = updates.actualMinutes;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.scheduledDate !== undefined) dbUpdates.scheduled_date = updates.scheduledDate;
      if (updates.scheduledStartTime !== undefined) dbUpdates.scheduled_start = updates.scheduledStartTime;
      if (updates.scheduledEndTime !== undefined) dbUpdates.scheduled_end = updates.scheduledEndTime;
      if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
      if (updates.goalId !== undefined) dbUpdates.goal_id = updates.goalId;
      if (updates.lifeAreaId !== undefined) dbUpdates.life_area_id = updates.lifeAreaId;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.checklist !== undefined) dbUpdates.checklist = updates.checklist;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.blockerReason !== undefined) dbUpdates.blocker_reason = updates.blockerReason;
      if (updates.startedAt !== undefined) dbUpdates.started_at = updates.startedAt;
      if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;

      const { data, error } = await this.client.from('tasks').update(dbUpdates).eq('id', id).select().single();
      if (error || !data) return this.fallback.updateTask(id, updates);
      return this.mapDbTaskToDomain(data);
    } catch {
      return this.fallback.updateTask(id, updates);
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    try {
      const { error } = await this.client.from('tasks').delete().eq('id', id);
      if (error) return this.fallback.deleteTask(id);
      return true;
    } catch {
      return this.fallback.deleteTask(id);
    }
  }

  // ============================================================================
  // 5. DAILY PLANS
  // ============================================================================
  async getDayPlan(date: string): Promise<DayPlan | null> {
    try {
      const { data, error } = await this.client.from('daily_plans').select('*').eq('date', date).single();
      if (error || !data) return this.fallback.getDayPlan(date);
      
      const timeBlocks = await this.getTimeBlocks(data.id);

      return {
        id: data.id,
        date: data.date,
        plannedStart: data.planned_start,
        plannedEnd: data.planned_end,
        sleepRestConstraints: data.sleep_rest_constraints,
        notes: data.notes,
        status: data.status,
        generatedByAi: data.generated_by_ai || false,
        approvedByUser: data.approved_by_user || false,
        confirmedByNick: data.approved_by_user || false,
        plannedTaskIds: [],
        timeBlocks,
        focusGoalToday: data.focus_goal_today,
        energyTarget: data.energy_target,
        executionScore: data.execution_score,
        totalPlannedMinutes: data.total_planned_minutes || 0,
        totalActualMinutes: data.total_actual_minutes || 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return this.fallback.getDayPlan(date);
    }
  }

  async saveDayPlan(plan: Omit<DayPlan, 'id'> & { id?: string }): Promise<DayPlan> {
    try {
      const payload = {
        date: plan.date,
        planned_start: plan.plannedStart || '08:30',
        planned_end: plan.plannedEnd || '18:30',
        sleep_rest_constraints: plan.sleepRestConstraints,
        notes: plan.notes,
        status: plan.status,
        generated_by_ai: plan.generatedByAi || false,
        approved_by_user: plan.approvedByUser || plan.confirmedByNick || false,
        focus_goal_today: plan.focusGoalToday,
        energy_target: plan.energyTarget || 'steady',
        execution_score: plan.executionScore,
        total_planned_minutes: plan.totalPlannedMinutes || 0,
        total_actual_minutes: plan.totalActualMinutes || 0,
      };

      const { data, error } = await this.client
        .from('daily_plans')
        .upsert([payload], { onConflict: 'user_id, date' })
        .select()
        .single();

      if (error || !data) return this.fallback.saveDayPlan(plan);

      return {
        id: data.id,
        ...plan,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return this.fallback.saveDayPlan(plan);
    }
  }

  // ============================================================================
  // 6. TIME BLOCKS
  // ============================================================================
  async getTimeBlocks(dailyPlanId: string): Promise<TimeBlock[]> {
    try {
      const { data, error } = await this.client
        .from('time_blocks')
        .select('*')
        .eq('daily_plan_id', dailyPlanId)
        .order('start_time', { ascending: true });

      if (error || !data) return this.fallback.getTimeBlocks(dailyPlanId);
      return data.map(this.mapDbTimeBlockToDomain);
    } catch {
      return this.fallback.getTimeBlocks(dailyPlanId);
    }
  }

  async createTimeBlock(blockData: Omit<TimeBlock, 'id' | 'createdAt' | 'updatedAt'>): Promise<TimeBlock> {
    try {
      const payload = {
        daily_plan_id: blockData.dailyPlanId,
        task_id: blockData.taskId,
        title: blockData.title,
        block_type: blockData.blockType,
        start_time: blockData.startTime,
        end_time: blockData.endTime,
        status: blockData.status,
        actual_start: blockData.actualStart,
        actual_end: blockData.actualEnd,
        notes: blockData.notes,
      };
      const { data, error } = await this.client.from('time_blocks').insert([payload]).select().single();
      if (error || !data) return this.fallback.createTimeBlock(blockData);
      return this.mapDbTimeBlockToDomain(data);
    } catch {
      return this.fallback.createTimeBlock(blockData);
    }
  }

  async updateTimeBlock(id: string, updates: Partial<TimeBlock>): Promise<TimeBlock> {
    try {
      const payload: Record<string, unknown> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.blockType !== undefined) payload.block_type = updates.blockType;
      if (updates.startTime !== undefined) payload.start_time = updates.startTime;
      if (updates.endTime !== undefined) payload.end_time = updates.endTime;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.actualStart !== undefined) payload.actual_start = updates.actualStart;
      if (updates.actualEnd !== undefined) payload.actual_end = updates.actualEnd;
      if (updates.notes !== undefined) payload.notes = updates.notes;
      if (updates.taskId !== undefined) payload.task_id = updates.taskId;

      const { data, error } = await this.client.from('time_blocks').update(payload).eq('id', id).select().single();
      if (error || !data) return this.fallback.updateTimeBlock(id, updates);
      return this.mapDbTimeBlockToDomain(data);
    } catch {
      return this.fallback.updateTimeBlock(id, updates);
    }
  }

  async deleteTimeBlock(id: string): Promise<boolean> {
    try {
      const { error } = await this.client.from('time_blocks').delete().eq('id', id);
      if (error) return this.fallback.deleteTimeBlock(id);
      return true;
    } catch {
      return this.fallback.deleteTimeBlock(id);
    }
  }

  // ============================================================================
  // 7. EXECUTION SESSIONS
  // ============================================================================
  private mapDbSessionToDomain(s: any): ExecutionSession {
    return {
      id: s.id,
      userId: s.user_id,
      taskId: s.task_id,
      timeBlockId: s.time_block_id,
      startTime: s.start_time,
      endTime: s.end_time,
      durationSeconds: Number(s.duration_seconds || 0),
      durationMinutes: Math.round((s.duration_seconds || 0) / 60),
      status: (s.status as ExecutionSessionStatus) || (s.end_time ? 'completed' : 'active'),
      pauses: s.pauses || [],
      checkIns: s.check_ins || [],
      lastHeartbeatAt: s.last_heartbeat_at,
      heartbeatCount: s.heartbeat_count ? Number(s.heartbeat_count) : 1,
      interruptionStatus: Boolean(s.interruption_status),
      interruptionReason: s.interruption_reason,
      abandonReason: s.abandon_reason,
      notes: s.notes,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    };
  }

  async getExecutionSessions(filters?: { taskId?: string; date?: string; status?: string }): Promise<ExecutionSession[]> {
    try {
      let query = this.client.from('execution_sessions').select('*');
      if (filters?.taskId) query = query.eq('task_id', filters.taskId);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.date) {
        query = query.gte('start_time', `${filters.date}T00:00:00.000Z`).lte('start_time', `${filters.date}T23:59:59.999Z`);
      }
      const { data, error } = await query.order('start_time', { ascending: false });

      if (error || !data) return this.fallback.getExecutionSessions(filters);
      return data.map(this.mapDbSessionToDomain);
    } catch {
      return this.fallback.getExecutionSessions(filters);
    }
  }

  async getSessionById(id: string): Promise<ExecutionSession | null> {
    try {
      const { data, error } = await this.client.from('execution_sessions').select('*').eq('id', id).single();
      if (error || !data) return this.fallback.getSessionById(id);
      return this.mapDbSessionToDomain(data);
    } catch {
      return this.fallback.getSessionById(id);
    }
  }

  async getActiveSession(): Promise<ExecutionSession | null> {
    try {
      const { data, error } = await this.client
        .from('execution_sessions')
        .select('*')
        .or('status.eq.active,status.eq.paused')
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return this.fallback.getActiveSession();
      return this.mapDbSessionToDomain(data);
    } catch {
      return this.fallback.getActiveSession();
    }
  }

  async createExecutionSession(sessionData: Omit<ExecutionSession, 'id' | 'createdAt'>): Promise<ExecutionSession> {
    try {
      const payload = {
        // Required by the execution_sessions schema and the user_id RLS policy.
        user_id: sessionData.userId,
        task_id: sessionData.taskId,
        time_block_id: sessionData.timeBlockId,
        start_time: sessionData.startTime,
        end_time: sessionData.endTime,
        duration_seconds: sessionData.durationSeconds || 0,
        status: sessionData.status || 'active',
        pauses: sessionData.pauses || [],
        check_ins: sessionData.checkIns || [],
        last_heartbeat_at: sessionData.lastHeartbeatAt || new Date().toISOString(),
        heartbeat_count: sessionData.heartbeatCount || 1,
        interruption_status: sessionData.interruptionStatus || false,
        interruption_reason: sessionData.interruptionReason,
        abandon_reason: sessionData.abandonReason,
        notes: sessionData.notes,
      };
      const { data, error } = await this.client.from('execution_sessions').insert([payload]).select().single();
      if (error || !data) {
        console.warn('Supabase createExecutionSession fallback:', error?.message || 'No row returned');
        return this.fallback.createExecutionSession(sessionData);
      }
      return this.mapDbSessionToDomain(data);
    } catch (error) {
      console.warn('Supabase createExecutionSession failed; using local storage:', error);
      return this.fallback.createExecutionSession(sessionData);
    }
  }

  async updateExecutionSession(id: string, updates: Partial<ExecutionSession>): Promise<ExecutionSession> {
    try {
      const payload: Record<string, unknown> = {};
      if (updates.timeBlockId !== undefined) payload.time_block_id = updates.timeBlockId;
      if (updates.endTime !== undefined) payload.end_time = updates.endTime;
      if (updates.durationSeconds !== undefined) payload.duration_seconds = updates.durationSeconds;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.pauses !== undefined) payload.pauses = updates.pauses;
      if (updates.checkIns !== undefined) payload.check_ins = updates.checkIns;
      if (updates.lastHeartbeatAt !== undefined) payload.last_heartbeat_at = updates.lastHeartbeatAt;
      if (updates.heartbeatCount !== undefined) payload.heartbeat_count = updates.heartbeatCount;
      if (updates.interruptionStatus !== undefined) payload.interruption_status = updates.interruptionStatus;
      if (updates.interruptionReason !== undefined) payload.interruption_reason = updates.interruptionReason;
      if (updates.abandonReason !== undefined) payload.abandon_reason = updates.abandonReason;
      if (updates.notes !== undefined) payload.notes = updates.notes;

      const { data, error } = await this.client.from('execution_sessions').update(payload).eq('id', id).select().single();
      if (error || !data) return this.fallback.updateExecutionSession(id, updates);
      return this.mapDbSessionToDomain(data);
    } catch {
      return this.fallback.updateExecutionSession(id, updates);
    }
  }

  async deleteExecutionSession(id: string): Promise<boolean> {
    try {
      const { error } = await this.client.from('execution_sessions').delete().eq('id', id);
      if (error) return this.fallback.deleteExecutionSession(id);
      return true;
    } catch {
      return this.fallback.deleteExecutionSession(id);
    }
  }

  // ============================================================================
  // 8. INBOX / DISTRACTIONS
  // ============================================================================
  async getInboxItems(status?: InboxItemStatus): Promise<InboxItem[]> {
    try {
      let query = this.client.from('inbox_items').select('*');
      if (status) query = query.eq('status', status);
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error || !data) return this.fallback.getInboxItems(status);
      return data.map(this.mapDbInboxToDomain);
    } catch {
      return this.fallback.getInboxItems(status);
    }
  }

  async createInboxItem(itemData: Omit<InboxItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InboxItem> {
    try {
      const payload = {
        title: itemData.title,
        description: itemData.description,
        source: itemData.source || 'thought',
        status: itemData.status || 'captured',
      };
      const { data, error } = await this.client.from('inbox_items').insert([payload]).select().single();
      if (error || !data) return this.fallback.createInboxItem(itemData);
      return this.mapDbInboxToDomain(data);
    } catch {
      return this.fallback.createInboxItem(itemData);
    }
  }

  async updateInboxItem(id: string, updates: Partial<InboxItem>): Promise<InboxItem> {
    try {
      const payload: Record<string, unknown> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.source !== undefined) payload.source = updates.source;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.convertedToTaskId !== undefined) payload.converted_to_task_id = updates.convertedToTaskId;
      if (updates.convertedAt !== undefined) payload.converted_at = updates.convertedAt;

      const { data, error } = await this.client.from('inbox_items').update(payload).eq('id', id).select().single();
      if (error || !data) return this.fallback.updateInboxItem(id, updates);
      return this.mapDbInboxToDomain(data);
    } catch {
      return this.fallback.updateInboxItem(id, updates);
    }
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
    try {
      const { error } = await this.client.from('inbox_items').delete().eq('id', id);
      if (error) return this.fallback.deleteInboxItem(id);
      return true;
    } catch {
      return this.fallback.deleteInboxItem(id);
    }
  }

  // ============================================================================
  // 9. DAILY ACCOUNTABILITY RECORDS
  // ============================================================================
  private mapDbAccountabilityToDomain(data: any): DailyAccountabilityRecord {
    return {
      id: data.id,
      userId: data.user_id,
      date: data.date,
      plannedTasks: Number(data.planned_tasks || 0),
      completedTasks: Number(data.completed_tasks || 0),
      postponedTasks: Number(data.postponed_tasks || 0),
      abandonedTasks: Number(data.abandoned_tasks || 0),
      blockedTasks: Number(data.blocked_tasks || 0),
      notStartedTasks: Number(data.not_started_tasks || 0),
      partiallyCompletedTasks: Number(data.partially_completed_tasks || 0),
      plannedMinutes: Number(data.planned_minutes || 0),
      actualMinutes: Number(data.actual_minutes || 0),
      interruptionCount: Number(data.interruption_count || data.interruptions || 0),
      totalPauseMinutes: Number(data.total_pause_minutes || 0),
      executionRate: Number(data.execution_rate || 0),
      timeExecutionRatio: Number(data.time_execution_ratio || 0),
      reconciledCommitments: Array.isArray(data.reconciled_commitments) ? data.reconciled_commitments : [],
      externalBlockers: Array.isArray(data.external_blockers) ? data.external_blockers : [],
      concreteOutputs: Array.isArray(data.concrete_outputs) ? data.concrete_outputs : [],
      notes: data.notes || '',
      isFinalized: Boolean(data.is_finalized),
      finalizedAt: data.finalized_at || undefined,
      generatedAt: data.generated_at || data.created_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async getAccountabilityRecord(date: string): Promise<DailyAccountabilityRecord | null> {
    try {
      const { data, error } = await this.client.from('accountability_records').select('*').eq('date', date).single();
      if (error || !data) return this.fallback.getAccountabilityRecord(date);
      return this.mapDbAccountabilityToDomain(data);
    } catch {
      return this.fallback.getAccountabilityRecord(date);
    }
  }

  async getAccountabilityRecords(range?: { startDate?: string; endDate?: string }): Promise<DailyAccountabilityRecord[]> {
    try {
      let query = this.client.from('accountability_records').select('*');
      if (range?.startDate) {
        query = query.gte('date', range.startDate);
      }
      if (range?.endDate) {
        query = query.lte('date', range.endDate);
      }
      const { data, error } = await query.order('date', { ascending: false });
      if (error || !data) return this.fallback.getAccountabilityRecords(range);
      return data.map(item => this.mapDbAccountabilityToDomain(item));
    } catch {
      return this.fallback.getAccountabilityRecords(range);
    }
  }

  async saveAccountabilityRecord(record: Omit<DailyAccountabilityRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<DailyAccountabilityRecord> {
    try {
      const payload = {
        date: record.date,
        planned_tasks: record.plannedTasks,
        completed_tasks: record.completedTasks,
        postponed_tasks: record.postponedTasks,
        abandoned_tasks: record.abandonedTasks,
        blocked_tasks: record.blockedTasks,
        not_started_tasks: record.notStartedTasks,
        partially_completed_tasks: record.partiallyCompletedTasks,
        planned_minutes: record.plannedMinutes,
        actual_minutes: record.actualMinutes,
        interruption_count: record.interruptionCount,
        total_pause_minutes: record.totalPauseMinutes,
        execution_rate: record.executionRate,
        time_execution_ratio: record.timeExecutionRatio,
        reconciled_commitments: record.reconciledCommitments || [],
        external_blockers: record.externalBlockers || [],
        concrete_outputs: record.concreteOutputs || [],
        notes: record.notes,
        is_finalized: record.isFinalized || false,
        finalized_at: record.finalizedAt,
        generated_at: record.generatedAt || new Date().toISOString(),
      };
      const { data, error } = await this.client
        .from('accountability_records')
        .upsert([payload], { onConflict: 'user_id, date' })
        .select()
        .single();

      if (error || !data) return this.fallback.saveAccountabilityRecord(record);
      return this.mapDbAccountabilityToDomain(data);
    } catch {
      return this.fallback.saveAccountabilityRecord(record);
    }
  }

  async finalizeAccountabilityRecord(date: string, recordUpdates: Partial<DailyAccountabilityRecord>): Promise<DailyAccountabilityRecord> {
    try {
      const payload: Record<string, any> = {
        is_finalized: true,
        finalized_at: new Date().toISOString(),
      };
      if (recordUpdates.notes !== undefined) payload.notes = recordUpdates.notes;
      if (recordUpdates.reconciledCommitments !== undefined) payload.reconciled_commitments = recordUpdates.reconciledCommitments;
      if (recordUpdates.externalBlockers !== undefined) payload.external_blockers = recordUpdates.externalBlockers;
      if (recordUpdates.concreteOutputs !== undefined) payload.concrete_outputs = recordUpdates.concreteOutputs;
      if (recordUpdates.executionRate !== undefined) payload.execution_rate = recordUpdates.executionRate;
      if (recordUpdates.timeExecutionRatio !== undefined) payload.time_execution_ratio = recordUpdates.timeExecutionRatio;

      const { data, error } = await this.client
        .from('accountability_records')
        .update(payload)
        .eq('date', date)
        .select()
        .single();

      if (error || !data) return this.fallback.finalizeAccountabilityRecord(date, recordUpdates);
      return this.mapDbAccountabilityToDomain(data);
    } catch {
      return this.fallback.finalizeAccountabilityRecord(date, recordUpdates);
    }
  }

  async reopenAccountabilityRecord(date: string): Promise<DailyAccountabilityRecord> {
    try {
      const payload = {
        is_finalized: false,
      };
      const { data, error } = await this.client
        .from('accountability_records')
        .update(payload)
        .eq('date', date)
        .select()
        .single();

      if (error || !data) return this.fallback.reopenAccountabilityRecord(date);
      return this.mapDbAccountabilityToDomain(data);
    } catch {
      return this.fallback.reopenAccountabilityRecord(date);
    }
  }

  // ============================================================================
  // 10. COMMITMENTS
  // ============================================================================
  async getCommitments(date?: string): Promise<Commitment[]> {
    try {
      let q = this.client.from('commitments').select('*');
      if (date) q = q.eq('date', date);
      const { data, error } = await q.order('created_at', { ascending: true });
      if (error || !data) return this.fallback.getCommitments(date);
      return data.map(c => ({
        id: c.id,
        userId: c.user_id,
        title: c.title,
        description: c.description,
        date: c.date,
        timeWindow: c.time_window,
        category: c.category,
        status: c.status,
        isApprovedByNick: c.is_approved_by_nick,
        approvedAt: c.approved_at,
        impactLevel: c.impact_level,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
    } catch {
      return this.fallback.getCommitments(date);
    }
  }

  async createCommitment(commitment: Omit<Commitment, 'id'>): Promise<Commitment> {
    try {
      const payload = {
        title: commitment.title,
        description: commitment.description,
        date: commitment.date,
        time_window: commitment.timeWindow,
        category: commitment.category,
        status: commitment.status,
        is_approved_by_nick: commitment.isApprovedByNick,
        approved_at: commitment.approvedAt,
        impact_level: commitment.impactLevel,
      };
      const { data, error } = await this.client.from('commitments').insert([payload]).select().single();
      if (error || !data) return this.fallback.createCommitment(commitment);
      return {
        id: data.id,
        ...commitment,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return this.fallback.createCommitment(commitment);
    }
  }

  async updateCommitment(id: string, updates: Partial<Commitment>): Promise<Commitment> {
    try {
      const payload: Record<string, unknown> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.isApprovedByNick !== undefined) payload.is_approved_by_nick = updates.isApprovedByNick;
      if (updates.approvedAt !== undefined) payload.approved_at = updates.approvedAt;
      if (updates.impactLevel !== undefined) payload.impact_level = updates.impactLevel;
      if (updates.timeWindow !== undefined) payload.time_window = updates.timeWindow;

      const { data, error } = await this.client.from('commitments').update(payload).eq('id', id).select().single();
      if (error || !data) return this.fallback.updateCommitment(id, updates);
      return {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        description: data.description,
        date: data.date,
        timeWindow: data.time_window,
        category: data.category,
        status: data.status,
        isApprovedByNick: data.is_approved_by_nick,
        approvedAt: data.approved_at,
        impactLevel: data.impact_level,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return this.fallback.updateCommitment(id, updates);
    }
  }

  async deleteCommitment(id: string): Promise<boolean> {
    try {
      const { error } = await this.client.from('commitments').delete().eq('id', id);
      if (error) return this.fallback.deleteCommitment(id);
      return true;
    } catch {
      return this.fallback.deleteCommitment(id);
    }
  }

  // ============================================================================
  // USER PROFILE
  // ============================================================================
  async getUserProfile(): Promise<UserProfile> {
    try {
      const { data, error } = await this.client.from('profiles').select('*').single();
      if (error || !data) return this.fallback.getUserProfile();
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        timezone: data.timezone,
        workingHoursStart: data.working_hours_start,
        workingHoursEnd: data.working_hours_end,
        themePreference: data.theme_preference,
        strictAccountabilityMode: data.strict_accountability_mode,
        activeFocusTaskId: data.active_focus_task_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return this.fallback.getUserProfile();
    }
  }

  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.timezone !== undefined) payload.timezone = updates.timezone;
      if (updates.workingHoursStart !== undefined) payload.working_hours_start = updates.workingHoursStart;
      if (updates.workingHoursEnd !== undefined) payload.working_hours_end = updates.workingHoursEnd;
      if (updates.themePreference !== undefined) payload.theme_preference = updates.themePreference;
      if (updates.strictAccountabilityMode !== undefined) payload.strict_accountability_mode = updates.strictAccountabilityMode;
      if (updates.activeFocusTaskId !== undefined) payload.active_focus_task_id = updates.activeFocusTaskId;

      const { data, error } = await this.client.from('profiles').update(payload).select().single();
      if (error || !data) return this.fallback.updateUserProfile(updates);
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        timezone: data.timezone,
        workingHoursStart: data.working_hours_start,
        workingHoursEnd: data.working_hours_end,
        themePreference: data.theme_preference,
        strictAccountabilityMode: data.strict_accountability_mode,
        activeFocusTaskId: data.active_focus_task_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return this.fallback.updateUserProfile(updates);
    }
  }

  // ============================================================================
  // METRICS (Planned vs Actual Calculation)
  // ============================================================================
  async getExecutionMetrics(date: string): Promise<ExecutionMetrics> {
    return this.fallback.getExecutionMetrics(date);
  }

  // ============================================================================
  // DOMAIN MAPPER HELPERS
  // ============================================================================
  private mapDbLifeAreaToDomain(row: Record<string, unknown>): LifeArea {
    return {
      id: String(row.id),
      userId: row.user_id ? String(row.user_id) : undefined,
      name: String(row.name),
      slug: String(row.slug),
      description: row.description ? String(row.description) : undefined,
      icon: row.icon ? String(row.icon) : undefined,
      color: String(row.color || '#f59e0b'),
      sortOrder: Number(row.sort_order || 0),
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString()),
    };
  }

  private mapDbGoalToDomain(row: Record<string, unknown>): Goal {
    return {
      id: String(row.id),
      userId: row.user_id ? String(row.user_id) : undefined,
      lifeAreaId: row.life_area_id ? String(row.life_area_id) : undefined,
      title: String(row.title),
      description: row.description ? String(row.description) : undefined,
      category: row.category as Goal['category'],
      targetValue: Number(row.target_value || 100),
      currentValue: Number(row.current_value || 0),
      metricUnit: String(row.metric_unit || '%'),
      deadline: String(row.deadline),
      status: row.status as Goal['status'],
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString()),
    };
  }

  private mapDbProjectToDomain(row: Record<string, unknown>): Project {
    return {
      id: String(row.id),
      userId: row.user_id ? String(row.user_id) : undefined,
      goalId: row.goal_id ? String(row.goal_id) : undefined,
      lifeAreaId: row.life_area_id ? String(row.life_area_id) : undefined,
      name: String(row.name),
      code: String(row.code),
      description: row.description ? String(row.description) : undefined,
      status: row.status as Project['status'],
      priority: row.priority as Project['priority'],
      color: String(row.color || '#3b82f6'),
      deadline: row.deadline ? String(row.deadline) : undefined,
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString()),
    };
  }

  private mapDbTaskToDomain(row: Record<string, unknown>): Task {
    return {
      id: String(row.id),
      userId: row.user_id ? String(row.user_id) : undefined,
      title: String(row.title),
      description: row.description ? String(row.description) : undefined,
      status: row.status as Task['status'],
      priority: row.priority as Task['priority'],
      commitmentLevel: (row.commitment_level || 'flexible') as Task['commitmentLevel'],
      estimatedMinutes: Number(row.estimated_duration || row.estimated_minutes || 0),
      actualMinutes: Number(row.actual_duration || row.actual_minutes || 0),
      dueDate: row.due_date ? String(row.due_date) : undefined,
      scheduledDate: row.scheduled_date ? String(row.scheduled_date) : undefined,
      scheduledStartTime: row.scheduled_start ? String(row.scheduled_start) : (row.scheduled_start_time ? String(row.scheduled_start_time) : undefined),
      scheduledEndTime: row.scheduled_end ? String(row.scheduled_end) : (row.scheduled_end_time ? String(row.scheduled_end_time) : undefined),
      projectId: row.project_id ? String(row.project_id) : undefined,
      goalId: row.goal_id ? String(row.goal_id) : undefined,
      lifeAreaId: row.life_area_id ? String(row.life_area_id) : undefined,
      tags: Array.isArray(row.tags) ? row.tags : [],
      checklist: Array.isArray(row.checklist) ? row.checklist : [],
      notes: row.notes ? String(row.notes) : undefined,
      blockerReason: row.blocker_reason ? String(row.blocker_reason) : undefined,
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString()),
      startedAt: row.started_at ? String(row.started_at) : undefined,
      completedAt: row.completed_at ? String(row.completed_at) : undefined,
    };
  }

  private mapDbTimeBlockToDomain(row: Record<string, unknown>): TimeBlock {
    return {
      id: String(row.id),
      userId: row.user_id ? String(row.user_id) : undefined,
      dailyPlanId: String(row.daily_plan_id),
      taskId: row.task_id ? String(row.task_id) : undefined,
      title: String(row.title),
      blockType: row.block_type as TimeBlock['blockType'],
      startTime: String(row.start_time),
      endTime: String(row.end_time),
      status: row.status as TimeBlock['status'],
      actualStart: row.actual_start ? String(row.actual_start) : undefined,
      actualEnd: row.actual_end ? String(row.actual_end) : undefined,
      notes: row.notes ? String(row.notes) : undefined,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  private mapDbInboxToDomain(row: Record<string, unknown>): InboxItem {
    return {
      id: String(row.id),
      userId: row.user_id ? String(row.user_id) : undefined,
      title: String(row.title),
      description: row.description ? String(row.description) : undefined,
      source: row.source ? String(row.source) : 'thought',
      status: row.status as InboxItem['status'],
      convertedToTaskId: row.converted_to_task_id ? String(row.converted_to_task_id) : undefined,
      convertedAt: row.converted_at ? String(row.converted_at) : undefined,
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString()),
    };
  }

  // ============================================================================
  // AI PROPOSALS (delegated to fallback localStorage since they are session audit logs)
  // ============================================================================
  async getAiProposals(): Promise<AiProposal[]> {
    return this.fallback.getAiProposals();
  }

  async createAiProposal(proposal: Omit<AiProposal, 'id' | 'createdAt'>): Promise<AiProposal> {
    return this.fallback.createAiProposal(proposal);
  }

  async updateAiProposal(id: string, updates: Partial<AiProposal>): Promise<AiProposal> {
    return this.fallback.updateAiProposal(id, updates);
  }

  // ============================================================================
  // FOCUS GUARD SETTINGS & AGENT HEARTBEATS
  // ============================================================================
  async getFocusGuardSettings(): Promise<FocusGuardSettings> {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return this.fallback.getFocusGuardSettings();

      const { data, error } = await this.client
        .from('focus_guard_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) return this.fallback.getFocusGuardSettings();

      return {
        id: data.id,
        userId: data.user_id,
        enabled: data.enabled ?? true,
        mode: data.mode || 'blacklist',
        allowedDomains: Array.isArray(data.allowed_domains) ? data.allowed_domains : JSON.parse(data.allowed_domains || '[]'),
        blockedDomains: Array.isArray(data.blocked_domains) ? data.blocked_domains : JSON.parse(data.blocked_domains || '[]'),
        blockedApps: Array.isArray(data.blocked_apps) ? data.blocked_apps : JSON.parse(data.blocked_apps || '[]'),
        unknownSitePolicy: data.unknown_site_policy || 'allow',
        updatedAt: data.updated_at,
      };
    } catch {
      return this.fallback.getFocusGuardSettings();
    }
  }

  async saveFocusGuardSettings(updates: Partial<FocusGuardSettings>): Promise<FocusGuardSettings> {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return this.fallback.saveFocusGuardSettings(updates);

      const current = await this.getFocusGuardSettings();
      const updated: FocusGuardSettings = { ...current, ...updates, updatedAt: new Date().toISOString() };

      const payload = {
        user_id: user.id,
        enabled: updated.enabled,
        mode: updated.mode,
        allowed_domains: updated.allowedDomains,
        blocked_domains: updated.blockedDomains,
        blocked_apps: updated.blockedApps,
        unknown_site_policy: updated.unknownSitePolicy,
        updated_at: updated.updatedAt,
      };

      const { data, error } = await this.client
        .from('focus_guard_settings')
        .upsert(payload, { onConflict: 'user_id' })
        .select('*')
        .single();

      if (error || !data) {
        console.warn('Supabase saveFocusGuardSettings failed, using fallback:', error);
        return this.fallback.saveFocusGuardSettings(updates);
      }

      // Sync fallback
      await this.fallback.saveFocusGuardSettings(updated);

      return {
        id: data.id,
        userId: data.user_id,
        enabled: data.enabled,
        mode: data.mode,
        allowedDomains: Array.isArray(data.allowed_domains) ? data.allowed_domains : [],
        blockedDomains: Array.isArray(data.blocked_domains) ? data.blocked_domains : [],
        blockedApps: Array.isArray(data.blocked_apps) ? data.blocked_apps : [],
        unknownSitePolicy: data.unknown_site_policy,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      console.warn('Error saving Focus Guard settings in Supabase:', err);
      return this.fallback.saveFocusGuardSettings(updates);
    }
  }

  async recordAgentHeartbeat(heartbeat: FocusGuardAgentHeartbeat): Promise<FocusGuardAgentHeartbeat> {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return this.fallback.recordAgentHeartbeat(heartbeat);

      const payload = {
        user_id: user.id,
        client_id: heartbeat.clientId,
        client_type: heartbeat.clientType,
        version: heartbeat.version || '1.0.0',
        status: heartbeat.status || 'connected',
        active_session_id: heartbeat.activeSessionId || null,
        blocked_enforcements_count: heartbeat.blockedEnforcementsCount || 0,
        last_action_log: heartbeat.lastActionLog || null,
        error_message: heartbeat.errorMessage || null,
        last_heartbeat_at: new Date().toISOString(),
      };

      const { data, error } = await this.client
        .from('focus_guard_agent_heartbeats')
        .upsert(payload, { onConflict: 'user_id,client_id' })
        .select('*')
        .single();

      await this.fallback.recordAgentHeartbeat(heartbeat);

      if (error || !data) return this.fallback.recordAgentHeartbeat(heartbeat);

      return {
        id: data.id,
        userId: data.user_id,
        clientId: data.client_id,
        clientType: data.client_type,
        version: data.version,
        status: data.status,
        activeSessionId: data.active_session_id,
        blockedEnforcementsCount: data.blocked_enforcements_count,
        lastActionLog: data.last_action_log,
        errorMessage: data.error_message,
        lastHeartbeatAt: data.last_heartbeat_at,
      };
    } catch {
      return this.fallback.recordAgentHeartbeat(heartbeat);
    }
  }

  async getAgentHeartbeats(): Promise<FocusGuardAgentHeartbeat[]> {
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return this.fallback.getAgentHeartbeats();

      const { data, error } = await this.client
        .from('focus_guard_agent_heartbeats')
        .select('*')
        .eq('user_id', user.id);

      if (error || !data) return this.fallback.getAgentHeartbeats();

      const cutoff = Date.now() - 45000;
      return data.map(d => {
        const last = new Date(d.last_heartbeat_at).getTime();
        const isDisconnected = isNaN(last) || last < cutoff;
        return {
          id: d.id,
          userId: d.user_id,
          clientId: d.client_id,
          clientType: d.client_type,
          version: d.version,
          status: isDisconnected ? 'disconnected' : d.status,
          activeSessionId: d.active_session_id,
          blockedEnforcementsCount: d.blocked_enforcements_count,
          lastActionLog: d.last_action_log,
          errorMessage: d.error_message,
          lastHeartbeatAt: d.last_heartbeat_at,
        };
      });
    } catch {
      return this.fallback.getAgentHeartbeats();
    }
  }
}
