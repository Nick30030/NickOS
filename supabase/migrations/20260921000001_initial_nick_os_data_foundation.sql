-- ==============================================================================
-- NICK OS - Supabase PostgreSQL Production Schema & Data Foundation Migration
-- Designed for High-Accountability Personal Execution Operating System
-- ==============================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- ==============================================================================
-- CORE DOMAIN TABLES
-- ==============================================================================

-- 1. PROFILES (Nick's user profile & preferences)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null default 'Nick',
  timezone text not null default 'Europe/London',
  working_hours_start text not null default '08:30',
  working_hours_end text not null default '18:30',
  theme_preference text not null default 'dark' check (theme_preference in ('dark', 'light', 'system')),
  strict_accountability_mode boolean not null default true,
  active_focus_task_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. LIFE AREAS (Strategic life domains: Health, Work, Mind, Personal)
create table if not exists public.life_areas (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  slug text not null,
  description text,
  icon text,
  color text not null default '#f59e0b',
  sort_order integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, slug)
);

-- 3. GOALS (Strategic outcomes and quarterly/annual milestones)
create table if not exists public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  life_area_id uuid references public.life_areas(id) on delete set null,
  title text not null,
  description text,
  category text not null check (category in ('quarterly', 'annual', 'habit', 'operational')),
  target_value numeric not null default 100,
  current_value numeric not null default 0,
  metric_unit text not null default '%',
  deadline date not null,
  status text not null default 'on_track' check (status in ('on_track', 'at_risk', 'behind', 'achieved')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. PROJECTS (Active execution initiatives)
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  goal_id uuid references public.goals(id) on delete set null,
  life_area_id uuid references public.life_areas(id) on delete set null,
  name text not null,
  code text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'on_hold', 'completed', 'archived')),
  priority text not null default 'medium' check (priority in ('critical', 'high', 'medium', 'low')),
  color text not null default '#3b82f6',
  deadline date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, code)
);

-- 5. TASKS (Actionable execution units)
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  life_area_id uuid references public.life_areas(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'planned' check (status in ('inbox', 'planned', 'in_progress', 'paused', 'completed', 'cancelled', 'postponed', 'todo', 'backlog')),
  priority text not null default 'medium' check (priority in ('critical', 'high', 'medium', 'low')),
  commitment_level text not null default 'flexible' check (commitment_level in ('hard_commitment', 'flexible', 'stretch')),
  estimated_duration integer not null default 30, -- minutes
  actual_duration integer not null default 0,    -- minutes
  due_date date,
  scheduled_date date,
  scheduled_start text,
  scheduled_end text,
  tags text[] default array[]::text[],
  checklist jsonb default '[]'::jsonb,
  notes text,
  blocker_reason text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. DAILY PLANS (Nick's confirmed day programs & constraints)
create table if not exists public.daily_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  planned_start text default '08:30',
  planned_end text default '18:30',
  sleep_rest_constraints text,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'active', 'completed')),
  generated_by_ai boolean not null default false,
  approved_by_user boolean not null default false,
  focus_goal_today text,
  energy_target text not null default 'steady' check (energy_target in ('maximum', 'steady', 'recovery')),
  execution_score integer,
  total_planned_minutes integer not null default 0,
  total_actual_minutes integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, date)
);

-- 7. PLANNED TIME BLOCKS (Structured execution blocks inside a daily plan)
create table if not exists public.time_blocks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  daily_plan_id uuid references public.daily_plans(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  block_type text not null check (block_type in ('spirituality', 'learning', 'deep_work', 'admin', 'exercise', 'rest', 'social', 'personal', 'other')),
  start_time text not null, -- e.g. "09:00"
  end_time text not null,   -- e.g. "10:30"
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'skipped', 'deviated')),
  actual_start text,
  actual_end text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. TASK EXECUTION SESSIONS (Granular stopwatch & focus sessions on tasks)
create table if not exists public.execution_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete cascade not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  duration_seconds integer not null default 0,
  interruption_status boolean not null default false,
  interruption_reason text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. INBOX / DISTRACTIONS (Fast capture inbox for spontaneous items & thoughts)
create table if not exists public.inbox_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  source text default 'thought', -- 'thought', 'interruption', 'slack', 'email', 'meeting'
  status text not null default 'captured' check (status in ('captured', 'processed', 'converted_to_task', 'dismissed')),
  converted_to_task_id uuid references public.tasks(id) on delete set null,
  converted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. DAILY ACCOUNTABILITY RECORDS (Planned vs Actual reconciliation)
create table if not exists public.accountability_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  execution_rate numeric not null default 0,
  planned_minutes integer not null default 0,
  actual_minutes integer not null default 0,
  completed_commitments integer not null default 0,
  missed_commitments integer not null default 0,
  postponed_commitments integer not null default 0,
  interruptions integer not null default 0,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, date)
);

