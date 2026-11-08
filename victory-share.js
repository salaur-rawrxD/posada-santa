/* Posada Santa: share achievements and invite friends without an account. */
(function () {
  "use strict";
  var GAME_NAMES = {
    posada: "La Posada",
    trineo: "El Trineo",
    tamalazo: "¡Tamalazo!",
    pinata: "La Piñata"
  };
  var PATHS = {
    posada: "/play",
    trineo: "/trineo",
    tamalazo: "/tamalazo",
    pinata: "/pinata#play"
  };
  var stylesheet = document.createElement("style");
  stylesheet.textContent =
    ".ps-victory{margin:16px 0;padding:16px;border:2px solid #f5c66a;border-radius:18px;background:linear-gradient(135deg,#242e60,#41215a);color:#fff8ec;text-align:center;box-shadow:0 8px 24px #0002;font-family:system-ui,sans-serif}" +
    ".ps-victory strong{font-size:1.1rem;color:#f5c66a;display:block}.ps-victory .ps-vscore{font-size:clamp(1.8rem,6vw,2.6rem);font-weight:900;line-height:1.25;margin:6px 0}" +
    ".ps-victory .ps-vsub{font-size:.9rem;opacity:.9;margin:0 0 12px}.ps-victory .ps-vbuttons{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}" +
    ".ps-victory button{flex:1 1 140px;border:0;border-radius:12px;padding:12px 14px;font:800 .95rem system-ui,sans-serif;cursor:pointer;min-height:44px}" +
    ".ps-victory .ps-primary{background:#f5c66a;color:#16224a}.ps-victory .ps-secondary{background:#fff8ec;color:#16224a}" +
    ".ps-victory .ps-save{background:transparent;border:1px solid #fff8ec;color:#fff8ec}.ps-victory [role=status]{font-size:.82rem;margin-top:8px;min-height:1em}" +
    ".ps-challenge-banner{z-index:9000;position:fixed;bottom:calc(12px + env(safe-area-inset-bottom,0px));left:12px;right:12px;max-width:430px;margin:auto;background:#16224a;color:#fff8ec;border:2px solid #f5c66a;border-radius:15px;padding:12px 42px 12px 14px;box-shadow:0 8px 30px #0006;font:700 14px system-ui,sans-serif}" +
    ".ps-challenge-banner button{position:absolute;right:9px;top:8px;border:0;background:transparent;color:#fff8ec;font-size:22px;cursor:pointer}";
  document.head.appendChild(stylesheet);

  function isEs() {
    return (document.documentElement.lang || navigator.language || "").toLowerCase().startsWith("es");
  }
  function track(event, game) {
    try { if (typeof window.psTrack === "function") window.psTrack(event, { game: game }); } catch (_) {}
  }
  function boundedScore(value) {
    var n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.max(0, Math.min(999999999, n)) : 0;
  }
  function shareUrl(game, score) {
    var u = new URL(PATHS[game] || "/juegos", location.origin);
    u.searchParams.set("utm_source", "player_share");
    u.searchParams.set("utm_medium", "challenge");
    u.searchParams.set("utm_campaign", game);
    u.searchParams.set("beat", String(boundedScore(score)));
    return u.toString();
  }
  function message(game, score, challenge) {
    var name = GAME_NAMES[game] || "Posada Santa";
    var n = boundedScore(score).toLocaleString(isEs() ? "es-MX" : "en-US");
    if (game === "tamalazo") {
      return isEs() ? "🫔 ¡Gané " + n + " m² en " + name + "! ¿Me superas?"
        : "🫔 I won " + n + " m² in " + name + "! Can you beat me?";
    }
    return isEs()
      ? "🏆 ¡Logré " + n + " puntos en " + name + "! " + (challenge ? "¿Puedes superar mi récord?" : "¡Mira mi resultado!")
      : "🏆 I scored " + n + " points in " + name + "! " + (challenge ? "Think you can beat me?" : "Check out my score!");
  }
  async function canvasFile(game, score, player, achievement) {
    var canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1350;
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;
    var gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
    gradient.addColorStop(0, "#16224a"); gradient.addColorStop(.52, "#26346b"); gradient.addColorStop(1, "#541d57");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = "#f5c66a";
    for (var i = 0; i < 26; i++) {
      var x = 50 + (i * 173) % 970, y = 40 + (i * 251) % 1230;
      ctx.beginPath(); ctx.arc(x, y, 2 + (i % 5), 0, 2 * Math.PI); ctx.fill();
    }
    ctx.strokeStyle = "#f5c66a"; ctx.lineWidth = 9;
    ctx.strokeRect(48, 48, 984, 1254);
    ctx.textAlign = "center";
    ctx.fillStyle = "#f5c66a"; ctx.font = "bold 60px sans-serif"; ctx.fillText("POSADA SANTA", 540, 205);
    ctx.font = "110px sans-serif"; ctx.fillText("🏆", 540, 385);
    ctx.fillStyle = "#fff8ec"; ctx.font = "bold 86px sans-serif"; ctx.fillText(GAME_NAMES[game] || "Posada Santa", 540, 520);
    ctx.fillStyle = "#f5c66a"; ctx.font = "bold 138px sans-serif";
    ctx.fillText(boundedScore(score).toLocaleString(isEs() ? "es-MX" : "en-US"), 540, 710);
    ctx.fillStyle = "#fff8ec"; ctx.font = "bold 45px sans-serif";
    ctx.fillText(game === "tamalazo" ? (isEs() ? "m² ganados" : "m² won") : (isEs() ? "PUNTOS" : "POINTS"), 540, 785);
    if (achievement) {
      ctx.font = "bold 39px sans-serif";
      ctx.fillText(String(achievement).slice(0, 38), 540, 880);
    }
    // Name is displayed only if the player explicitly opted to use one locally.
    if (player) {
      ctx.font = "38px sans-serif";
      ctx.fillText(String(player).slice(0, 22), 540, 975);
    }
    ctx.font = "bold 46px sans-serif"; ctx.fillStyle = "#f5c66a";
    ctx.fillText(isEs() ? "¿PUEDES SUPERARME?" : "CAN YOU BEAT ME?", 540, 1120);
    ctx.font = "36px sans-serif"; ctx.fillStyle = "#fff8ec"; ctx.fillText("posadaxmas.com", 540, 1200);
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) {
        resolve(blob ? new File([blob], "posada-santa-" + game + ".png", { type: "image/png" }) : null);
      }, "image/png");
    });
  }
  async function clipboard(url, status) {
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = isEs() ? "¡Enlace copiado! Compártelo con tus amigos." : "Link copied! Send it to your friends.";
    } catch (_) {
      var text = isEs() ? "Copia este enlace: " : "Copy this link: ";
      status.textContent = text + url;
    }
  }
  async function share(game, score, player, achievement, status, withImage) {
    var url = shareUrl(game, score), title = GAME_NAMES[game], text = message(game, score, true);
    track(withImage ? "achievement_share_clicked" : "challenge_share_clicked", game);
    try {
      if (navigator.share) {
        var payload = { title: title, text: text, url: url };
        if (withImage && navigator.canShare) {
          var file = await canvasFile(game, score, player, achievement);
          if (file && navigator.canShare({ files: [file] })) payload.files = [file];
        }
        await navigator.share(payload);
        track("achievement_share_completed", game);
        status.textContent = isEs() ? "¡Gracias por compartir!" : "Thanks for sharing!";
        return;
      }
    } catch (error) {
      if (error && error.name === "AbortError") return; // User cancelled.
    }
    await clipboard(url, status);
    track("challenge_link_copied", game);
  }
  function show(options) {
    if (!options || !GAME_NAMES[options.game]) return;
    var parent = options.container;
    if (typeof parent === "string") parent = document.querySelector(parent);
    if (!parent) return;
    var existing = parent.querySelector(".ps-victory");
    if (existing) existing.remove();
    var game = options.game, score = boundedScore(options.score);
    var player = String(options.player || "").trim().slice(0, 22);
    var achievement = String(options.achievement || "").trim().slice(0, 38);
    var box = document.createElement("section"); box.className = "ps-victory";
    var title = document.createElement("strong"); title.textContent = isEs() ? "🏆 ¡Comparte tu victoria!" : "🏆 Share your victory!";
    var points = document.createElement("div"); points.className = "ps-vscore";
    points.textContent = score.toLocaleString(isEs() ? "es-MX" : "en-US") + (game === "tamalazo" ? " m²" : " pts");
    var sub = document.createElement("p"); sub.className = "ps-vsub";
    sub.textContent = achievement || (isEs() ? "Reta a tu familia y amigos" : "Challenge your family and friends");
    var buttons = document.createElement("div"); buttons.className = "ps-vbuttons";
    var status = document.createElement("div"); status.setAttribute("role", "status");
    function add(text, cls, handler) {
      var b = document.createElement("button"); b.type = "button"; b.className = cls;
      b.textContent = text; b.addEventListener("click", handler); buttons.appendChild(b);
    }
    add(isEs() ? "📣 Compartir puntaje" : "📣 Share score", "ps-primary", function () {
      share(game, score, player, achievement, status, true);
    });
    add(isEs() ? "🎯 Retar a un amigo" : "🎯 Challenge a friend", "ps-secondary", function () {
      share(game, score, player, achievement, status, false);
    });
    add(isEs() ? "⬇️ Guardar imagen" : "⬇️ Save card", "ps-save", async function () {
      var file = await canvasFile(game, score, player, achievement);
      if (!file) return;
      var blobUrl = URL.createObjectURL(file), link = document.createElement("a");
      link.href = blobUrl; link.download = file.name; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(function () { URL.revokeObjectURL(blobUrl); }, 30000);
      track("achievement_card_saved", game);
    });
    box.appendChild(title); box.appendChild(points); box.appendChild(sub);
    box.appendChild(buttons); box.appendChild(status);
    parent.appendChild(box);
    track("achievement_card_shown", game);
  }
  function showChallenge() {
    var u = new URL(location.href);
    if (u.searchParams.get("utm_source") !== "player_share") return;
    var game = Object.keys(PATHS).find(function (key) { return location.pathname === PATHS[key].split("#")[0]; });
    if (!game) return;
    var score = Number(u.searchParams.get("beat"));
    if (!Number.isInteger(score) || score <= 0 || score > 999999999) return;
    var b = document.createElement("div"); b.className = "ps-challenge-banner";
    b.textContent = isEs()
      ? "🎯 ¡Te retaron a superar " + score.toLocaleString("es-MX") + (game === "tamalazo" ? " m²!" : " puntos!")
      : "🎯 You've been challenged to beat " + score.toLocaleString("en-US") + (game === "tamalazo" ? " m²!" : " points!");
    var close = document.createElement("button"); close.type = "button";
    close.setAttribute("aria-label", isEs() ? "Cerrar" : "Close"); close.textContent = "×";
    close.addEventListener("click", function () { b.remove(); }); b.appendChild(close);
    document.body.appendChild(b);
    track("challenge_link_opened", game);
  }
  window.PosadaVictory = { show: show };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showChallenge);
  else showChallenge();
})();
