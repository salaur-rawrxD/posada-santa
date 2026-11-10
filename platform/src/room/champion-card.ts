import { tournamentChampions, type TournamentStanding } from './tournament.ts';

type Language = 'es' | 'en';
export interface ChampionCardData {
  heading: string;
  subtitle: string;
  champions: string;
  rows: readonly string[];
  footer: string;
}

/** Public-share-safe card content: only the nicknames and tournament totals. */
export function championCardData(standings: readonly TournamentStanding[], language: Language): ChampionCardData {
  const winners = tournamentChampions(standings);
  return {
    heading: language === 'es' ? 'TORNEO FAMILIAR' : 'FAMILY TOURNAMENT',
    subtitle: language === 'es' ? '🏆 CAMPEONES' : '🏆 CHAMPIONS',
    champions: winners.map(w => w.displayName).join(' & '),
    rows: standings.slice(0, 12).map((s, i) =>
      `${String(i + 1).padStart(2, '0')}  ${s.displayName}  ·  ${s.tournamentPoints} ${language === 'es' ? 'pts' : 'pts'}`),
    footer: language === 'es' ? '¡Gracias por jugar en familia!' : 'Thanks for playing together!',
  };
}

function textLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? current + ' ' + word : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines;
}

/** Creates a local PNG; never uploads scores or exposes private room identifiers. */
export async function createChampionCardPng(
  standings: readonly TournamentStanding[], language: Language,
): Promise<Blob> {
  const data = championCardData(standings, language);
  if (!data.champions) throw new Error('No completed tournament results');
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image export is unavailable');

  const background = ctx.createLinearGradient(0, 0, 1080, 1350);
  background.addColorStop(0, '#18234d');
  background.addColorStop(0.55, '#3b356e');
  background.addColorStop(1, '#17244d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.strokeStyle = '#f5c66a';
  ctx.lineWidth = 5;
  ctx.strokeRect(48, 48, 984, 1254);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c66a';
  ctx.font = 'bold 46px system-ui, sans-serif';
  ctx.fillText('POSADA SANTA', 540, 147);
  ctx.font = 'bold 29px system-ui, sans-serif';
  ctx.fillText(data.heading, 540, 206);
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText(data.subtitle, 540, 292);
  ctx.fillStyle = '#fff8ec';
  ctx.font = 'bold 58px system-ui, sans-serif';
  const winnerLines = textLines(ctx, data.champions, 875);
  const visibleWinners = winnerLines.slice(0, 3);
  visibleWinners.forEach((line, i) => ctx.fillText(line, 540, 365 + i * 65, 875));
  if (winnerLines.length > 3) {
    ctx.font = '25px system-ui, sans-serif';
    ctx.fillText('…', 540, 550);
  }
  ctx.fillStyle = '#f5c66a';
  ctx.fillRect(130, 575, 820, 2);

  ctx.textAlign = 'left';
  ctx.font = 'bold 31px system-ui, sans-serif';
  ctx.fillStyle = '#fff8ec';
  const maxRows = Math.min(12, data.rows.length);
  for (let i = 0; i < maxRows; i++) {
    const y = 635 + i * 47;
    if (i % 2 === 0) {
      ctx.fillStyle = '#ffffff12';
      ctx.fillRect(112, y - 33, 856, 44);
    }
    ctx.fillStyle = i === 0 ? '#f5c66a' : '#fff8ec';
    ctx.fillText(data.rows[i] ?? '', 145, y, 790);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c66a';
  ctx.font = '26px system-ui, sans-serif';
  ctx.fillText(data.footer, 540, 1260, 850);

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not generate tournament image');
  return blob;
}
