/** Canonical game IDs and routes. These are the four games already on the site. */
export const GAMES = [
  { id: 'la-posada', route: '/play', title: { es: 'La Posada', en: 'La Posada' }, supportsGroupScores: true },
  { id: 'pinata', route: '/pinata', title: { es: 'La Piñata', en: 'Piñata' }, supportsGroupScores: false },
  { id: 'tamalazo', route: '/tamalazo', title: { es: '¡Tamalazo!', en: 'Tamalazo' }, supportsGroupScores: false },
  { id: 'trineo', route: '/trineo', title: { es: 'El Trineo', en: 'Sleigh Ride' }, supportsGroupScores: false },
] as const;

export type GameId = (typeof GAMES)[number]['id'];
export type Language = 'es' | 'en';
export type Game = (typeof GAMES)[number];

export function findGame(id: string): Game | undefined {
  return GAMES.find((game) => game.id === id);
}
