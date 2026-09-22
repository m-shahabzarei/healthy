-- Healthy hosted adapter schema
--
-- Run this file in the Supabase SQL editor before enabling the hosted adapter.
-- It is intentionally safe to run more than once where practical. The public
-- client uses only the anon/publishable key; service_role must never be shipped
-- to the browser.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username = lower(username) and username ~ '^[a-z0-9_.-]{3,32}$'),
  display_name text not null check (char_length(display_name) between 1 and 50),
  unit text not null default 'kg' check (unit in ('kg', 'lb')),
  start_weight_kg numeric(6,2) check (start_weight_kg is null or start_weight_kg between 20 and 400),
  goal_weight_kg numeric(6,2) check (goal_weight_kg is null or goal_weight_kg between 20 and 400),
  start_date date not null default current_date,
  target_date date,
  feed_opt_in boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

create table if not exists public.weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recorded_on date not null,
  weight_kg numeric(6,2) not null check (weight_kg between 20 and 400),
  note text check (note is null or char_length(note) <= 120),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, recorded_on)
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  taken_on date not null,
  storage_path text not null unique,
  caption text check (caption is null or char_length(caption) <= 120),
  visibility text not null default 'private' check (visibility in ('private', 'feed')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('weight_loss', 'streak', 'goal_milestone', 'photo', 'milestone', 'custom')),
  occurred_on date not null,
  body text not null check (char_length(body) between 1 and 1000),
  title text check (title is null or char_length(title) <= 120),
  metric_value numeric(8,2),
  metric_label text check (metric_label is null or char_length(metric_label) <= 60),
  activity_key text,
  generated boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists posts_user_activity_key_idx
  on public.posts (user_id, activity_key);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('encourage', 'celebrate', 'fire')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (post_id, user_id)
);

create index if not exists weights_user_date_idx on public.weights (user_id, recorded_on desc);
create index if not exists photos_user_date_idx on public.photos (user_id, taken_on desc);
create index if not exists posts_feed_date_idx on public.posts (occurred_on desc, created_at desc);
create index if not exists reactions_post_idx on public.reactions (post_id);

-- Keep profile timestamps correct when a profile is edited.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Create a profile from Auth metadata. This avoids exposing auth.users through
-- the Data API and means email-confirmation signup still gets a profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_username text := lower(trim(coalesce(metadata->>'username', '')));
  fallback_username text := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  safe_username text := case
    when requested_username ~ '^[a-z0-9_.-]{3,32}$' then requested_username
    else fallback_username
  end;
  requested_display_name text := trim(coalesce(metadata->>'display_name', metadata->>'displayName', safe_username));
  raw_start text := metadata->>'start_weight_kg';
  raw_goal text := metadata->>'goal_weight_kg';
  raw_start_date text := metadata->>'start_date';
  raw_target_date text := metadata->>'target_date';
begin
  insert into public.profiles (
    id, username, display_name, unit, start_weight_kg, goal_weight_kg,
    start_date, target_date, feed_opt_in
  ) values (
    new.id,
    safe_username,
    left(case when requested_display_name = '' then safe_username else requested_display_name end, 50),
    case when metadata->>'unit' = 'lb' then 'lb' else 'kg' end,
    case when raw_start ~ '^[0-9]+([.][0-9]+)?$' then raw_start::numeric else null end,
    case when raw_goal ~ '^[0-9]+([.][0-9]+)?$' then raw_goal::numeric else null end,
    case when raw_start_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raw_start_date::date else current_date end,
    case when raw_target_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raw_target_date::date else null end,
    coalesce(lower(metadata->>'feed_opt_in') in ('true', 't', '1', 'yes'), false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.weights enable row level security;
alter table public.photos enable row level security;
alter table public.posts enable row level security;
alter table public.reactions enable row level security;

-- Explicit grants keep the Data API surface narrow.
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.weights to authenticated;
grant select, insert, update, delete on public.photos to authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, update, delete on public.reactions to authenticated;
revoke all on public.profiles, public.weights, public.photos, public.posts, public.reactions from anon;

drop policy if exists profiles_read_owner_or_opted_in on public.profiles;
create policy profiles_read_owner_or_opted_in on public.profiles
for select to authenticated
using (id = (select auth.uid()) or feed_opt_in = true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (id = (select auth.uid()));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists weights_owner_only on public.weights;
create policy weights_owner_only on public.weights
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists photos_owner_or_feed on public.photos;
create policy photos_owner_or_feed on public.photos
for select to authenticated
using (
  user_id = (select auth.uid())
  or (
    visibility = 'feed'
    and exists (
      select 1 from public.profiles p
      where p.id = photos.user_id and p.feed_opt_in = true
    )
  )
);

drop policy if exists photos_owner_write on public.photos;
create policy photos_owner_write on public.photos
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists photos_owner_update on public.photos;
create policy photos_owner_update on public.photos
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists photos_owner_delete on public.photos;
create policy photos_owner_delete on public.photos
for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists posts_owner_or_feed on public.posts;
create policy posts_owner_or_feed on public.posts
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.profiles p
    where p.id = posts.user_id and p.feed_opt_in = true
  )
);

drop policy if exists posts_owner_insert on public.posts;
create policy posts_owner_insert on public.posts
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists posts_owner_update on public.posts;
create policy posts_owner_update on public.posts
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists posts_owner_delete on public.posts;
create policy posts_owner_delete on public.posts
for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists reactions_read_authenticated on public.reactions;
create policy reactions_read_authenticated on public.reactions
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.posts po
    join public.profiles p on p.id = po.user_id
    where po.id = reactions.post_id
      and (po.user_id = (select auth.uid()) or p.feed_opt_in = true)
  )
);

