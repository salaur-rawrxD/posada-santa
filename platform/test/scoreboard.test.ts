import assert from 'node:assert/strict';
import test from 'node:test';
import { familyStandings } from '../src/room/scoreboard.ts';
import type { RoomPlayer, ScoreResult } from '../src/contracts.ts';

const players: RoomPlayer[] = [
  { id: 'a', displayName: 'Ana', role: 'host', joinedAt: '2026-11-08T00:00:00Z' },
  { id: 'b', displayName: 'Beto', role: 'guest', joinedAt: '2026-11-08T00:00:00Z' },
  { id: 'c', displayName: 'Caro', role: 'guest', joinedAt: '2026-11-08T00:00:00Z' },
];
const makeScore = (playerId: string, gameId: 'la-posada'|'tamalazo', points: number): ScoreResult => ({
  playerId, gameId, points, roomId: 'r', submittedAt: '2026-11-08T00:00:00Z', verification: 'unverified',
});

test('standings aggregate each game best and retain zero-score players', () => {
  const standings = familyStandings(players, [
    makeScore('a', 'la-posada', 100),
    makeScore('a', 'tamalazo', 200),
    makeScore('b', 'tamalazo', 250),
    makeScore('a', 'la-posada', 80),
  ]);
  assert.deepEqual(standings.map(p => [p.displayName,p.totalPoints,p.gamesPlayed]), [
    ['Ana',300,2], ['Beto',250,1], ['Caro',0,0],
  ]);
  assert.deepEqual(standings[0]?.perGame, {'la-posada':100,'tamalazo':200});
});

test('invalid and orphaned results do not affect leaderboard', () => {
  const standings = familyStandings(players, [makeScore('missing','tamalazo',999), makeScore('a','tamalazo',-1)]);
  assert.equal(standings[0]?.totalPoints, 0);
  assert.equal(standings.length,3);
});
