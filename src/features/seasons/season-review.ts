import { GAME_IDS, type GameId } from "./season.types.ts";
import { isIsoDate } from "./season.schema.ts";

export interface SeasonReview {
  id: string;
  gameId: GameId;
  headline: string;
  source: string;
  evidence: string;
  evidenceHash: string;
  reason: string;
  discoveredAt: string;
  baseline: string;
  status: "pending" | "approved" | "denied" | "superseded";
  suggestedTitle?: string;
  decidedAt?: string;
  decidedBy?: string;
}
export interface SeasonReviewQueue { schemaVersion: 1; updatedAt: string; reviews: SeasonReview[]; }
export interface SeasonReviewDecision {
  reviewId: string;
  expectedBaseline: string;
  decision: "approve" | "deny";
  target?: "current" | "next";
  title?: string;
  startDate?: string | null;
  status?: "confirmed" | "estimated" | "unknown";
}

const officialHosts: Record<GameId, readonly string[]> = {
  poe: ["www.pathofexile.com", "steamcommunity.com", "store.steampowered.com", "steamstore-a.akamaihd.net"],
  poe2: ["www.pathofexile.com", "pathofexile2.com", "steamcommunity.com", "store.steampowered.com", "steamstore-a.akamaihd.net"],
  diablo4: ["news.blizzard.com"], diablo2Resurrected: ["news.blizzard.com"],
  lastEpoch: ["lastepoch.com", "forum.lastepoch.com", "steamcommunity.com", "store.steampowered.com", "steamstore-a.akamaihd.net"],
  projectDiablo2: ["www.projectdiablo2.com"], torchlightInfinite: ["torchlight.xd.com"],
};
export function isReviewSource(gameId: GameId, value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && officialHosts[gameId].includes(url.hostname);
  } catch { return false; }
}
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const hash = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

export function validateReviewQueue(value: unknown): value is SeasonReviewQueue {
  if (!object(value) || value.schemaVersion !== 1 || !isIsoDate(value.updatedAt) || !Array.isArray(value.reviews) || value.reviews.length > 1000) return false;
  const ids = new Set<string>();
  for (const review of value.reviews) {
    if (!object(review) || !hash(review.id) || ids.has(review.id) || !hash(review.baseline) || !hash(review.evidenceHash) || !GAME_IDS.includes(review.gameId as GameId)) return false;
    if (!text(review.headline, 240) || !text(review.source, 2000) || !isReviewSource(review.gameId as GameId, review.source) || !text(review.reason, 500)) return false;
    if (typeof review.evidence !== "string" || review.evidence.length > 750 || !isIsoDate(review.discoveredAt)) return false;
    if (!["pending", "approved", "denied", "superseded"].includes(String(review.status))) return false;
    if (review.suggestedTitle !== undefined && !text(review.suggestedTitle, 120)) return false;
    if (review.decidedAt !== undefined && !isIsoDate(review.decidedAt)) return false;
    if (review.decidedBy !== undefined && !text(review.decidedBy, 100)) return false;
    if ((review.status === "approved" || review.status === "denied") && (!isIsoDate(review.decidedAt) || review.decidedBy !== "StephenBergman")) return false;
    ids.add(review.id);
  }
  return true;
}

export function validateReviewDecision(value: unknown): value is SeasonReviewDecision {
  if (!object(value) || !hash(value.reviewId) || !hash(value.expectedBaseline) || !["approve", "deny"].includes(String(value.decision))) return false;
  if (value.decision === "deny") return true;
  if (!["current", "next"].includes(String(value.target)) || !text(value.title, 120) || !["confirmed", "estimated", "unknown"].includes(String(value.status))) return false;
  if (value.target === "current" && value.status !== "confirmed") return false;
  if (value.status === "unknown") return value.target === "next" && value.startDate == null;
  if (!isIsoDate(value.startDate)) return false;
  // Date.parse alone accepts impossible dates such as February 30.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value.startDate)) return false;
  const canonical = value.startDate.includes(".") ? value.startDate : `${value.startDate.slice(0, -1)}.000Z`;
  return new Date(value.startDate).toISOString() === canonical;
}
