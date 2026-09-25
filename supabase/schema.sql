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
  visibility text not null default 'private' check (visibility = 'private'),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('weight_loss', 'streak', 'goal_milestone', 'milestone', 'custom')),
  occurred_on date not null,
  body text not null check (char_length(body) between 1 and 1000),
  title text check (title is null or char_length(title) <= 120),
  metric_value numeric(8,2),
  metric_label text check (metric_label is null or char_length(metric_label) <= 60),
  activity_key text,
  generated boolean not null default false,
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

-- Generated activity is opt-in at the database function, never the default
-- for a browser-created post. ALTER also upgrades installations made from an
-- earlier version of this file.
alter table public.posts alter column generated set default false;

-- CREATE TABLE IF NOT EXISTS does not add new constraints to an existing
-- installation. Add the cross-column invariants explicitly and by name so
-- this migration remains safe to run again as the schema evolves.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_goal_below_start_check'
  ) then
    alter table public.profiles
      add constraint profiles_goal_below_start_check
      check (
        start_weight_kg is null
        or goal_weight_kg is null
        or goal_weight_kg < start_weight_kg
      ) not valid;
  end if;

  if not exists (
    select 1
    from public.profiles
    where start_weight_kg is not null
      and goal_weight_kg is not null
      and goal_weight_kg >= start_weight_kg
  ) then
    alter table public.profiles
      validate constraint profiles_goal_below_start_check;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_target_not_before_start_check'
  ) then
    alter table public.profiles
      add constraint profiles_target_not_before_start_check
      check (target_date is null or target_date >= start_date) not valid;
  end if;

  if not exists (
    select 1
    from public.profiles
    where target_date is not null and target_date < start_date
  ) then
    alter table public.profiles
      validate constraint profiles_target_not_before_start_check;
  end if;

end
$$;

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

  -- Day-one weight belongs to the same transaction as the Auth user and
  -- profile. The hosted client repeats this as an idempotent upsert, but a
  -- network interruption can no longer leave a half-created account.
  if raw_start ~ '^[0-9]+([.][0-9]+)?$'
    and raw_start::numeric between 20 and 400 then
    insert into public.weights (user_id, recorded_on, weight_kg)
    values (
      new.id,
      case
        when raw_start_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raw_start_date::date
        else current_date
      end,
      raw_start::numeric
    )
    on conflict (user_id, recorded_on) do update
    set weight_kg = excluded.weight_kg;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Rebuild every automatic feed event from canonical profile and weight data.
