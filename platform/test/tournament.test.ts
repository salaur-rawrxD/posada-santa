import test from 'node:test';
import assert from 'node:assert/strict';
import {rankRound,tournamentStandings,type TournamentRound} from '../src/room/tournament.ts';
import type { RoomPlayer } from '../src/contracts.ts';

const players: RoomPlayer[] = [
  {id:'a',displayName:'Ana',role:'host',joinedAt:'2026-11-09'},
  {id:'b',displayName:'Beto',role:'guest',joinedAt:'2026-11-09'},
  {id:'c',displayName:'Caro',role:'guest',joinedAt:'2026-11-09'},
];
const score=(playerId:string,points:number)=>({playerId,displayName:playerId,points,submittedAt:'2026-11-09'});
const round=(id:string,number:number,gameId:'la-posada'|'tamalazo',scores:ReturnType<typeof score>[],finishedAt:string|null='2026-11-09'):TournamentRound =>
  ({id,number,gameId,scores,startedAt:'2026-11-09',finishedAt});

test('placement awards are independent of raw score scale',()=>{
  const first=round('1',1,'la-posada',[score('a',100),score('b',20)]);
  const second=round('2',2,'tamalazo',[score('a',1000),score('b',50000)]);
  assert.deepEqual(tournamentStandings(players,[first,second]).map(s=>[s.playerId,s.tournamentPoints]),[
    ['a',17],['b',17],['c',0],
  ]);
});
test('ties share place points and skip next rank',()=>{
  const results=rankRound(round('1',1,'la-posada',[score('a',20),score('b',20),score('c',10)]));
  assert.deepEqual(results.map(s=>[s.place,s.tournamentPoints]),[[1,10],[1,10],[3,5]]);
});
test('unfinished rounds do not award tournament points',()=>{
  const pending=round('1',1,'la-posada',[score('a',100)],null);
  assert.deepEqual(rankRound(pending),[]);
  assert.equal(tournamentStandings(players,[pending])[0]?.tournamentPoints,0);
});
test('only submitted scores count; zero is a valid score',()=>{
  const done=round('1',1,'la-posada',[score('a',0)]);
  const totals=tournamentStandings(players,[done]);
  assert.equal(totals[0]?.tournamentPoints,10);
  assert.equal(totals.find(s=>s.playerId==='b')?.roundsPlayed,0);
});
