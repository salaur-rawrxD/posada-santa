import type { GameId } from './catalog.ts';

/** Future platform contracts; no database or live room service is wired up yet. */
export type RoomStatus = 'lobby' | 'playing' | 'finished' | 'complete';
export type PlayerRole = 'host' | 'guest';

export interface RoomPlayer {
  id: string; // Anonymous per-room identifier; not a display name.
  displayName: string;
  role: PlayerRole;
  joinedAt: string;
}

export interface GameRoom {
  id: string; // Server-issued opaque identifier.
  code: string; // Shareable discovery code, NOT an authentication credential.
  status: RoomStatus;
  gameId: GameId | null;
  players: readonly RoomPlayer[];
  createdAt: string;
}

export interface ScoreResult {
  roomId: string;
  gameId: GameId;
  playerId: string;
  points: number;
  submittedAt: string;
  verification: 'unverified' | 'verified';
}

/** The future server must enforce room membership, input validation and scoring policy. */
export interface RoomService {
  createRoom(displayName: string): Promise<GameRoom>;
  joinRoom(code: string, displayName: string): Promise<GameRoom>;
  getRoom(roomId: string): Promise<GameRoom>;
  selectGame(roomId: string, gameId: GameId): Promise<GameRoom>;
  leaveRoom(roomId: string): Promise<void>;
}
