import { GAME_IDS, type GameSeasonData, type SeasonDataset } from "./season.types";

function confirmedStart(season: GameSeasonData): number | null {
  const next = season.nextSeason;
  if (next.status !== "confirmed" || !next.startDate) return null;
  const start = Date.parse(next.startDate);
  const currentStart = Date.parse(season.currentSeason.startDate);
  return Number.isFinite(start) && Number.isFinite(currentStart) && start > currentStart ? start : null;
}

/** Derive the display from official dates without modifying source/cache timestamps. */
export function rollOverConfirmedSeasons(dataset: SeasonDataset, now = Date.now()): SeasonDataset {
  let result = dataset;
  for (const gameId of GAME_IDS) {
    const season = dataset.games[gameId];
    const start = confirmedStart(season);
    const startDate = season.nextSeason.startDate;
    if (start === null || start > now || !startDate) continue;
    if (result === dataset) result = { ...dataset, games: { ...dataset.games } };
    result.games[gameId] = {
      ...season,
      currentSeason: {
        id: `${gameId}-season-${startDate}`,
        title: season.nextSeason.title ?? "New season",
        startDate,
        endDate: null,
      },
      nextSeason: { title: null, startDate: null, status: "unknown" },
    };
  }
  return result;
}

export function getNextConfirmedStart(dataset: SeasonDataset, now = Date.now()): string | null {
  let earliest = Infinity;
  let date: string | null = null;
  for (const gameId of GAME_IDS) {
    const season = dataset.games[gameId];
    const start = confirmedStart(season);
    if (start !== null && start > now && start < earliest) {
      earliest = start;
      date = season.nextSeason.startDate ?? null;
    }
  }
  return date;
}
