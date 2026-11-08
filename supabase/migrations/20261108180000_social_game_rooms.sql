-- Posada Santa social gaming rooms, version 1.
-- APPLY MANUALLY after enabling Supabase Auth > Anonymous Sign-Ins.
-- Guest accounts receive the authenticated role; never trust a nickname as identity.
-- This migration does not alter the existing Secret Santa or friends leaderboard tables.

begin;

create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  host_user_id uuid not null,
  status text not null default 'lobby' check (status in ('lobby','playing','finished')),
  game_id text check (game_id is null or game_id in ('la-posada','pinata','tamalazo','trineo')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table if not exists public.game_room_members (
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  user_id uuid not null,
  display_name text not null check (char_length(display_name) between 2 and 18),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create unique index if not exists game_room_members_unique_name
  on public.game_room_members(room_id, lower(display_name));
create index if not exists game_room_members_user_id_idx
  on public.game_room_members(user_id);

create table if not exists public.game_room_scores (
  room_id uuid not null,
  user_id uuid not null,
  game_id text not null check (game_id in ('la-posada','pinata','tamalazo','trineo')),
  points bigint not null check (points between 0 and 999999999),
  verification text not null default 'unverified' check (verification = 'unverified'),
  submitted_at timestamptz not null default now(),
  primary key (room_id, user_id, game_id),
  foreign key (room_id, user_id) references public.game_room_members(room_id, user_id) on delete cascade
);

-- Deny direct access. All reads/writes go through membership-checking RPCs.
alter table public.game_rooms enable row level security;
alter table public.game_room_members enable row level security;
alter table public.game_room_scores enable row level security;
revoke all on public.game_rooms, public.game_room_members, public.game_room_scores from public, anon, authenticated;

create or replace function public._game_room_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  code text := '';
  i integer;
begin
  for i in 0..7 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return code;
end;
$$;
revoke all on function public._game_room_code() from public, anon, authenticated;

create or replace function public.get_game_room(p_room_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  room public.game_rooms%rowtype;
begin
  if me is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  select * into room from public.game_rooms
    where id = p_room_id and expires_at > now();
  if not found then raise exception 'Room unavailable' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.game_room_members where room_id = room.id and user_id = me) then
    raise exception 'Not a room member' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'id', room.id, 'code', room.code, 'status', room.status, 'gameId', room.game_id,
    'createdAt', room.created_at, 'expiresAt', room.expires_at,
    'hostPlayerId', room.host_user_id,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.user_id, 'displayName', m.display_name,
        'role', case when m.user_id = room.host_user_id then 'host' else 'guest' end,
        'joinedAt', m.joined_at
      ) order by m.joined_at)
      from public.game_room_members m where m.room_id = room.id
    ), '[]'::jsonb),
    'scores', coalesce((
      select jsonb_agg(jsonb_build_object(
        'playerId', s.user_id, 'gameId', s.game_id, 'points', s.points,
        'verification', s.verification, 'submittedAt', s.submitted_at
      ) order by s.points desc)
      from public.game_room_scores s where s.room_id = room.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.create_game_room(p_display_name text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  nickname text := regexp_replace(trim(coalesce(p_display_name,'')), '[[:space:]]+', ' ', 'g');
  new_id uuid;
  candidate text;
  attempt integer;
begin
  if me is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if char_length(nickname) not between 2 and 18 or nickname ~ '[<>[:cntrl:]]' then
    raise exception 'Invalid nickname' using errcode = '22023';
  end if;
  if (select count(*) from public.game_rooms where host_user_id = me and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Room creation limit reached' using errcode = '22023';
  end if;
  for attempt in 1..5 loop
    candidate := public._game_room_code();
    begin
      insert into public.game_rooms(code, host_user_id) values (candidate, me) returning id into new_id;
      exit;
    exception when unique_violation then
      null; -- retry a code collision
    end;
  end loop;
  if new_id is null then raise exception 'Could not allocate room code'; end if;
  insert into public.game_room_members(room_id, user_id, display_name)
    values (new_id, me, nickname);
  return public.get_game_room(new_id);
end;
$$;

create or replace function public.join_game_room(p_code text, p_display_name text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  nickname text := regexp_replace(trim(coalesce(p_display_name,'')), '[[:space:]]+', ' ', 'g');
  room public.game_rooms%rowtype;
begin
  if me is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if char_length(nickname) not between 2 and 18 or nickname ~ '[<>[:cntrl:]]' then
    raise exception 'Invalid nickname' using errcode = '22023';
  end if;
  if coalesce(p_code,'') !~ '^[A-HJ-NP-Z2-9]{8}$' then
    raise exception 'Invalid room code' using errcode = '22023';
  end if;
  select * into room from public.game_rooms where code = p_code and expires_at > now() for update;
  if not found then raise exception 'Room unavailable' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.game_room_members where room_id = room.id and user_id = me) then
    if room.status <> 'lobby' then raise exception 'Room already started' using errcode = '22023'; end if;
    if (select count(*) from public.game_room_members where room_id = room.id) >= 12 then
      raise exception 'Room full' using errcode = '22023';
    end if;
    if exists (select 1 from public.game_room_members where room_id = room.id and lower(display_name) = lower(nickname)) then
      raise exception 'Nickname already taken' using errcode = '23505';
    end if;
    insert into public.game_room_members(room_id, user_id, display_name) values (room.id, me, nickname);
  end if;
  return public.get_game_room(room.id);
end;
$$;

create or replace function public.select_game_room_game(p_room_id uuid, p_game_id text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if p_game_id not in ('la-posada','pinata','tamalazo','trineo') or p_game_id is null then
    raise exception 'Unknown game' using errcode = '22023';
  end if;
  update public.game_rooms set game_id = p_game_id
    where id = p_room_id and host_user_id = me and status = 'lobby' and expires_at > now();
  if not found then raise exception 'Host access required or room not in lobby' using errcode = '42501'; end if;
  return public.get_game_room(p_room_id);
end;
$$;

create or replace function public.set_game_room_status(p_room_id uuid, p_status text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if p_status not in ('playing','finished') or p_status is null then
    raise exception 'Invalid room transition' using errcode = '22023';
  end if;
  update public.game_rooms
  set status = p_status
  where id = p_room_id and host_user_id = me and expires_at > now()
    and game_id is not null
    and ((status = 'lobby' and p_status = 'playing') or (status = 'playing' and p_status = 'finished'));
  if not found then raise exception 'Host access required or invalid transition' using errcode = '42501'; end if;
  return public.get_game_room(p_room_id);
end;
$$;

create or replace function public.submit_game_room_score(p_room_id uuid, p_game_id text, p_points bigint)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  if p_points is null or p_points < 0 or p_points > 999999999 then
    raise exception 'Invalid score' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.game_rooms r
    join public.game_room_members m on m.room_id = r.id
    where r.id = p_room_id and m.user_id = me and r.game_id = p_game_id
      and r.status = 'playing' and r.expires_at > now()
  ) then
    raise exception 'Not authorized to submit this game score' using errcode = '42501';
  end if;
  -- Client scores are unverified; do not treat these as competitive or monetary outcomes.
  insert into public.game_room_scores(room_id, user_id, game_id, points)
    values (p_room_id, me, p_game_id, p_points)
  on conflict (room_id, user_id, game_id) do update
    set points = greatest(public.game_room_scores.points, excluded.points),
        submitted_at = now();
  return public.get_game_room(p_room_id);
end;
$$;

create or replace function public.leave_game_room(p_room_id uuid)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  room public.game_rooms%rowtype;
begin
  if me is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  select * into room from public.game_rooms where id = p_room_id for update;
  if not found then return false; end if;
  if room.host_user_id = me then
    delete from public.game_rooms where id = p_room_id; -- host closes the room
  else
    delete from public.game_room_members where room_id = p_room_id and user_id = me;
  end if;
  return true;
end;
$$;

-- New functions are executable by PUBLIC by default unless explicitly revoked.
revoke all on function public.get_game_room(uuid) from public, anon;
revoke all on function public.create_game_room(text) from public, anon;
revoke all on function public.join_game_room(text,text) from public, anon;
revoke all on function public.select_game_room_game(uuid,text) from public, anon;
revoke all on function public.set_game_room_status(uuid,text) from public, anon;
revoke all on function public.submit_game_room_score(uuid,text,bigint) from public, anon;
revoke all on function public.leave_game_room(uuid) from public, anon;

grant execute on function public.get_game_room(uuid) to authenticated;
grant execute on function public.create_game_room(text) to authenticated;
grant execute on function public.join_game_room(text,text) to authenticated;
grant execute on function public.select_game_room_game(uuid,text) to authenticated;
grant execute on function public.set_game_room_status(uuid,text) to authenticated;
grant execute on function public.submit_game_room_score(uuid,text,bigint) to authenticated;
grant execute on function public.leave_game_room(uuid) to authenticated;

commit;
