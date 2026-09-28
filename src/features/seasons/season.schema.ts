import { GAME_IDS, type GameId, type GameSeasonData, type SeasonDataset, type SeasonDateStatus } from "./season.types";

export type ValidationResult =
  | { success: true; data: SeasonDataset }
  | { success: false; errors: readonly string[] };

const statuses: readonly SeasonDateStatus[] = ["confirmed", "estimated", "unknown"];
const gameIds = new Set<string>(GAME_IDS);
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const isOptionalString = (value: unknown): value is string | null | undefined => value === undefined || value === null || isNonEmptyString(value);

export function isIsoDate(value: unknown): value is string {
  if (!isNonEmptyString(value) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}

function parseGame(value: unknown, expectedId: GameId, errors: string[]): GameSeasonData | null {
  const path = `games.${expectedId}`;
  if (!isObject(value)) { errors.push(`${path} must be an object`); return null; }
  if (value.gameId !== expectedId || !gameIds.has(String(value.gameId))) errors.push(`${path}.gameId must equal ${expectedId}`);
  if (!isNonEmptyString(value.gameName)) errors.push(`${path}.gameName is required`);
  if (!isIsoDate(value.lastUpdated)) errors.push(`${path}.lastUpdated must be an ISO timestamp`);
  if (value.source !== undefined && !isNonEmptyString(value.source)) errors.push(`${path}.source must be a non-empty string`);

  const current = value.currentSeason;
  if (!isObject(current)) errors.push(`${path}.currentSeason must be an object`);
  else {
    if (!isNonEmptyString(current.id)) errors.push(`${path}.currentSeason.id is required`);
    if (!isNonEmptyString(current.title)) errors.push(`${path}.currentSeason.title is required`);
    if (!isIsoDate(current.startDate)) errors.push(`${path}.currentSeason.startDate must be an ISO timestamp`);
    if (current.endDate !== undefined && current.endDate !== null && !isIsoDate(current.endDate)) errors.push(`${path}.currentSeason.endDate must be an ISO timestamp or null`);
  }

  const next = value.nextSeason;
  if (!isObject(next)) errors.push(`${path}.nextSeason must be an object`);
  else {
    if (!statuses.includes(next.status as SeasonDateStatus)) errors.push(`${path}.nextSeason.status is invalid`);
    if (!isOptionalString(next.title)) errors.push(`${path}.nextSeason.title must be a non-empty string or null`);
    if (next.startDate !== undefined && next.startDate !== null && !isIsoDate(next.startDate)) errors.push(`${path}.nextSeason.startDate must be an ISO timestamp or null`);
    if (next.status !== "unknown" && !isIsoDate(next.startDate)) errors.push(`${path}.nextSeason.startDate is required for dated statuses`);
    if (next.status === "unknown" && next.startDate != null) errors.push(`${path}.nextSeason.startDate must be null when status is unknown`);
  }

  return errors.some((error) => error.startsWith(path)) ? null : value as unknown as GameSeasonData;
}

export function validateSeasonDataset(value: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(value)) return { success: false, errors: ["dataset must be an object"] };
  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!isIsoDate(value.updatedAt)) errors.push("updatedAt must be an ISO timestamp");
  if (!isObject(value.games)) errors.push("games must be an object");
  else {
    const unexpectedIds = Object.keys(value.games).filter((id) => !gameIds.has(id));
    if (unexpectedIds.length) errors.push(`unsupported game IDs: ${unexpectedIds.join(", ")}`);
    for (const gameId of GAME_IDS) parseGame(value.games[gameId], gameId, errors);
  }
  return errors.length ? { success: false, errors } : { success: true, data: value as unknown as SeasonDataset };
}
