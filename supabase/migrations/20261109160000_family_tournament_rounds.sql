-- Private family tournaments: per-round history and scores, without modifying exchange data.
-- Apply AFTER 20261108211000_room_next_game.sql.
-- New rounds are tracked from this migration forward; start a NEW room for testing.
begin;

create table if not exists public.game_room_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  round_number integer not null check (round_number between 1 and 1000),
  game_id text not null check (game_id in ('la-posada','pinata','tamalazo','trineo')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (room_id, round_number)
);
create unique index if not exists game_room_one_active_round
  on public.game_room_rounds(room_id) where finished_at is null;

create table if not exists public.game_room_round_scores (
  round_id uuid not null references public.game_room_rounds(id) on delete cascade,
  user_id uuid not null,
  display_name text not null,
  points bigint not null check (points between 0 and 999999999),
  submitted_at timestamptz not null default now(),
  primary key (round_id, user_id)
);

alter table public.game_room_rounds enable row level security;
alter table public.game_room_round_scores enable row level security;
revoke all on public.game_room_rounds, public.game_room_round_scores from public, anon, authenticated;

-- Keep the existing response fields for backwards compatibility, adding rounds.
create or replace function public.get_game_room(p_room_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  room public.game_rooms%rowtype;
begin
  if me is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select * into room from public.game_rooms where id=p_room_id and expires_at>now();
  if not found then raise exception 'Room unavailable' using errcode='P0002'; end if;
  if not exists (select 1 from public.game_room_members where room_id=room.id and user_id=me) then
    raise exception 'Not a room member' using errcode='42501';
  end if;
  return jsonb_build_object(
    'id',room.id,'code',room.code,'status',room.status,'gameId',room.game_id,
    'createdAt',room.created_at,'expiresAt',room.expires_at,'hostPlayerId',room.host_user_id,
    'players',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',m.user_id,'displayName',m.display_name,
        'role',case when m.user_id=room.host_user_id then 'host' else 'guest' end,
        'joinedAt',m.joined_at) order by m.joined_at)
      from public.game_room_members m where m.room_id=room.id
    ),'[]'::jsonb),
    'scores',coalesce((
      select jsonb_agg(jsonb_build_object(
        'playerId',s.user_id,'gameId',s.game_id,'points',s.points,
        'verification',s.verification,'submittedAt',s.submitted_at) order by s.points desc)
      from public.game_room_scores s where s.room_id=room.id
    ),'[]'::jsonb),
    'rounds',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',r.id,'number',r.round_number,'gameId',r.game_id,
        'startedAt',r.started_at,'finishedAt',r.finished_at,
        'scores',coalesce((
          select jsonb_agg(jsonb_build_object(
            'playerId',rs.user_id,'displayName',rs.display_name,
            'points',rs.points,'submittedAt',rs.submitted_at) order by rs.points desc)
          from public.game_room_round_scores rs where rs.round_id=r.id
        ),'[]'::jsonb)) order by r.round_number)
      from public.game_room_rounds r where r.room_id=room.id
    ),'[]'::jsonb)
  );
end;
$$;

-- Lock the room row to serialize round changes and avoid duplicate starts/finishes.
create or replace function public.set_game_room_status(p_room_id uuid,p_status text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  room public.game_rooms%rowtype;
  next_number integer;
begin
  if me is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_status is null or p_status not in ('playing','finished') then
    raise exception 'Invalid room transition' using errcode='22023';
  end if;
  select * into room from public.game_rooms where id=p_room_id for update;
  if not found or room.host_user_id<>me or room.expires_at<=now() then
    raise exception 'Host access required' using errcode='42501';
  end if;
  if p_status='playing' then
    if room.status<>'lobby' or room.game_id is null then
      raise exception 'Select a game in the lobby first' using errcode='22023';
    end if;
    select coalesce(max(round_number),0)+1 into next_number
      from public.game_room_rounds where room_id=p_room_id;
    if next_number>1000 then raise exception 'Round limit reached' using errcode='22023'; end if;
    insert into public.game_room_rounds(room_id,round_number,game_id)
      values(p_room_id,next_number,room.game_id);
    update public.game_rooms set status='playing' where id=p_room_id;
  else
    if room.status<>'playing' then
      raise exception 'No active game to finish' using errcode='22023';
    end if;
    update public.game_room_rounds set finished_at=now()
      where room_id=p_room_id and finished_at is null;
    if not found then
      raise exception 'No tracked round; please start a new room' using errcode='22023';
    end if;
    update public.game_rooms set status='finished' where id=p_room_id;
  end if;
  return public.get_game_room(p_room_id);
end;
$$;

create or replace function public.submit_game_room_score(p_room_id uuid,p_game_id text,p_points bigint)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  room public.game_rooms%rowtype;
  active_round uuid;
  nickname text;
begin
  if me is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_points is null or p_points<0 or p_points>999999999 then
    raise exception 'Invalid score' using errcode='22023';
  end if;
  select * into room from public.game_rooms where id=p_room_id for update;
  if not found or room.status<>'playing' or room.game_id is distinct from p_game_id
      or room.expires_at<=now() then
    raise exception 'Game is not active' using errcode='42501';
  end if;
  select display_name into nickname from public.game_room_members
    where room_id=p_room_id and user_id=me;
  if nickname is null then raise exception 'Not a room member' using errcode='42501'; end if;
  select id into active_round from public.game_room_rounds
    where room_id=p_room_id and game_id=p_game_id and finished_at is null;
  if active_round is null then
    raise exception 'No tracked round; please start a new room' using errcode='22023';
  end if;
  insert into public.game_room_round_scores(round_id,user_id,display_name,points)
    values(active_round,me,nickname,p_points)
  on conflict (round_id,user_id) do update
    set points=greatest(public.game_room_round_scores.points,excluded.points),
        submitted_at=now();
  -- Preserve legacy per-game bests for existing integrations.
  insert into public.game_room_scores(room_id,user_id,game_id,points)
    values(p_room_id,me,p_game_id,p_points)
  on conflict (room_id,user_id,game_id) do update
    set points=greatest(public.game_room_scores.points,excluded.points),
        submitted_at=now();
  return public.get_game_room(p_room_id);
end;
$$;

revoke all on function public.get_game_room(uuid) from public, anon;
revoke all on function public.set_game_room_status(uuid,text) from public, anon;
revoke all on function public.submit_game_room_score(uuid,text,bigint) from public, anon;
grant execute on function public.get_game_room(uuid) to authenticated;
grant execute on function public.set_game_room_status(uuid,text) to authenticated;
grant execute on function public.submit_game_room_score(uuid,text,bigint) to authenticated;
commit;
