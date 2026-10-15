-- ==============================================================================
-- NICK OS FOCUS GUARD - Supabase PostgreSQL Settings & Heartbeats Migration
-- ==============================================================================

-- 1. FOCUS GUARD SETTINGS TABLE
create table if not exists public.focus_guard_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  enabled boolean not null default true,
  mode text not null default 'blacklist' check (mode in ('blacklist', 'whitelist')),
  allowed_domains jsonb not null default '["github.com", "google.com", "stackoverflow.com", "docs.google.com"]'::jsonb,
  blocked_domains jsonb not null default '["youtube.com", "x.com", "twitter.com", "reddit.com", "facebook.com", "instagram.com", "tiktok.com"]'::jsonb,
  blocked_apps jsonb not null default '["Discord.exe", "Steam.exe", "Spotify.exe", "League of Legends.exe"]'::jsonb,
  unknown_site_policy text not null default 'allow' check (unknown_site_policy in ('allow', 'block', 'warn')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. AGENT & EXTENSION HEARTBEATS TABLE
create table if not exists public.focus_guard_agent_heartbeats (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  client_id text not null,
  client_type text not null check (client_type in ('browser_extension', 'windows_agent')),
  version text not null default '1.0.0',
  status text not null default 'connected' check (status in ('connected', 'enforcing', 'paused', 'error', 'disconnected')),
  active_session_id text,
  blocked_enforcements_count integer not null default 0,
  last_action_log text,
  error_message text,
  last_heartbeat_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, client_id)
);

-- Automatic handle_updated_at trigger for focus_guard_settings
drop trigger if exists set_focus_guard_settings_updated_at on public.focus_guard_settings;
create trigger set_focus_guard_settings_updated_at before update on public.focus_guard_settings
  for each row execute procedure public.handle_updated_at();

-- Enable Row Level Security (RLS)
alter table public.focus_guard_settings enable row level security;
alter table public.focus_guard_agent_heartbeats enable row level security;

-- Row Level Security Policies
create policy "Users manage their own focus guard settings"
  on public.focus_guard_settings for all
  using (auth.uid() = user_id);

create policy "Users manage their own agent heartbeats"
  on public.focus_guard_agent_heartbeats for all
  using (auth.uid() = user_id);

-- Performance Indexes
create index if not exists idx_focus_guard_settings_user on public.focus_guard_settings (user_id);
create index if not exists idx_focus_guard_agent_heartbeats_user on public.focus_guard_agent_heartbeats (user_id, client_type);
