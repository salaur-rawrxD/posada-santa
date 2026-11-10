import type { GameId } from '../catalog.ts';
import type { RoomPlayer } from '../contracts.ts';

export interface RoundScore {
  playerId: string;
  displayName: string;
  points: number;
  submittedAt: string;
}
export interface TournamentRound {
  id: string;
  number: number;
  gameId: GameId;
  startedAt: string;
  finishedAt: string | null;
  scores: readonly RoundScore[];
}
export interface RankedResult extends RoundScore {
  place: number;
  tournamentPoints: number;
}
export interface TournamentStanding {
  playerId: string;
  displayName: string;
  tournamentPoints: number;
  roundsPlayed: number;
  wins: number;
}
const AWARDS = [10,7,5,3,2,1] as const;
export function rankRound(round: TournamentRound): RankedResult[] {
  if (!round.finishedAt) return [];
  const valid = round.scores.filter(s => Number.isSafeInteger(s.points) && s.points>=0);
  const sorted = [...valid].sort((a,b) => b.points-a.points || a.displayName.localeCompare(b.displayName));
  let place = 0;
  let lastPoints: number | null = null;
  return sorted.map((score,index) => {
    if (lastPoints !== score.points) place=index+1;
    lastPoints=score.points;
    return {...score,place,tournamentPoints:AWARDS[Math.min(place-1,AWARDS.length-1)] ?? 1};
  });
}
export function tournamentStandings(players: readonly RoomPlayer[], rounds: readonly TournamentRound[]): TournamentStanding[] {
  const totals = new Map(players.map(p => [p.id,{playerId:p.id,displayName:p.displayName,tournamentPoints:0,roundsPlayed:0,wins:0}]));
  for (const round of rounds) {
    for (const result of rankRound(round)) {
      const player=totals.get(result.playerId);
      if (!player) continue;
      player.tournamentPoints += result.tournamentPoints;
      player.roundsPlayed += 1;
      if (result.place===1) player.wins += 1;
    }
  }
  return [...totals.values()].sort((a,b) =>
    b.tournamentPoints-a.tournamentPoints || b.wins-a.wins || a.displayName.localeCompare(b.displayName));
}
