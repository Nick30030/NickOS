-- ==============================================================================
-- NICK OS - Advanced Performance Indexes Migration
-- Optimized for high-throughput execution session tracking, analytics, and planning
-- ==============================================================================

-- 1. Active Focus Session Retrieval Index
create index if not exists idx_execution_sessions_user_status on public.execution_sessions (user_id, status);

-- 2. Historical Execution Sessions Analytics Index
create index if not exists idx_execution_sessions_user_start on public.execution_sessions (user_id, start_time desc);

-- 3. Filtered Task Priority Index
create index if not exists idx_tasks_user_priority_status on public.tasks (user_id, status, priority);

-- 4. Time Block Conflict & Range Index
create index if not exists idx_time_blocks_user_start on public.time_blocks (user_id, start_time);

-- 5. Goal Target Deadline Index
create index if not exists idx_goals_deadline on public.goals (user_id, deadline);
