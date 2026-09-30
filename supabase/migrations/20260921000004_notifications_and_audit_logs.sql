-- ==============================================================================
-- NICK OS - Notifications, Push Devices & Background Audit Logs Migration
-- Supports multi-device Web Push, stateless server architectures & scheduled cron auditing
-- ==============================================================================

-- 1. NOTIFICATIONS TABLE (Durable persistence for user notifications)
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  title text not null,
  body text not null,
  priority text not null default 'normal' check (priority in ('critical', 'high', 'normal', 'low')),
  status text not null default 'pending' check (status in ('pending', 'scheduled', 'sent', 'delivered', 'read', 'cancelled')),
  scheduled_for timestamp with time zone not null,
  delivered_at timestamp with time zone,
  read_at timestamp with time zone,
  idempotency_key text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. PUSH SUBSCRIPTIONS TABLE (Multi-device Web Push device registry)
create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  device_name text,
  user_agent text,
  is_active boolean not null default true,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. BACKGROUND JOB AUDIT LOGS (Operational telemetry for server-side tasks)
create table if not exists public.background_job_logs (
  id uuid primary key default uuid_generate_v4(),
  job_name text not null,
  status text not null check (status in ('running', 'completed', 'failed')),
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  duration_ms integer,
  records_processed integer not null default 0,
  error_message text,
  metadata jsonb default '{}'::jsonb
);

-- 4. SERVER IDEMPOTENCY KEYS (Deduplication across server instances)
create table if not exists public.idempotency_keys (
  key text primary key,
  source text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone not null
);

-- Triggers for updated_at
drop trigger if exists set_notifications_updated_at on public.notifications;
create trigger set_notifications_updated_at before update on public.notifications for each row execute procedure public.handle_updated_at();

drop trigger if exists set_push_subscriptions_updated_at on public.push_subscriptions;
create trigger set_push_subscriptions_updated_at before update on public.push_subscriptions for each row execute procedure public.handle_updated_at();

-- Enable Row Level Security (RLS)
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.background_job_logs enable row level security;
alter table public.idempotency_keys enable row level security;

-- RLS Policies
create policy "Users manage their own notifications" on public.notifications for all using (auth.uid() = user_id);
create policy "Users manage their own push subscriptions" on public.push_subscriptions for all using (auth.uid() = user_id);
-- Service role only for background job logs and idempotency keys; allow read for authenticated users
create policy "Authenticated users can read background job logs" on public.background_job_logs for select using (auth.role() = 'authenticated');
create policy "Service role manages idempotency keys" on public.idempotency_keys for all using (true);

-- Performance Indexes
create index if not exists idx_notifications_user_status on public.notifications (user_id, status);
create index if not exists idx_notifications_user_scheduled on public.notifications (user_id, scheduled_for);
create index if not exists idx_notifications_idempotency on public.notifications (idempotency_key);
create index if not exists idx_push_subscriptions_user on public.push_subscriptions (user_id, is_active);
create index if not exists idx_background_job_logs_name_status on public.background_job_logs (job_name, status, started_at desc);
create index if not exists idx_idempotency_keys_expires on public.idempotency_keys (expires_at);
