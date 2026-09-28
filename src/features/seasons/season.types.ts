export const GAME_IDS = [
  "poe",
  "poe2",
  "diablo4",
  "lastEpoch",
  "diablo2Resurrected",
  "projectDiablo2",
  "torchlightInfinite",
] as const;

export type GameId = (typeof GAME_IDS)[number];
export type SeasonDateStatus = "confirmed" | "estimated" | "unknown";

export interface CurrentSeason {
  id: string;
  title: string;
  startDate: string;
  endDate?: string | null;
}

export interface NextSeason {
  title?: string | null;
  startDate?: string | null;
  status: SeasonDateStatus;
}

export interface GameSeasonData {
  gameId: GameId;
  gameName: string;
  currentSeason: CurrentSeason;
  nextSeason: NextSeason;
  source?: string;
  lastUpdated: string;
}

export interface SeasonDataset {
  schemaVersion: 1;
  updatedAt: string;
  games: Record<GameId, GameSeasonData>;
}
