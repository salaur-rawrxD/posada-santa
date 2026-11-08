/* Posada Santa: private-family score challenges, no extra account required.
   Challenges are invitations based on existing family board snapshots, NOT
   authenticated ownership claims or server-verified competitive rankings. */
(function () {
  "use strict";
  var STORE = "posada-family-duels-v1";
  var MAX_AGE = 72 * 60 * 60 * 1000;
  function es() { return document.documentElement.lang === "es"; }
  function event(name) { try { if (typeof window.psTrack === "function") window.psTrack(name); } catch (_) {} }
  function norm(s) { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim(); }
  function small(s) { return String(s || "").replace(/[<>]/g,"").trim().slice(0,28); }
  function encode(obj) {
    var bytes = new TextEncoder().encode(JSON.stringify(obj)), binary = "";
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  }
  function decode(value) {
    if (!value || value.length > 1200 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
    try {
      var bin = atob(value.replace(/-/g,"+").replace(/_/g,"/") + "=".repeat((4 - value.length % 4) % 4));
      var bytes = Uint8Array.from(bin, function(c){return c.charCodeAt(0);});
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (_) { return null; }
  }
  function validate(d) {
    return d && d.v === 1 && typeof d.id === "string" && /^[a-z0-9-]{6,70}$/i.test(d.id) &&
      typeof d.gid === "string" && /^[a-zA-Z0-9_-]{4,60}$/.test(d.gid) &&
      typeof d.sender === "string" && d.sender.length > 0 && d.sender.length <= 28 &&
      typeof d.target === "string" && d.target.length <= 28 &&
      Number.isSafeInteger(d.points) && d.points >= 0 && d.points <= 999999999 &&
      Number.isSafeInteger(d.issued) && d.issued <= Date.now() + 300000 && Date.now() - d.issued <= MAX_AGE;
  }
  function load() {
    try {
      var data = JSON.parse(localStorage.getItem(STORE) || "{}");
      if (!data || typeof data !== "object" || Array.isArray(data)) return {};
      Object.keys(data).forEach(function(k) {
        if (!validate(data[k]) || Object.keys(data).length > 20 && k !== Object.keys(data).slice(-20)[0]) delete data[k];
      });
      return data;
    } catch (_) { return {}; }
  }
  function save(d) { try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (_) {} }
  var shareId = null, shareIssued = null;
  function newShare() {
    shareIssued = Date.now();
    shareId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID() : Math.random().toString(36).slice(2) + shareIssued.toString(36);
  }
  function link(base) {
    try {
      if (typeof Fam === "undefined" || typeof Board === "undefined") return base;
      var g = Fam.group(), me = Fam.rows().find(function(r){return r.me;});
      if (!g || !me || !me.n) return base;
      var sel = document.getElementById("fsMember");
      var target = sel ? small(sel.value) : "";
      if (target && !Fam.rows().some(function(r){return !r.me && norm(r.n) === norm(target);})) target="";
      if (!shareId) newShare();
      var data = {v:1,id:shareId,gid:g.gid,sender:small(me.n),target:target,
        points:Math.max(0,Math.min(999999999,Math.round(Number(me.s)||0))),issued:shareIssued};
      return base + "&duel=" + encode(data);
    } catch (_) { return base; }
  }
  function ownScore() {
    var me = typeof Board !== "undefined" && Board.current && Board.current();
    var row = me && Board.rows().find(function(r){return norm(r.name)===norm(me);});
    return row ? Math.max(0, Number(row.total) || 0) : 0;
  }
  function groupFor(d) { return typeof Fam !== "undefined" && Fam.all().some(function(g){return g.gid===d.gid;}); }
  function currentInvitation() {
    var data=load();
    var active=Object.values(data).filter(function(d){return validate(d)&&groupFor(d)&&d.status!=="dismissed"&&!d.completed;});
    active.sort(function(a,b){return b.issued-a.issued;});
    return active[0]||null;
  }
  function modal() {
    var wrap = document.getElementById("duelInvitation");
    if (wrap) return wrap;
    var st=document.createElement("style");
    st.textContent=".duel-invite{border:2px solid #f5c66a;border-radius:18px;padding:16px;margin:12px 0;background:linear-gradient(120deg,#253369,#49234d);color:#fff8ec;text-align:center;font-family:Nunito,system-ui,sans-serif}.duel-invite h3{font-size:22px;margin:6px 0;color:#f5c66a}.duel-invite p{margin:8px 0}.duel-invite button{border:0;border-radius:12px;min-height:44px;padding:9px 16px;font:900 15px Nunito,system-ui;cursor:pointer;margin:4px;background:#f5c66a;color:#16224a}.duel-invite .duel-dismiss{background:transparent;border:1px solid #fff8ec;color:#fff8ec}.duel-invite strong{font-size:27px;display:block}";
    document.head.appendChild(st);
    wrap=document.createElement("div");wrap.id="duelInvitation";wrap.className="duel-invite";wrap.hidden=true;
    var menu=document.getElementById("levelList");
    if (menu && menu.parentNode) menu.parentNode.insertBefore(wrap,menu);
    return wrap;
  }
  function drawInvite() {
    var box=modal(), d=currentInvitation();
    if (!box || !d) {if(box)box.hidden=true;return;}
    box.replaceChildren();
    var h=document.createElement("h3");h.textContent=es()?"🎯 ¡Reto familiar!":"🎯 Family challenge!";
    var p=document.createElement("p");
    p.textContent=(es()?"De ":"From ")+d.sender+
      (d.target ? (es()?" · Para ":" · For ")+d.target:"");
    var score=document.createElement("strong");score.textContent=d.points.toLocaleString(es()?"es-MX":"en-US")+(es()?" puntos por superar":" points to beat");
    var details=document.createElement("p");
    details.textContent=es()?"Supera ese total en la tabla de La Posada completando niveles.":"Beat that La Posada leaderboard total by completing levels.";
    var msg=document.createElement("p");
    var myName=typeof Board!=="undefined"&&Board.current();
    var rightRecipient=!d.target||norm(d.target)===norm(myName);
    msg.textContent=d.status==="accepted"?
      (es()?"Reto aceptado. ¡Juega un nivel!":"Challenge accepted. Play a level!") :
      d.target&&!rightRecipient?(es()?"Elige el jugador "+d.target+" antes de aceptar.":"Choose player "+d.target+" before accepting."):"";
    var accept=document.createElement("button");accept.type="button";
    accept.textContent=d.status==="accepted"?(es()?"▶ Jugar nivel":"▶ Play a level"):
      (es()?"Aceptar reto":"Accept challenge");
    accept.addEventListener("click",function(){
      var cur=typeof Board!=="undefined"&&Board.current();
      if (d.target&&norm(cur)!==norm(d.target)) {
        if(typeof open==="function")open("who");
        else alert(es()?"Elige tu jugador primero":"Choose your player first");
        return;
      }
      if(!cur){if(typeof open==="function")open("who");return;}
      var all=load();
      if(!all[d.id]||!validate(all[d.id]))return;
      all[d.id].status="accepted";all[d.id].acceptedBy=small(cur);all[d.id].acceptedAt=Date.now();save(all);
      event("family_challenge_accepted");
      if(typeof open==="function")open("menu");
      drawInvite();
    });
    var dismiss=document.createElement("button");dismiss.type="button";dismiss.className="duel-dismiss";
    dismiss.textContent=es()?"Ahora no":"Not now";
    dismiss.addEventListener("click",function(){var all=load();if(all[d.id])all[d.id].status="dismissed";save(all);drawInvite();});
    [h,p,score,details,msg,accept,dismiss].forEach(function(el){box.appendChild(el);});
    box.hidden=false;
  }
  function receive() {
    var hash=String(window.__H0||location.hash||"");
    var match=hash.match(/(?:^#|&)duel=([A-Za-z0-9_-]{8,1200})(?:&|$)/);
    if(!match)return;
    var d=decode(match[1]);
    if(!validate(d) || !groupFor(d))return;
    // Targeted invitations must name a player already on the shared family board.
    var group=Fam.all().find(function(g){return g.gid===d.gid;});
    if(d.target&&(!group||!Object.values(group.e||{}).some(function(r){return norm(r.n)===norm(d.target);})))return;
    var all=load();
    if(!all[d.id]){
      d.status="pending";
      all[d.id]=d;
      save(all);
      event("family_challenge_opened");
    }
  }
  function completed() {
    var all=load(), me=Board.current(), score=ownScore();
    if(!me)return;
    Object.keys(all).forEach(function(k){
      var d=all[k];
      if(!validate(d)||d.status!=="accepted"||d.completed||!groupFor(d)||norm(d.acceptedBy)!==norm(me))return;
      var beat=score>d.points;
      d.completed=true;d.status=beat?"won":"attempted";d.result=score;d.completedAt=Date.now();
      event("family_challenge_completed");
      if(beat)event("family_challenge_won");
      var result=document.createElement("p");result.className="duel-invite";
      result.textContent=beat?
        (es()?"🏆 ¡Ganaste el reto con "+score+" puntos!":"🏆 Challenge won with "+score+" points!") :
        (es()?"🎯 Lograste "+score+" de "+d.points+" puntos. ¡Vuelve a intentarlo!":"🎯 You reached "+score+" of "+d.points+" points. Try again!");
      var note=document.querySelector("#results .card");
      if(note){ var old=note.querySelector(".duel-result");if(old)old.remove();result.classList.add("duel-result");note.appendChild(result); }
    });
    save(all);drawInvite();
  }
  function wrapGame(){
    if(typeof levelDone!=="function"||typeof open!=="function")return;
    var original=levelDone;
    levelDone=function(){original.apply(this,arguments);completed();};
    var origOpen=open;
    open=function(id){origOpen.apply(this,arguments);if(id==="menu"||id==="board")drawInvite();};
    var originalPick=typeof pick==="function"?pick:null;
    if(originalPick)pick=function(){var ret=originalPick.apply(this,arguments);drawInvite();return ret;};
    drawInvite();
  }
  window.PosadaDuel={link:link,refresh:drawInvite};
  receive();
  wrapGame();
})();