-- 11. COMMITMENTS (Daily non-negotiable contract items requiring Nick's explicit decision)
create table if not exists public.commitments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  date date not null default current_date,
  time_window text,
  category text not null default 'deep_work' check (category in ('deep_work', 'meeting', 'health', 'review', 'operational')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'in_progress', 'fulfilled', 'breached')),
  is_approved_by_nick boolean not null default false,
  approved_at timestamp with time zone,
  impact_level text not null default 'high' check (impact_level in ('high', 'medium', 'low')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- AUTOMATIC TIMESTAMP UPDATE TRIGGER
-- ==============================================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute procedure public.handle_updated_at();

drop trigger if exists set_life_areas_updated_at on public.life_areas;
create trigger set_life_areas_updated_at before update on public.life_areas for each row execute procedure public.handle_updated_at();

drop trigger if exists set_goals_updated_at on public.goals;
create trigger set_goals_updated_at before update on public.goals for each row execute procedure public.handle_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at before update on public.projects for each row execute procedure public.handle_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at before update on public.tasks for each row execute procedure public.handle_updated_at();

drop trigger if exists set_daily_plans_updated_at on public.daily_plans;
create trigger set_daily_plans_updated_at before update on public.daily_plans for each row execute procedure public.handle_updated_at();

drop trigger if exists set_time_blocks_updated_at on public.time_blocks;
create trigger set_time_blocks_updated_at before update on public.time_blocks for each row execute procedure public.handle_updated_at();

drop trigger if exists set_inbox_items_updated_at on public.inbox_items;
create trigger set_inbox_items_updated_at before update on public.inbox_items for each row execute procedure public.handle_updated_at();

drop trigger if exists set_accountability_records_updated_at on public.accountability_records;
create trigger set_accountability_records_updated_at before update on public.accountability_records for each row execute procedure public.handle_updated_at();

drop trigger if exists set_commitments_updated_at on public.commitments;
create trigger set_commitments_updated_at before update on public.commitments for each row execute procedure public.handle_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.life_areas enable row level security;
alter table public.goals enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.daily_plans enable row level security;
alter table public.time_blocks enable row level security;
alter table public.execution_sessions enable row level security;
alter table public.inbox_items enable row level security;
alter table public.accountability_records enable row level security;
alter table public.commitments enable row level security;

-- Strict User Isolation Policies:
create policy "Users manage their own profile" on public.profiles for all using (auth.uid() = id);
create policy "Users manage their own life areas" on public.life_areas for all using (auth.uid() = user_id);
create policy "Users manage their own goals" on public.goals for all using (auth.uid() = user_id);
create policy "Users manage their own projects" on public.projects for all using (auth.uid() = user_id);
create policy "Users manage their own tasks" on public.tasks for all using (auth.uid() = user_id);
create policy "Users manage their own daily plans" on public.daily_plans for all using (auth.uid() = user_id);
create policy "Users manage their own time blocks" on public.time_blocks for all using (auth.uid() = user_id);
create policy "Users manage their own execution sessions" on public.execution_sessions for all using (auth.uid() = user_id);
create policy "Users manage their own inbox items" on public.inbox_items for all using (auth.uid() = user_id);
create policy "Users manage their own accountability records" on public.accountability_records for all using (auth.uid() = user_id);
create policy "Users manage their own commitments" on public.commitments for all using (auth.uid() = user_id);

-- ==============================================================================
-- PERFORMANCE INDEXES
-- ==============================================================================
create index if not exists idx_life_areas_user on public.life_areas (user_id, sort_order);
create index if not exists idx_goals_user on public.goals (user_id, status);
create index if not exists idx_goals_life_area on public.goals (life_area_id);
create index if not exists idx_projects_user on public.projects (user_id, status);
create index if not exists idx_projects_goal on public.projects (goal_id);
create index if not exists idx_projects_life_area on public.projects (life_area_id);
create index if not exists idx_tasks_user_date on public.tasks (user_id, scheduled_date);
create index if not exists idx_tasks_status on public.tasks (user_id, status);
create index if not exists idx_tasks_project on public.tasks (project_id);
create index if not exists idx_tasks_goal on public.tasks (goal_id);
create index if not exists idx_tasks_life_area on public.tasks (life_area_id);
create index if not exists idx_daily_plans_user_date on public.daily_plans (user_id, date);
create index if not exists idx_time_blocks_plan on public.time_blocks (daily_plan_id, start_time);
create index if not exists idx_time_blocks_task on public.time_blocks (task_id);
create index if not exists idx_execution_sessions_task on public.execution_sessions (task_id, start_time);
create index if not exists idx_inbox_items_user_status on public.inbox_items (user_id, status);
create index if not exists idx_accountability_user_date on public.accountability_records (user_id, date);
create index if not exists idx_commitments_user_date on public.commitments (user_id, date);
