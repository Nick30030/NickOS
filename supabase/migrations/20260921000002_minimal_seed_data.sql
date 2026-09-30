-- ==============================================================================
-- NICK OS - Minimal Strategic Life Areas & Default Setup Seed
-- Note: No fake productivity history or fake metrics are populated.
-- ==============================================================================

-- Function to seed baseline strategic life areas for a newly registered user profile
create or replace function public.seed_default_life_areas_for_user(target_user_id uuid)
returns void as $$
begin
  insert into public.life_areas (user_id, name, slug, description, icon, color, sort_order)
  values
    (target_user_id, 'Deep Work & Engineering', 'deep-work', 'Core architecture, software engineering, and high-leverage building', 'code', '#f59e0b', 1),
    (target_user_id, 'Health & Vitality', 'health', 'Physical training, recovery, sleep hygiene, and nutrition', 'activity', '#10b981', 2),
    (target_user_id, 'Mind & Discipline', 'mind', 'Deliberate focus, review protocols, and cognitive performance', 'brain', '#3b82f6', 3),
    (target_user_id, 'Operations & Life', 'operations', 'Administrative responsibilities, personal logistics, and finances', 'settings', '#8b5cf6', 4)
  on conflict (user_id, slug) do nothing;
end;
$$ language plpgsql security definer;

-- Trigger to automatically seed default life areas when a new profile is created
create or replace function public.on_profile_created_seed_life_areas()
returns trigger as $$
begin
  perform public.seed_default_life_areas_for_user(new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trigger_seed_life_areas on public.profiles;
create trigger trigger_seed_life_areas
after insert on public.profiles
for each row execute procedure public.on_profile_created_seed_life_areas();
