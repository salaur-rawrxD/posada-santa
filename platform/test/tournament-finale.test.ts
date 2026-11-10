import test from 'node:test';
import assert from 'node:assert/strict';
import { tournamentChampions,tournamentShareText,type TournamentStanding } from '../src/room/tournament.ts';
const make=(playerId:string,displayName:string,tournamentPoints:number,wins:number,roundsPlayed=2):TournamentStanding=>({playerId,displayName,tournamentPoints,wins,roundsPlayed});
test('champion uses points and wins tiebreak',()=>{
 const players=[make('a','Ana',17,2),make('b','Beto',17,1),make('c','Caro',10,1)];
 assert.deepEqual(tournamentChampions(players).map(p=>p.displayName),['Ana']);
});
test('exact ties share champion title',()=>{
 const players=[make('a','Ana',17,1),make('b','Beto',17,1)];
 assert.deepEqual(tournamentChampions(players).map(p=>p.displayName),['Ana','Beto']);
});
test('no champion before anyone has played',()=>{
 assert.deepEqual(tournamentChampions([make('a','Ana',0,0,0)]),[]);
 assert.equal(tournamentShareText([], 'en'),'');
});
test('share text contains standings but no private room code or URL',()=>{
 const players=[make('a','Ana',17,1),make('b','Beto',10,0)];
 const text=tournamentShareText(players,'es');
 assert.match(text,/Campeón: Ana/);
 assert.match(text,/Beto — 10 pts/);
 assert.doesNotMatch(text,/https?:\/\//);
 assert.doesNotMatch(text,/code=/);
});
