-- Run once in Supabase SQL Editor so Profile prefs sync to the cloud.
alter table public.profiles
  add column if not exists preferences jsonb default '{}'::jsonb;
