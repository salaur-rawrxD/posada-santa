/* Posada Santa retention pilot: daily challenge rotation, stored only on this device.
   Challenges use actual end-of-game scores reported by the existing victory cards. */
(function () {
  "use strict";
  var DAYS = [
    {game:"trineo", name:"El Trineo", icon:"🛷", target:600, unit:"pts", path:"/trineo",
     en:"Score 600 points in one run", es:"Logra 600 puntos en una partida"},
    {game:"tamalazo", name:"¡Tamalazo!", icon:"🫔", target:450, unit:"m²", path:"/tamalazo",
     en:"Win 450 m² in one round", es:"Gana 450 m² en una ronda"},
    {game:"pinata", name:"La Piñata", icon:"🪅", target:1200, unit:"pts", path:"/pinata#play",
     en:"Score 1,200 points in arcade mode", es:"Logra 1,200 puntos en el modo arcade"},
    {game:"posada", name:"La Posada", icon:"🏠", target:300, unit:"pts", path:"/play",
     en:"Score 300 points in a completed level", es:"Logra 300 puntos al terminar un nivel"}
  ];
  var STORAGE = "posada-daily-challenges-v1";
  function dayId() { return new Date().toISOString().slice(0,10); }
  function dayIndex(id) {
    var parts=id.split("-").map(Number);
    var n=Math.floor(Date.UTC(parts[0],parts[1]-1,parts[2])/86400000);
    return ((n%4)+4)%4;
  }
  function today() { var d=dayId(); return Object.assign({date:d},DAYS[dayIndex(d)]); }
  function read() { try { return JSON.parse(localStorage.getItem(STORAGE)||"{}")||{}; }catch(_){return{};} }
  function write(data) { try { localStorage.setItem(STORAGE,JSON.stringify(data)); }catch(_){} }
  function track(name) { try { if(typeof window.psTrack==="function")window.psTrack(name); }catch(_){} }
  function locale() { return document.documentElement.lang==="es"?"es":"en"; }
  function progress() { var d=today(), rec=read()[d.date]; return {challenge:d, best:rec&&rec.game===d.game?Math.max(0,Number(rec.best)||0):0, complete:!!(rec&&rec.complete&&rec.game===d.game)}; }
  function play() { track("daily_challenge_started"); window.location.assign(today().path); }
  function complete(game,score) {
    var d=today();
    if(game!==d.game) return false;
    score=Math.max(0,Math.round(Number(score)||0));
    var data=read(), previous=data[d.date]||{game:d.game,best:0,complete:false};
    if(previous.game!==d.game) previous={game:d.game,best:0,complete:false};
    previous.best=Math.max(previous.best||0,score);
    var first=!previous.complete&&score>=d.target;
    if(score>=d.target) previous.complete=true;
    data[d.date]=previous;
    // Keep the latest 45 days to avoid growing local storage indefinitely.
    var keys=Object.keys(data).sort();keys.slice(0,-45).forEach(function(k){delete data[k];});
    write(data);
    if(first) track("daily_challenge_completed");
    return first;
  }
  function showHub(){
    var el=document.getElementById("dailyChallenge");
    if(!el)return;
    var p=progress(),d=p.challenge,es=locale()==="es";
    var done=el.querySelector("[data-daily-done]");
    var label=el.querySelector("[data-daily-label]");
    var details=el.querySelector("[data-daily-details]");
    var score=el.querySelector("[data-daily-score]");
    var meter=el.querySelector("[data-daily-meter]");
    var button=el.querySelector("[data-daily-play]");
    var name=el.querySelector("[data-daily-name]");
    var date=el.querySelector("[data-daily-date]");
    name.textContent=d.icon+" "+d.name;
    date.textContent=es?"Nuevo reto cada día (UTC)":"New challenge daily (UTC)";
    label.textContent=es?"🎄 Reto del día":"🎄 Today's Challenge";
    details.textContent=d[es?"es":"en"];
    done.textContent=p.complete?(es?"✅ ¡Reto completado!":"✅ Challenge complete"):"";
    score.textContent=(es?"Tu mejor intento: ":"Your best: ")+p.best.toLocaleString(es?"es-MX":"en-US")+" / "+d.target.toLocaleString(es?"es-MX":"en-US")+" "+d.unit;
    meter.style.width=Math.max(0,Math.min(100,p.best/d.target*100))+"%";
    button.textContent=p.complete?(es?"Volver a jugar →":"Play again →"):(es?"Jugar el reto →":"Play challenge →");
    if(!button.dataset.ready){button.addEventListener("click",play);button.dataset.ready="1";}
  }
  function visit(){
    var d=dayId();
    var last;
    try {last=localStorage.getItem("posada-last-play-day");localStorage.setItem("posada-last-play-day",d);}catch(_){return;}
    if(last&&last!==d){
      var delta=(Date.parse(d+"T00:00:00Z")-Date.parse(last+"T00:00:00Z"))/86400000;
      if(delta===1)track("player_returned_next_day");
    }
  }
  window.PosadaDaily={today:today,progress:progress,complete:complete,render:showHub};
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",function(){visit();showHub();});
  else {visit();showHub();}
})();