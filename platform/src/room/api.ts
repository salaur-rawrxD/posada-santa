import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { GameId, GameRoom, ScoreResult } from '../index.ts';
import type { TournamentRound } from './tournament.ts';

export interface RoomSnapshot extends GameRoom {
  hostPlayerId: string;
  expiresAt: string;
  scores: readonly ScoreResult[];
  rounds: readonly TournamentRound[];
}

let client: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('YOUR_PROJECT')) {
    throw new Error('Supabase public environment settings are missing. See platform/.env.example.');
  }
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}

export async function ensureGuest(): Promise<string> {
  const supabase = getClient();
  const { data: session, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (session.session?.user.id) return session.session.user.id;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) throw error ?? new Error('Could not create guest session');
  return data.user.id;
}

async function rpc<T>(name: string, params: Record<string, unknown>): Promise<T> {
  const { data, error } = await getClient().rpc(name, params);
  if (error) throw new Error(error.message);
  return data as T;
}

export const rooms = {
  create: (name: string) => rpc<RoomSnapshot>('create_game_room', { p_display_name: name }),
  join: (code: string, name: string) => rpc<RoomSnapshot>('join_game_room', { p_code: code, p_display_name: name }),
  get: (id: string) => rpc<RoomSnapshot>('get_game_room', { p_room_id: id }),
  selectGame: (id: string, game: GameId) => rpc<RoomSnapshot>('select_game_room_game', { p_room_id: id, p_game_id: game }),
  setStatus: (id: string, status: 'playing' | 'finished') => rpc<RoomSnapshot>('set_game_room_status', { p_room_id: id, p_status: status }),
  leave: (id: string) => rpc<boolean>('leave_game_room', { p_room_id: id }),
  nextGame: (id: string) => rpc<RoomSnapshot>('reset_game_room_for_next_game', { p_room_id: id }),
  completeTournament: (id: string) => rpc<RoomSnapshot>('complete_game_room_tournament', { p_room_id: id }),
  restartTournament: (id: string) => rpc<RoomSnapshot>('restart_game_room_tournament', { p_room_id: id }),
  // Not called until existing games emit shared score events.
  submitScore: (id: string, game: GameId, points: number) =>
    rpc<RoomSnapshot>('submit_game_room_score', { p_room_id: id, p_game_id: game, p_points: points }),
};
