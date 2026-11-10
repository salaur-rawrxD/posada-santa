-- Finalize a private family tournament and optionally replay with the same members.
-- Apply after 20261109160000_family_tournament_rounds.sql.
-- No public result endpoint, exchange data, or Secret Santa tables are modified.
begin;

alter table public.game_rooms drop constraint if exists game_rooms_status_check;
alter table public.game_rooms add constraint game_rooms_status_check
  check (status in ('lobby','playing','finished','complete'));

create or replace function public.complete_game_room_tournament(p_room_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  room public.game_rooms%rowtype;
begin
  if me is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select * into room from public.game_rooms where id=p_room_id for update;
  if not found or room.host_user_id<>me or room.expires_at<=now() then
    raise exception 'Host access required' using errcode='42501';
  end if;
  if room.status <> 'finished' then
    raise exception 'Finish the current round before ending the tournament' using errcode='22023';
  end if;
  if not exists (
    select 1 from public.game_room_rounds r
    join public.game_room_round_scores s on s.round_id=r.id
    where r.room_id=p_room_id and r.finished_at is not null
  ) then
    raise exception 'At least one completed round with a score is required' using errcode='22023';
  end if;
  update public.game_rooms set status='complete' where id=p_room_id;
  return public.get_game_room(p_room_id);
end;
$$;

create or replace function public.restart_game_room_tournament(p_room_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  room public.game_rooms%rowtype;
begin
  if me is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select * into room from public.game_rooms where id=p_room_id for update;
  if not found or room.host_user_id<>me or room.expires_at<=now() then
    raise exception 'Host access required' using errcode='42501';
  end if;
  if room.status <> 'complete' then
    raise exception 'Finish the tournament before restarting' using errcode='22023';
  end if;
  -- Replay is explicit and destructive to the PREVIOUS tournament results.
  -- Membership and the room invite code are retained.
  delete from public.game_room_rounds where room_id=p_room_id;
  delete from public.game_room_scores where room_id=p_room_id;
  update public.game_rooms set status='lobby', game_id=null where id=p_room_id;
  return public.get_game_room(p_room_id);
end;
$$;

revoke all on function public.complete_game_room_tournament(uuid) from public, anon;
revoke all on function public.restart_game_room_tournament(uuid) from public, anon;
grant execute on function public.complete_game_room_tournament(uuid) to authenticated;
grant execute on function public.restart_game_room_tournament(uuid) to authenticated;
commit;
