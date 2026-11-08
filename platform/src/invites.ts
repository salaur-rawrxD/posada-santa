/**
 * Room discovery links for the future /room page.
 * The fragment keeps codes out of routine HTTP request paths and referrers.
 * A room code is NOT a password or authorization token.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars, no 0/O/1/I.
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

export function normalizeRoomCode(value: string): string | null {
  const code = value.trim().toUpperCase().replace(/[\s-]/g, '');
  return CODE_PATTERN.test(code) ? code : null;
}

export function generateRoomCode(random: Pick<Crypto, 'getRandomValues'> = crypto): string {
  const bytes = new Uint8Array(8);
  random.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ALPHABET[byte & 31]).join('');
}

export function createRoomInviteUrl(code: string, siteUrl: string, roomPath: '/room' | '/room.html' = '/room'): string {
  const normalized = normalizeRoomCode(code);
  if (!normalized) throw new Error('Invalid room code');
  const url = new URL(siteUrl);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new Error('Room invites require HTTPS (except localhost)');
  }
  url.pathname = roomPath;
  url.search = '';
  url.hash = new URLSearchParams({ code: normalized }).toString();
  return url.toString();
}

export function parseRoomInviteUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['/room', '/room/', '/room.html'].includes(url.pathname)) return null;
    return normalizeRoomCode(new URLSearchParams(url.hash.slice(1)).get('code') || '');
  } catch {
    return null;
  }
}

export function normalizePlayerName(value: string): string | null {
  const name = Array.from(value.trim().replace(/\s+/g, ' ')).slice(0, 18).join('');
  // Avoid markup/control characters; the UI must still render names as textContent.
  return name.length >= 2 && !/[<>\u0000-\u001F\u007F]/u.test(name) ? name : null;
}
