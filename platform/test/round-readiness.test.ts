import test from 'node:test';
import assert from 'node:assert/strict';
import { roundReadiness, type TournamentRound } from '../src/room/tournament.ts';
import type { RoomPlayer } from '../src/contracts.ts';
const players: RoomPlayer[]=[
  {id:'a',displayName:'Ana',role:'host',joinedAt:'2026-11-09'},
  {id:'b',displayName:'Beto',role:'guest',joinedAt:'2026-11-09'},
];
const round: TournamentRound={id:'r',number:1,gameId:'la-posada',startedAt:'2026-11-09',finishedAt:null,
 scores:[{playerId:'a',displayName:'Ana',points:0,submittedAt:'2026-11-09'}]};
test('zero is a valid submitted score; missing players are listed',()=>{
 assert.deepEqual(roundReadiness(players,round),{submitted:1,total:2,pendingNames:['Beto']});
});
test('without a round, no one has submitted',()=>{
 assert.deepEqual(roundReadiness(players,undefined),{submitted:0,total:2,pendingNames:['Ana','Beto']});
});
