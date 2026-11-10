import { GAMES, createRoomInviteUrl, normalizePlayerName, normalizeRoomCode, parseRoomInviteUrl } from '../index.ts';
import { ensureGuest, rooms, type RoomSnapshot } from './api.ts';
import { tournamentStandings, rankRound, tournamentChampions, tournamentShareText } from './tournament.ts';
import './room.css';

type Lang = 'es' | 'en';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const translations = {
  es: { eyebrow:'JUEGA EN FAMILIA',title:'Tu sala de juegos 🎮',lead:'Crea una sala, comparte un enlace y reúne a tus amigos. Sin cuenta obligatoria.',createTitle:'Crear una sala',joinTitle:'Unirse a una sala',name:'Tu apodo',code:'Código de invitación',create:'Crear sala',join:'Entrar a la sala',room:'SALA PRIVADA',shareHint:'Comparte el enlace con tu familia. Máximo 12 jugadores.',share:'Compartir invitación',copy:'Copiar enlace',players:'Jugadores',chooseGame:'Elige un juego',selectGame:'Elegir juego',start:'Iniciar ronda',finish:'Terminar ronda',nextGame:'Siguiente juego →',completeTournament:'Finalizar torneo 🏆',championTitle:'¡Tenemos campeones!',championSubtitle:'¡Gracias por jugar en familia!',shareResults:'Compartir resultados',restartTournament:'Jugar otro torneo',confirmComplete:'¿Finalizar el torneo y declarar a los ganadores? Ya no podrás jugar más rondas en este torneo.',confirmRestart:'¿Empezar otro torneo? Se borrarán los resultados anteriores de esta sala. Compártelos antes de continuar.',resultsCopied:'¡Resultados copiados!',totalsNote:'Puntos por posición: 1.º 10 · 2.º 7 · 3.º 5 · 4.º 3 · 5.º 2 · 6.º+ 1. Los empates comparten puntos.',history:'Historial de rondas',round:'Ronda',inProgress:'En curso',noHistory:'Termina una ronda para ver los resultados.',tournamentPoints:'pts de torneo',wins:'victorias',scoreboard:'Marcador de la sala',scoreNote:'Los puntos enviados por los juegos no están verificados. Los resultados son solo para diversión familiar.',leave:'Salir de la sala',privacy:'Los enlaces de sala son invitaciones, no contraseñas. Usa apodos, no información privada.',lobby:'Esperando jugadores',playing:'Jugando',finished:'Terminada',complete:'Torneo finalizado',host:'Anfitrión',guest:'Jugador',noScores:'Todavía no hay puntos.',selected:'Juego seleccionado',waiting:'El anfitrión todavía no eligió un juego.',copied:'¡Enlace copiado!',created:'¡Sala creada!',joined:'¡Entraste a la sala!',invalidName:'Escribe un apodo de 2 a 18 caracteres.',invalidCode:'Código de sala inválido.',closed:'La sala se cerró o expiró.',error:'No se pudo completar la acción.',shareText:'¡Únete a mi sala de juegos!',launch:'Jugar ahora ▶',return:'← Volver a la sala',playingHint:'Completa una partida. Tus puntos se guardan automáticamente en el marcador de la sala.',saving:'Guardando puntuación...',saved:'¡Puntuación guardada!',scoreFailed:'No se pudo guardar la puntuación. Vuelve a intentarlo.',leaveConfirm:'¿Salir de la sala? Si eres anfitrión, cerrarás la sala para todos.' },
  en: { eyebrow:'PLAY TOGETHER',title:'Your game room 🎮',lead:'Create a room, share a link and bring your friends together. No mandatory account.',createTitle:'Create a room',joinTitle:'Join a room',name:'Your nickname',code:'Invite code',create:'Create room',join:'Join room',room:'PRIVATE ROOM',shareHint:'Share the link with family. Up to 12 players.',share:'Share invitation',copy:'Copy link',players:'Players',chooseGame:'Choose a game',selectGame:'Select game',start:'Start round',finish:'Finish round',nextGame:'Next game →',completeTournament:'Finish tournament 🏆',championTitle:'We have champions!',championSubtitle:'Thanks for playing together!',shareResults:'Share results',restartTournament:'Play another tournament',confirmComplete:'Finish the tournament and declare the winners? No more rounds can be played in this tournament.',confirmRestart:'Start a new tournament? Previous results in this room will be deleted. Share them first.',resultsCopied:'Results copied!',totalsNote:'Placement points: 1st 10 · 2nd 7 · 3rd 5 · 4th 3 · 5th 2 · 6th+ 1. Ties share points.',history:'Round history',round:'Round',inProgress:'In progress',noHistory:'Finish a round to see results.',tournamentPoints:'tournament pts',wins:'wins',scoreboard:'Room scoreboard',scoreNote:'Game-submitted scores are unverified. Rankings are for friendly family play only.',leave:'Leave room',privacy:'Room links are invitations, not passwords. Use nicknames, not private information.',lobby:'Waiting for players',playing:'Playing',finished:'Finished',complete:'Tournament complete',host:'Host',guest:'Player',noScores:'No scores yet.',selected:'Selected game',waiting:'The host has not selected a game yet.',copied:'Link copied!',created:'Room created!',joined:'You joined the room!',invalidName:'Enter a nickname between 2 and 18 characters.',invalidCode:'Invalid room code.',closed:'The room closed or expired.',error:'Could not complete the action.',shareText:'Join my game room!',launch:'Play now ▶',return:'← Back to room',playingHint:'Finish a game. Your points are saved automatically to your room scoreboard.',saving:'Saving score...',saved:'Score saved!',scoreFailed:'Could not save your score. Try again.',leaveConfirm:'Leave this room? Hosts close the room for everyone.' },
};
let lang: Lang = localStorage.getItem('posada-room-lang') === 'en' ? 'en' : 'es';
let room: RoomSnapshot | null = null;
let userId: string | null = null;
let busy = false;
let polling: number | undefined;
let activeGameSession: string | null = null;
let gameSubmitting = false;
const t = (key: keyof typeof translations.es) => translations[lang][key];
const say = (message: string) => { $('status').textContent = message; };
function setLanguage(next: Lang) {
  lang = next;
  localStorage.setItem('posada-room-lang', next);
  document.documentElement.lang = next;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n as keyof typeof translations.es;
    if (key && translations[lang][key]) el.textContent = t(key);
  });
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  render();
}
function render() {
  $('entry').hidden = !!room;
  $('lobby').hidden = !room || !!activeGameSession;
  $('gamePanel').hidden = !activeGameSession;
  if (!room) return;
  $('roomCode').textContent = room.code;
  $('roomStatus').textContent = t(room.status);
  const isHost = userId === room.hostPlayerId;
  $('hostControls').hidden = !isHost;
  const select = $<HTMLSelectElement>('gameSelect');
  if (!select.options.length) GAMES.forEach(game => select.add(new Option(game.title[lang], game.id)));
  Array.from(select.options).forEach((opt, index) => { opt.textContent = GAMES[index]?.title[lang] || opt.value; });
  if (room.gameId) select.value = room.gameId;
  select.disabled = room.status !== 'lobby';
  $<HTMLButtonElement>('selectBtn').disabled = room.status !== 'lobby';
  $<HTMLButtonElement>('startBtn').disabled = room.status !== 'lobby' || !room.gameId;
  $<HTMLButtonElement>('finishBtn').disabled = room.status !== 'playing';
  $('nextGameBtn').hidden = room.status !== 'finished' || !isHost;
  const hasScoredRound = (room.rounds || []).some(r => !!r.finishedAt && r.scores.length > 0);
  $('completeTournamentBtn').hidden = room.status !== 'finished' || !isHost;
  $<HTMLButtonElement>('completeTournamentBtn').disabled = !hasScoredRound;
  $('championPanel').hidden = room.status !== 'complete';
  $('restartTournamentBtn').hidden = !isHost;
  if (room.status === 'complete') {
    const winners = tournamentChampions(tournamentStandings(room.players, room.rounds || []));
    $('championNames').textContent = winners.map(w => w.displayName).join(' & ');
  }
  $('selectedGame').textContent = room.gameId ? t('selected') + ': ' + (GAMES.find(g => g.id === room?.gameId)?.title[lang] || room.gameId) : t('waiting');
  $('launchBtn').hidden = room.status !== 'playing' || !['la-posada','tamalazo'].includes(room.gameId || '');
  const players = $('players'); players.replaceChildren();
  room.players.forEach(p => {
    const li = document.createElement('li');
    const name = document.createElement('span'); name.textContent = p.displayName;
    const role = document.createElement('span'); role.textContent = p.role === 'host' ? '👑 ' + t('host') : t('guest');
    li.append(name, role); players.append(li);
  });
  const scores = $('scores'); scores.replaceChildren();
  const standings = tournamentStandings(room.players, room.rounds || []);
  standings.forEach((standing,index) => {
    const li=document.createElement('li');
    const info=document.createElement('div');
    const name=document.createElement('strong'); name.className='score-name';
    name.textContent=(index+1)+'. '+standing.displayName;
    const detail=document.createElement('small'); detail.className='score-detail';
    detail.textContent=standing.roundsPlayed+' '+t('round').toLowerCase()+' · '+standing.wins+' '+t('wins');
    const total=document.createElement('strong'); total.className='score-total';
    total.textContent=standing.tournamentPoints+' '+t('tournamentPoints');
    info.append(name,detail); li.append(info,total); scores.append(li);
  });
  const history=$('roundHistory'); history.replaceChildren();
  const completed=(room.rounds || []).filter(r=>!!r.finishedAt).slice().reverse();
  if (!completed.length) {
    const p=document.createElement('p'); p.className='hint'; p.textContent=t('noHistory'); history.append(p);
  }
  for (const round of completed) {
    const card=document.createElement('article'); card.className='round-card';
    const heading=document.createElement('h4');
    heading.textContent=t('round')+' '+round.number+' · '+(GAMES.find(g=>g.id===round.gameId)?.title[lang]||round.gameId);
    const results=rankRound(round);
    if (!results.length) {
      const p=document.createElement('small'); p.textContent=t('noScores'); card.append(heading,p);
    } else {
      const ol=document.createElement('ol');
      for (const result of results) {
        const item=document.createElement('li');
        const name=room.players.find(p=>p.id===result.playerId)?.displayName || result.displayName;
        item.textContent=result.place+'. '+name+' — '+result.points.toLocaleString()+' ('+result.tournamentPoints+' '+t('tournamentPoints')+')';
        ol.append(item);
      }
      card.append(heading,ol);
    }
    history.append(card);
  }
}
function setRoom(next: RoomSnapshot | null) {
  room = next;
  if (!next || next.status === 'finished' || next.status === 'complete') closeGame();
  if (next) {
    sessionStorage.setItem('posada-active-room', next.id);
    location.hash = 'code=' + next.code;
    startPolling();
  } else {
    sessionStorage.removeItem('posada-active-room');
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    stopPolling();
  }
  render();
}
function stopPolling() { if (polling !== undefined) { clearInterval(polling); polling = undefined; } }
function startPolling() {
  stopPolling();
  polling = window.setInterval(async () => {
    if (!room || document.visibilityState !== 'visible') return;
    const id = room.id;
    try { const next = await rooms.get(id); if (room?.id === id) { if (next.status !== 'playing' && activeGameSession) closeGame(); room = next; render(); } }
    catch { if (room?.id === id) { setRoom(null); say(t('closed')); } }
  }, 5000);
}
async function action(task: () => Promise<void>) {
  if (busy) return;
  busy = true;
  document.querySelectorAll<HTMLButtonElement>('button').forEach(b => { if (!b.dataset.lang) b.disabled = true; });
  try { await task(); } catch (error) { say(error instanceof Error ? error.message : t('error')); }
  finally { busy = false; render(); document.querySelectorAll<HTMLButtonElement>('button').forEach(b => { if (!b.dataset.lang) b.disabled = false; }); }
}
async function identity() { userId = await ensureGuest(); }
function nameFrom(id: string): string | null { return normalizePlayerName($<HTMLInputElement>(id).value); }
$('createForm').addEventListener('submit', ev => {
  ev.preventDefault();
  void action(async () => {
    const name = nameFrom('createName');
    if (!name) { say(t('invalidName')); return; }
    await identity(); setRoom(await rooms.create(name)); say(t('created'));
  });
});
$('joinForm').addEventListener('submit', ev => {
  ev.preventDefault();
  void action(async () => {
    const code = normalizeRoomCode($<HTMLInputElement>('joinCode').value);
    const name = nameFrom('joinName');
    if (!code) { say(t('invalidCode')); return; }
    if (!name) { say(t('invalidName')); return; }
    await identity(); setRoom(await rooms.join(code, name)); say(t('joined'));
  });
});
function invite(): string { if (!room) throw new Error('No room'); return createRoomInviteUrl(room.code, location.origin, location.pathname.endsWith('.html') ? '/room.html' : '/room'); }
$('shareBtn').addEventListener('click', () => { void action(async () => {
  const url = invite();
  if (navigator.share) {
    try { await navigator.share({ title: 'Posada Santa', text: t('shareText'), url }); return; }
    catch (e) { if ((e as Error).name === 'AbortError') return; }
  }
  await navigator.clipboard.writeText(url); say(t('copied'));
}); });
$('copyBtn').addEventListener('click', () => { void action(async () => { await navigator.clipboard.writeText(invite()); say(t('copied')); }); });
$('selectBtn').addEventListener('click', () => { void action(async () => { if (room) setRoom(await rooms.selectGame(room.id, $<HTMLSelectElement>('gameSelect').value as typeof GAMES[number]['id'])); }); });
$('startBtn').addEventListener('click', () => { void action(async () => { if (room) setRoom(await rooms.setStatus(room.id, 'playing')); }); });
$('finishBtn').addEventListener('click', () => { void action(async () => { if (room) setRoom(await rooms.setStatus(room.id, 'finished')); }); });
$('nextGameBtn').addEventListener('click', () => { void action(async () => { if (room) setRoom(await rooms.nextGame(room.id)); }); });
$('completeTournamentBtn').addEventListener('click', () => {
  if (!confirm(t('confirmComplete'))) return;
  void action(async () => { if (room) setRoom(await rooms.completeTournament(room.id)); });
});
$('restartTournamentBtn').addEventListener('click', () => {
  if (!confirm(t('confirmRestart'))) return;
  void action(async () => { if (room) setRoom(await rooms.restartTournament(room.id)); });
});
$('shareResultsBtn').addEventListener('click', () => { void action(async () => {
  if (!room || room.status !== 'complete') return;
  const summary = tournamentShareText(tournamentStandings(room.players, room.rounds || []), lang);
  if (!summary) return;
  if (navigator.share) {
    try { await navigator.share({ title: 'Posada Santa', text: summary }); return; }
    catch (e) { if ((e as Error).name === 'AbortError') return; }
  }
  await navigator.clipboard.writeText(summary);
  say(t('resultsCopied'));
}); });
$('leaveBtn').addEventListener('click', () => { if (!confirm(t('leaveConfirm'))) return; void action(async () => { if (room) await rooms.leave(room.id); setRoom(null); say(''); }); });
document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach(b => b.addEventListener('click', () => setLanguage(b.dataset.lang as Lang)));