-- The function is deliberately not callable by browser roles: source
-- table triggers are the only writers of generated posts.
create or replace function public.rebuild_generated_posts(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  profile_row public.profiles%rowtype;
  activity record;
  supported_keys text[] := '{}'::text[];
begin
  if p_user_id is null then
    return;
  end if;

  -- Serialize rebuilds for one member. This prevents two concurrent source
  -- writes from reconciling against different snapshots and dropping an event.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select *
  into profile_row
  from public.profiles
  where id = p_user_id;

  if not found then
    delete from public.posts
    where user_id = p_user_id and generated = true;
    return;
  end if;

  for activity in
    with ordered_weights as (
      select
        w.id,
        w.recorded_on,
        w.weight_kg,
        w.created_at,
        lag(w.recorded_on) over weight_order as previous_on,
        lag(w.weight_kg) over weight_order as previous_weight_kg
      from public.weights w
      where w.user_id = p_user_id
      window weight_order as (order by w.recorded_on, w.created_at, w.id)
    ),
    grouped_weights as (
      select
        ow.*,
        sum(
          case when ow.previous_on = ow.recorded_on - 1 then 0 else 1 end
        ) over (order by ow.recorded_on, ow.created_at, ow.id) as run_group
      from ordered_weights ow
    ),
    weight_runs as (
      select
        gw.*,
        row_number() over (
          partition by gw.run_group
          order by gw.recorded_on, gw.created_at, gw.id
        ) as run_length
      from grouped_weights gw
    ),
    weight_metrics as (
      select
        wr.*,
        floor(
          least(
            greatest(profile_row.start_weight_kg - profile_row.goal_weight_kg, 0),
            greatest(profile_row.start_weight_kg - wr.weight_kg, 0)
          ) + 0.00000001
        )::integer as reached_kg,
        floor(
          least(
            greatest(profile_row.start_weight_kg - profile_row.goal_weight_kg, 0),
            greatest(
              profile_row.start_weight_kg
                - coalesce(wr.previous_weight_kg, profile_row.start_weight_kg),
              0
            )
          ) + 0.00000001
        )::integer as previously_reached_kg
      from weight_runs wr
      where profile_row.start_weight_kg is not null
        and profile_row.goal_weight_kg is not null
        and profile_row.start_weight_kg > profile_row.goal_weight_kg
    ),
    candidates as (
      select
        'weight_loss'::text as type,
        wr.recorded_on as occurred_on,
        wr.created_at,
        'Today I am '
          || round(abs(wr.weight_kg - wr.previous_weight_kg), 1)::text
          || ' kg lighter; steady progress continues.' as body,
        'A little lighter'::text as title,
        round(wr.weight_kg - wr.previous_weight_kg, 1)::numeric as metric_value,
        'kg lost'::text as metric_label,
        p_user_id::text || ':weight-loss:' || wr.recorded_on::text as activity_key
      from weight_runs wr
      where wr.previous_on = wr.recorded_on - 1
        and wr.previous_weight_kg - wr.weight_kg >= 0.1

      union all

      select
        'streak'::text,
        wr.recorded_on,
        wr.created_at,
        wr.run_length::text
          || '-day weigh-in streak complete. Consistency beats perfection.',
        'Consistency streak'::text,
        wr.run_length::numeric,
        'day streak'::text,
        p_user_id::text || ':streak:' || wr.run_length::text || ':' || wr.recorded_on::text
      from weight_runs wr
      where wr.run_length >= 7
        and mod(wr.run_length, 7) = 0

      union all

      select
        'goal_milestone'::text,
        wm.recorded_on,
        wm.created_at,
        'I have lost '
          || wm.reached_kg::text
          || ' kg toward my goal; small steps add up.',
        'A meaningful milestone'::text,
        wm.reached_kg::numeric,
        'kg lost'::text,
        p_user_id::text || ':goal:' || wm.reached_kg::text || ':' || wm.recorded_on::text
      from weight_metrics wm
      where wm.reached_kg > 0
        and wm.reached_kg > wm.previously_reached_kg
    )
    select *
    from candidates
    order by occurred_on, created_at, activity_key
  loop
    supported_keys := array_append(supported_keys, activity.activity_key);

    insert into public.posts (
      user_id,
      type,
      occurred_on,
      body,
      title,
      metric_value,
      metric_label,
      activity_key,
      generated,
      created_at
    ) values (
      p_user_id,
      activity.type,
      activity.occurred_on,
      activity.body,
      activity.title,
      activity.metric_value,
      activity.metric_label,
      activity.activity_key,
      true,
      activity.created_at
    )
    on conflict (user_id, activity_key) do update
    set
      type = excluded.type,
      occurred_on = excluded.occurred_on,
      body = excluded.body,
      title = excluded.title,
      metric_value = excluded.metric_value,
      metric_label = excluded.metric_label,
      generated = true,
      created_at = excluded.created_at;
  end loop;

  delete from public.posts
  where user_id = p_user_id
    and generated = true
    and (
      activity_key is null
      or cardinality(supported_keys) = 0
      or not (activity_key = any(supported_keys))
    );
end;
$$;

revoke all on function public.rebuild_generated_posts(uuid) from public, anon, authenticated;
grant execute on function public.rebuild_generated_posts(uuid) to service_role;

create or replace function public.reconcile_generated_posts_from_source()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  old_user_id uuid;
  new_user_id uuid;
begin
  if tg_table_name = 'profiles' then
    old_user_id := case when tg_op = 'INSERT' then null else old.id end;
    new_user_id := case when tg_op = 'DELETE' then null else new.id end;
  else
    old_user_id := case when tg_op = 'INSERT' then null else old.user_id end;
    new_user_id := case when tg_op = 'DELETE' then null else new.user_id end;
  end if;

  if old_user_id is not null and old_user_id is distinct from new_user_id then
    perform public.rebuild_generated_posts(old_user_id);
  end if;
  if new_user_id is not null then
    perform public.rebuild_generated_posts(new_user_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.reconcile_generated_posts_from_source() from public, anon, authenticated;

-- Keep private goal data out of community-profile lookups. Policies use the
-- boolean helper, while the feed adapter receives only these four safe fields.
create or replace function public.feed_profile_is_visible(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = p_user_id and p.feed_opt_in = true
    );
$$;

revoke all on function public.feed_profile_is_visible(uuid) from public, anon, authenticated;
grant execute on function public.feed_profile_is_visible(uuid) to authenticated;

create or replace function public.list_feed_profiles(p_user_ids uuid[])
returns table (
  id uuid,
  username text,
  display_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.id, p.username, p.display_name, p.created_at
  from public.profiles p
  where (select auth.uid()) is not null
    and cardinality(coalesce(p_user_ids, '{}'::uuid[])) <= 200
    and p.id = any(coalesce(p_user_ids, '{}'::uuid[]))
    and (p.id = (select auth.uid()) or p.feed_opt_in = true);
$$;

revoke all on function public.list_feed_profiles(uuid[]) from public, anon, authenticated;
grant execute on function public.list_feed_profiles(uuid[]) to authenticated;

drop trigger if exists weights_reconcile_generated_posts on public.weights;
create trigger weights_reconcile_generated_posts
after insert or update or delete on public.weights
for each row execute function public.reconcile_generated_posts_from_source();

drop trigger if exists photos_reconcile_generated_posts on public.photos;

-- Existing shared photos stay in the private journal. Remove their old feed
-- activity and tighten the constraints on installations with the old schema.
update public.photos set visibility = 'private' where visibility <> 'private';
delete from public.posts where type = 'photo';
alter table public.photos drop constraint if exists photos_visibility_check;
alter table public.photos add constraint photos_visibility_check check (visibility = 'private');
alter table public.posts drop constraint if exists posts_type_check;
alter table public.posts add constraint posts_type_check
  check (type in ('weight_loss', 'streak', 'goal_milestone', 'milestone', 'custom'));

drop trigger if exists profiles_reconcile_generated_posts_on_insert on public.profiles;
create trigger profiles_reconcile_generated_posts_on_insert
after insert on public.profiles
for each row execute function public.reconcile_generated_posts_from_source();

drop trigger if exists profiles_reconcile_generated_posts_on_goal_update on public.profiles;
create trigger profiles_reconcile_generated_posts_on_goal_update
after update of start_weight_kg, goal_weight_kg on public.profiles
for each row
when (
  old.start_weight_kg is distinct from new.start_weight_kg
  or old.goal_weight_kg is distinct from new.goal_weight_kg
)
execute function public.reconcile_generated_posts_from_source();

alter table public.profiles enable row level security;
alter table public.weights enable row level security;
alter table public.photos enable row level security;
alter table public.posts enable row level security;
alter table public.reactions enable row level security;

-- Explicit grants keep the Data API surface narrow. Username is intentionally
-- immutable: it is also the stable source for the internal Auth identity.
revoke insert, update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (
  display_name,
  unit,
  start_weight_kg,
  goal_weight_kg,
  start_date,
  target_date,
  feed_opt_in
) on public.profiles to authenticated;
grant select, insert, update, delete on public.weights to authenticated;
grant select, insert, update, delete on public.photos to authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, update, delete on public.reactions to authenticated;
revoke all on public.profiles, public.weights, public.photos, public.posts, public.reactions from anon;

drop policy if exists profiles_read_owner_or_opted_in on public.profiles;
drop policy if exists profiles_read_owner on public.profiles;
create policy profiles_read_owner on public.profiles
for select to authenticated
using (id = (select auth.uid()));

drop policy if exists profiles_insert_self on public.profiles;

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
drop policy if exists photos_owner_only on public.photos;
create policy photos_owner_only on public.photos
for select to authenticated
using (user_id = (select auth.uid()));

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
  or public.feed_profile_is_visible(posts.user_id)
);

drop policy if exists posts_owner_insert on public.posts;
create policy posts_owner_insert on public.posts
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and generated = false
  and activity_key is null
);

drop policy if exists posts_owner_update on public.posts;
create policy posts_owner_update on public.posts
for update to authenticated
using (
  user_id = (select auth.uid())
  and generated = false
  and activity_key is null
)
with check (
  user_id = (select auth.uid())
  and generated = false
  and activity_key is null
);

drop policy if exists posts_owner_delete on public.posts;
create policy posts_owner_delete on public.posts
for delete to authenticated
using (
  user_id = (select auth.uid())
  and generated = false
  and activity_key is null
);

drop policy if exists reactions_read_authenticated on public.reactions;
create policy reactions_read_authenticated on public.reactions
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.posts po
    where po.id = reactions.post_id
      and (
        po.user_id = (select auth.uid())
        or public.feed_profile_is_visible(po.user_id)
      )
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
    where po.id = reactions.post_id
      and (
        po.user_id = (select auth.uid())
        or public.feed_profile_is_visible(po.user_id)
      )
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
-- Bucket-level limits are authoritative even if a client bypasses our UI.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'progress-photos',
  'progress-photos',
  false,
  4 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists progress_photos_insert_own_folder on storage.objects;
create policy progress_photos_insert_own_folder on storage.objects
for insert to authenticated
with check (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists progress_photos_select_own_or_feed on storage.objects;
drop policy if exists progress_photos_select_own_folder on storage.objects;
create policy progress_photos_select_own_folder on storage.objects
for select to authenticated
using (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
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

-- Reconcile any rows that existed before this migration added the triggers.
-- Older clients used activity keys for browser-generated posts; clear those
-- keys before enforcing database ownership of the generated namespace.
update public.posts
set activity_key = null
where generated = false and activity_key is not null;

do $$
declare
  existing_user_id uuid;
begin
  for existing_user_id in select id from public.profiles loop
    perform public.rebuild_generated_posts(existing_user_id);
  end loop;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.posts'::regclass
      and conname = 'posts_generated_activity_key_check'
  ) then
    alter table public.posts
      add constraint posts_generated_activity_key_check
      check (
        (generated = true and activity_key is not null)
        or (generated = false and activity_key is null)
      );
  end if;
end
$$;

alter table public.posts drop constraint if exists posts_generated_type_check;
alter table public.posts add constraint posts_generated_type_check
  check (generated = false or type in ('weight_loss', 'streak', 'goal_milestone'));
