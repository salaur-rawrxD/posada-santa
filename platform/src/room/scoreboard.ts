import type { ScoreResult, RoomPlayer } from '../contracts.ts';
import type { GameId } from '../catalog.ts';

export interface FamilyStanding {
  playerId: string;
  displayName: string;
  totalPoints: number;
  gamesPlayed: number;
  perGame: Partial<Record<GameId, number>>;
}

/**
 * Scores saved in the database are each player's best result per game.
 * An overall total is a simple sum for this preview, not a normalized tournament ranking.
 */
export function familyStandings(
  players: readonly RoomPlayer[],
  scores: readonly ScoreResult[],
): FamilyStanding[] {
  return players.map(player => {
    const perGame: Partial<Record<GameId, number>> = {};
    for (const result of scores) {
      if (result.playerId !== player.id || !Number.isSafeInteger(result.points) || result.points < 0) continue;
      perGame[result.gameId] = Math.max(perGame[result.gameId] ?? 0, result.points);
    }
    const values = Object.values(perGame);
    return {
      playerId: player.id,
      displayName: player.displayName,
      perGame,
      gamesPlayed: values.length,
      totalPoints: values.reduce((sum, points) => sum + points, 0),
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints || b.gamesPlayed - a.gamesPlayed || a.displayName.localeCompare(b.displayName));
}
