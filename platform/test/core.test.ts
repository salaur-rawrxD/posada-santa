import assert from 'node:assert/strict';
import test from 'node:test';
import { GAMES, findGame } from '../src/catalog.ts';
import { createRoomInviteUrl, generateRoomCode, normalizePlayerName, normalizeRoomCode, parseRoomInviteUrl } from '../src/invites.ts';

test('game catalog maps all four existing game URLs', () => {
  assert.deepEqual(GAMES.map(g => g.route), ['/play', '/pinata', '/tamalazo', '/trineo']);
  assert.equal(findGame('la-posada')?.supportsGroupScores, true);
  assert.equal(findGame('pinata')?.supportsGroupScores, false);
  assert.equal(findGame('unknown'), undefined);
});

test('room codes are 8 human-readable characters', () => {
  const code = generateRoomCode();
  assert.match(code, /^[A-HJ-NP-Z2-9]{8}$/);
  assert.equal(normalizeRoomCode(' abcd-2345 '), 'ABCD2345');
  assert.equal(normalizeRoomCode('I0O1abcd'), null);
  assert.equal(normalizeRoomCode('ABC'), null);
});

test('invite URLs are fragment-only, do not leak player names, and round trip', () => {
  const url = createRoomInviteUrl('ABCD2345', 'https://posadaxmas.com/juegos?name=Private');
  assert.equal(url, 'https://posadaxmas.com/room#code=ABCD2345');
  assert.equal(parseRoomInviteUrl(url), 'ABCD2345');
  assert.equal(parseRoomInviteUrl('https://posadaxmas.com/other#code=ABCD2345'), null);
  assert.equal(parseRoomInviteUrl('not a URL'), null);
  assert.throws(() => createRoomInviteUrl('BAD', 'https://posadaxmas.com'), /Invalid room code/);
  assert.throws(() => createRoomInviteUrl('ABCD2345', 'http://example.com'), /HTTPS/);
});

test('guest names are trimmed and reject unsafe characters', () => {
  assert.equal(normalizePlayerName('  Ana   María '), 'Ana María');
  assert.equal(normalizePlayerName('A'), null);
  assert.equal(normalizePlayerName('<script>'), null);
  assert.equal(normalizePlayerName('José 🎄'), 'José 🎄');
});