drop policy if exists reactions_owner_insert on public.reactions;
create policy reactions_owner_insert on public.reactions
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.posts po
    join public.profiles p on p.id = po.user_id
    where po.id = reactions.post_id
      and (po.user_id = (select auth.uid()) or p.feed_opt_in = true)
  )
);

drop policy if exists reactions_owner_update on public.reactions;
create policy reactions_owner_update on public.reactions
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists reactions_owner_delete on public.reactions;
create policy reactions_owner_delete on public.reactions
for delete to authenticated
using (user_id = (select auth.uid()));

-- Atomic reaction toggle used by the adapter. It is SECURITY INVOKER so all
-- table RLS policies still apply, and it never accepts a caller-supplied user id.
create or replace function public.toggle_reaction(p_post_id uuid, p_type text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  existing public.reactions%rowtype;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_type not in ('encourage', 'celebrate', 'fire') then
    raise exception using errcode = '22023', message = 'Invalid reaction type';
  end if;

  select * into existing
  from public.reactions
  where post_id = p_post_id and user_id = current_user_id;

  if existing.id is not null and existing.type = p_type then
    delete from public.reactions where id = existing.id;
    return jsonb_build_object('active', false, 'type', null, 'reaction_id', null);
  elsif existing.id is not null then
    update public.reactions
    set type = p_type, created_at = timezone('utc', now())
    where id = existing.id;
    return jsonb_build_object('active', true, 'type', p_type, 'reaction_id', existing.id, 'created_at', timezone('utc', now()));
  else
    insert into public.reactions (post_id, user_id, type)
    values (p_post_id, current_user_id, p_type)
    returning * into existing;
    return jsonb_build_object('active', true, 'type', existing.type, 'reaction_id', existing.id, 'created_at', existing.created_at);
  end if;
end;
$$;

revoke all on function public.toggle_reaction(uuid, text) from public;
grant execute on function public.toggle_reaction(uuid, text) to authenticated;

-- Private object storage. Paths must begin with the authenticated user's UUID.
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do update set public = false;

drop policy if exists progress_photos_insert_own_folder on storage.objects;
create policy progress_photos_insert_own_folder on storage.objects
for insert to authenticated
with check (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists progress_photos_select_own_or_feed on storage.objects;
create policy progress_photos_select_own_or_feed on storage.objects
for select to authenticated
using (
  bucket_id = 'progress-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from public.photos ph
      join public.profiles p on p.id = ph.user_id
      where ph.storage_path = name and ph.visibility = 'feed' and p.feed_opt_in = true
    )
  )
);

drop policy if exists progress_photos_update_own_folder on storage.objects;
create policy progress_photos_update_own_folder on storage.objects
for update to authenticated
using (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists progress_photos_delete_own_folder on storage.objects;
create policy progress_photos_delete_own_folder on storage.objects
for delete to authenticated
using (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
