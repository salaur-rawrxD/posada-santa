-- Enables the room host to start a new game after completing a round.
-- Run AFTER 20261108180000_social_game_rooms.sql.
-- Existing membership and per-game best scores are retained.
begin;

create or replace function public.reset_game_room_for_next_game(p_room_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  updated_id uuid;
begin
  if me is null then
    raise exception 'Sign in required' using errcode='28000';
  end if;

  update public.game_rooms
  set status = 'lobby', game_id = null
  where id = p_room_id
    and host_user_id = me
    and status = 'finished'
    and expires_at > now()
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Only the host may begin the next game from a finished round'
    using errcode='42501';
  end if;

  -- No player or score rows are deleted: a family room persists across games.
  return public.get_game_room(updated_id);
end;
$$;
revoke all on function public.reset_game_room_for_next_game(uuid) from public, anon;
grant execute on function public.reset_game_room_for_next_game(uuid) to authenticated;
commit;
