/* Sync La Posada progress to separate friends-only group leaderboards.
   Does not write into or change Secret Santa exchange memberships. */
(function(){
"use strict";
var STORE="posada-friends-v1";
var SB="https://ktssnlyspwzhdhffpgqm.supabase.co";
var KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0c3NubHlzcHd6aGRoZmZwZ3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5MjYwMDgsImV4cCI6MjEwOTUwMjAwOH0.3lHaJYRYCyeqcdgS2EIfT1_6qr0B5CxNqYQNHkyevCk";
function load(){try{var o=JSON.parse(localStorage.getItem(STORE)||"{}");return o&&o.groups?o:{groups:{},current:null}}catch(_){return{groups:{},current:null}}}
function norm(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()}
function track(n){try{if(typeof window.psTrack==="function")window.psTrack(n)}catch(_){}}
async function rpc(fn,args){var r=await fetch(SB+"/rest/v1/rpc/"+fn,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY,Authorization:"Bearer "+KEY},body:JSON.stringify(args)});if(!r.ok)throw Error("score sync unavailable");return r.json()}
async function sync(){
  var groups=Object.values(load().groups||{}),name=Board.current();
  if(!name||!groups.length)return;
  var row=Board.rows().find(function(r){return norm(r.name)===norm(name)});
  if(!row||!row.total)return;
  for(var g of groups){
    if(norm(g.player)!==norm(name))continue;
    try{await rpc("submit_score",{p_gid:g.id,p_player:g.player,p_score:row.total,p_stars:row.stars,p_top:row.top});track("friends_score_synced")}catch(_){}
  }
}
function decorate(){
  var groups=Object.values(load().groups||{}),levels=document.getElementById("levelList");
  if(!groups.length||!levels||document.getElementById("friendsPlayBanner"))return;
  var a=document.createElement("a");a.id="friendsPlayBanner";a.href="/friends";
  a.style.cssText="display:block;padding:12px 14px;border:1px solid #f5c66a;border-radius:14px;text-decoration:none;background:rgba(245,198,106,.13);color:#fff8ec;font-weight:900;margin:10px 0;text-align:center";
  a.textContent=(document.documentElement.lang==="es"?"🏆 Tus retos con amigos · Ver tabla":"🏆 Friends challenges · View leaderboard");
  levels.parentNode.insertBefore(a,levels);
}
var hash=new URLSearchParams(location.hash.replace(/^#/,""));
var id=hash.get("friends"),data=load(),g=id&&data.groups[id];
if(g&&typeof Board!=="undefined"){
  if(Board.current()!==g.player){Board.setCurrent(g.player);if(typeof renderLevels==="function")renderLevels();}
  track("friends_game_opened");
}
if(typeof levelDone==="function"){var prev=levelDone;levelDone=function(){prev.apply(this,arguments);sync()}}
document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible")sync()});
decorate();if(g)sync();
})();