#!/usr/bin/env node
/**
 * Preview-only copies of two existing HTML5 games.
 * Their production sources and Facebook build are not modified.
 * All networking specific to the legacy La Posada website is disabled.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const out = resolve(import.meta.dirname, '../dist-room/games');
mkdirSync(out, { recursive: true });

function embed(game, html) {
  // Remove scripts that assume the production site origin or call its analytics/RPC endpoints.
  html = html.replace(/<script\b[^>]*\bsrc="\/[^"]+"[^>]*>\s*<\/script>\s*/g, '');
  html = html.replace(/<script\s+id="va-init"[^>]*>[\s\S]*?<\/script>\s*/g, '');
  html = html.replace(/<link\b[^>]*\bhref="\/(?:[^"]*)"[^>]*>\s*/g, '');
  if (game === 'la-posada') {
    const old = /async function rpc\(fn,args\)\{[\s\S]*?\}\s*const ORIGIN=location\.origin;/;
    if (!old.test(html)) throw new Error('La Posada RPC isolation failed');
    html = html.replace(old, 'async function rpc(){ throw new Error("Legacy exchange RPC disabled in room preview"); }\nconst ORIGIN=location.origin;');
    html = html.replace(/const SB_URL="[^"]+", SB_KEY="[^"]+";/, '');
    if (html.includes('const SB_KEY=') || html.includes('const SB_URL=')) throw new Error('Legacy Supabase config leaked');
  }
  // Run the bridge inside the same classic script scope as the game.
  // The parent authenticates using its OWN Supabase session; games provide only unverified points.
  const bridge = game === 'la-posada'
    ? `
(function(){
  const qp=new URLSearchParams(location.search), session=qp.get('session'), player=qp.get('player');
  if(!session || !player || !window.parent || window.parent===window) return;
  if(typeof Board!=='undefined' && Board.setCurrent) Board.setCurrent(player);
  const prev=levelDone;
  levelDone=function(){ prev.apply(this,arguments);
    const score=Number(document.getElementById('rScore')?.textContent);
    if(Number.isSafeInteger(score)&&score>=0) window.parent.postMessage({type:'posada-room-score-v1',session,gameId:'la-posada',points:score},location.origin);
  };
})();
`
    : `
(function(){
  const session=new URLSearchParams(location.search).get('session');
  if(!session || !window.parent || window.parent===window) return;
  const prev=endRound;
  endRound=function(){ prev.apply(this,arguments);
    const score=Number(S?.score);
    if(Number.isSafeInteger(score)&&score>=0) window.parent.postMessage({type:'posada-room-score-v1',session,gameId:'tamalazo',points:score},location.origin);
  };
})();
`;
  const idx=html.lastIndexOf('</script>');
  if(idx < 0 || !html.includes(game==='la-posada'?'levelDone=function()':'function endRound(){')) throw new Error('Game score hook missing: '+game);
  return html.slice(0,idx) + '\n' + bridge + '\n' + html.slice(idx);
}

for (const [source, id] of [['play.html','la-posada'],['tamalazo.html','tamalazo']]) {
  const contents=readFileSync(resolve(root,source),'utf8');
  const result=embed(id,contents);
  writeFileSync(resolve(out,id+'.html'),result);
  console.log('Built game preview:',id);
}
