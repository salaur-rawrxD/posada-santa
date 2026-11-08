import { GAMES, createRoomInviteUrl, normalizePlayerName, normalizeRoomCode, parseRoomInviteUrl } from '../index.ts';
import { ensureGuest, rooms, type RoomSnapshot } from './api.ts';
import './room.css';

type Lang = 'es' | 'en';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const translations = {
  es: { eyebrow:'JUEGA EN FAMILIA',title:'Tu sala de juegos 🎮',lead:'Crea una sala, comparte un enlace y reúne a tus amigos. Sin cuenta obligatoria.',createTitle:'Crear una sala',joinTitle:'Unirse a una sala',name:'Tu apodo',code:'Código de invitación',create:'Crear sala',join:'Entrar a la sala',room:'SALA PRIVADA',shareHint:'Comparte el enlace con tu familia. Máximo 12 jugadores.',share:'Compartir invitación',copy:'Copiar enlace',players:'Jugadores',chooseGame:'Elige un juego',selectGame:'Elegir juego',start:'Iniciar ronda',finish:'Terminar ronda',scoreboard:'Marcador de la sala',scoreNote:'Vista previa: los juegos todavía no envían puntuaciones a esta sala. Las puntuaciones futuras serán no verificadas.',leave:'Salir de la sala',privacy:'Los enlaces de sala son invitaciones, no contraseñas. Usa apodos, no información privada.',lobby:'Esperando jugadores',playing:'Jugando',finished:'Terminada',host:'Anfitrión',guest:'Jugador',noScores:'Todavía no hay puntos.',selected:'Juego seleccionado',waiting:'El anfitrión todavía no eligió un juego.',copied:'¡Enlace copiado!',created:'¡Sala creada!',joined:'¡Entraste a la sala!',invalidName:'Escribe un apodo de 2 a 18 caracteres.',invalidCode:'Código de sala inválido.',closed:'La sala se cerró o expiró.',error:'No se pudo completar la acción.',shareText:'¡Únete a mi sala de juegos!',leaveConfirm:'¿Salir de la sala? Si eres anfitrión, cerrarás la sala para todos.' },
  en: { eyebrow:'PLAY TOGETHER',title:'Your game room 🎮',lead:'Create a room, share a link and bring your friends together. No mandatory account.',createTitle:'Create a room',joinTitle:'Join a room',name:'Your nickname',code:'Invite code',create:'Create room',join:'Join room',room:'PRIVATE ROOM',shareHint:'Share the link with family. Up to 12 players.',share:'Share invitation',copy:'Copy link',players:'Players',chooseGame:'Choose a game',selectGame:'Select game',start:'Start round',finish:'Finish round',scoreboard:'Room scoreboard',scoreNote:'Preview: games do not send scores to this room yet. Future scores will be unverified.',leave:'Leave room',privacy:'Room links are invitations, not passwords. Use nicknames, not private information.',lobby:'Waiting for players',playing:'Playing',finished:'Finished',host:'Host',guest:'Player',noScores:'No scores yet.',selected:'Selected game',waiting:'The host has not selected a game yet.',copied:'Link copied!',created:'Room created!',joined:'You joined the room!',invalidName:'Enter a nickname between 2 and 18 characters.',invalidCode:'Invalid room code.',closed:'The room closed or expired.',error:'Could not complete the action.',shareText:'Join my game room!',leaveConfirm:'Leave this room? Hosts close the room for everyone.' },
};
let lang: Lang = localStorage.getItem('posada-room-lang') === 'en' ? 'en' : 'es';
let room: RoomSnapshot | null = null;
let userId: string | null = null;
let busy = false;
let polling: number | undefined;
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
  $('lobby').hidden = !room;
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
  $('selectedGame').textContent = room.gameId ? t('selected') + ': ' + (GAMES.find(g => g.id === room?.gameId)?.title[lang] || room.gameId) : t('waiting');
  const players = $('players'); players.replaceChildren();
  room.players.forEach(p => {
    const li = document.createElement('li');
    const name = document.createElement('span'); name.textContent = p.displayName;
    const role = document.createElement('span'); role.textContent = p.role === 'host' ? '👑 ' + t('host') : t('guest');
    li.append(name, role); players.append(li);
  });
  const scores = $('scores'); scores.replaceChildren();
  if (!room.scores.length) {
    const li = document.createElement('li'); li.textContent = t('noScores'); scores.append(li);
  } else {
    room.scores.slice().sort((a,b) => b.points - a.points).forEach(s => {
      const li = document.createElement('li');
      const player = room?.players.find(p => p.id === s.playerId);
      const name = document.createElement('span'); name.textContent = player?.displayName || 'Guest';
      const score = document.createElement('strong'); score.textContent = s.points.toLocaleString();
      li.append(name, score); scores.append(li);
    });
  }
}
function setRoom(next: RoomSnapshot | null) {
  room = next;
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
    try { const next = await rooms.get(id); if (room?.id === id) { room = next; render(); } }
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
function invite(): string { if (!room) throw new Error('No room'); return createRoomInviteUrl(room.code, location.origin); }
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
$('leaveBtn').addEventListener('click', () => { if (!confirm(t('leaveConfirm'))) return; void action(async () => { if (room) await rooms.leave(room.id); setRoom(null); say(''); }); });
document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach(b => b.addEventListener('click', () => setLanguage(b.dataset.lang as Lang)));
const initialCode = parseRoomInviteUrl(location.href);
if (initialCode) $<HTMLInputElement>('joinCode').value = initialCode;
setLanguage(lang);
void (async () => {
  const existing = sessionStorage.getItem('posada-active-room');
  if (!existing) return;
  try { await identity(); const current = await rooms.get(existing); if (!initialCode || current.code === initialCode) setRoom(current); }
  catch { sessionStorage.removeItem('posada-active-room'); }
})();
