import test from 'node:test';
import assert from 'node:assert/strict';
import { championCardData } from '../src/room/champion-card.ts';
import type { TournamentStanding } from '../src/room/tournament.ts';
const make = (id: string, name: string, points: number, wins=1): TournamentStanding =>
  ({ playerId:id, displayName:name, tournamentPoints:points, wins, roundsPlayed:2 });

test('card includes champions and results, without private invitation information', () => {
  const card=championCardData([make('a','Ana',20),make('b','Beto',10)],'es');
  assert.equal(card.champions,'Ana');
  assert.match(card.rows[1] ?? '',/Beto.*10 pts/);
  assert.doesNotMatch(JSON.stringify(card),/roomCode|invite|https?:\/\//i);
});
test('tied winners are both shown and language changes',()=>{
  const card=championCardData([make('a','Ana',20),make('b','Beto',20)],'en');
  assert.equal(card.champions,'Ana & Beto');
  assert.equal(card.heading,'FAMILY TOURNAMENT');
});
test('no completed scores means no champions',()=>{
  const card=championCardData([{...make('a','Ana',0,0),roundsPlayed:0}],'es');
  assert.equal(card.champions,'');
});