const gameRoutes: Partial<Record<string,string>> = {
  'la-posada': '/games/la-posada.html',
  'tamalazo': '/games/tamalazo.html',
};
function closeGame() {
  activeGameSession = null;
  const frame = $<HTMLIFrameElement>('gameFrame');
  frame.removeAttribute('src');
  $('gamePanel').hidden = true;
}
function launchGame() {
  if (!room || room.status !== 'playing' || !room.gameId) return;
  const route = gameRoutes[room.gameId];
  const player = room.players.find(p => p.id === userId);
  if (!route || !player) return;
  activeGameSession = crypto.randomUUID();
  const url = new URL(route, location.origin);
  url.searchParams.set('session', activeGameSession);
  url.searchParams.set('player', player.displayName);
  $('gameTitle').textContent = GAMES.find(g => g.id === room?.gameId)?.title[lang] || room.gameId;
  $<HTMLIFrameElement>('gameFrame').src = url.toString();
  render();
  $('gamePanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('launchBtn').addEventListener('click', launchGame);
$('returnBtn').addEventListener('click', () => { closeGame(); render(); });
window.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (event.origin !== location.origin || event.source !== $<HTMLIFrameElement>('gameFrame').contentWindow) return;
  const message = event.data as { type?: string; gameId?: string; session?: string; points?: number } | null;
  if (!message || message.type !== 'posada-room-score-v1' || !activeGameSession || message.session !== activeGameSession) return;
  if (!room || room.status !== 'playing' || room.gameId !== message.gameId || gameSubmitting) return;
  if (!Number.isSafeInteger(message.points) || message.points! < 0 || message.points! > 999999999) return;
  const id = room.id;
  const game = room.gameId;
  gameSubmitting = true;
  say(t('saving'));
  void rooms.submitScore(id, game, message.points!).then(snapshot => {
    if (room?.id === id) { room = snapshot; render(); }
    say(t('saved'));
  }).catch(() => say(t('scoreFailed'))).finally(() => { gameSubmitting = false; });
});

const initialCode = parseRoomInviteUrl(location.href);
if (initialCode) $<HTMLInputElement>('joinCode').value = initialCode;
setLanguage(lang);
void (async () => {
  const existing = sessionStorage.getItem('posada-active-room');
  if (!existing) return;
  try { await identity(); const current = await rooms.get(existing); if (!initialCode || current.code === initialCode) setRoom(current); }
  catch { sessionStorage.removeItem('posada-active-room'); }
})();
