import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { validateReviewQueue, validateReviewDecision, isReviewSource } from "../src/features/seasons/season-review.ts";
import { validateSeasonDataset } from "../src/features/seasons/season.schema.ts";

const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const gameFingerprint = (game) => digest(game);
export const evidenceFingerprint = (evidence) => digest(evidence);
export function isDeniedEvidence(queue, gameId, source, evidence) {
  return queue.reviews.some((review) => review.status === "denied" && review.gameId === gameId && review.source === source && review.evidenceHash === evidenceFingerprint(evidence));
}

export function mergeReviews(queue, alerts, dataset, now = new Date()) {
  if (!validateReviewQueue(queue)) throw new Error("Invalid review queue");
  const result = structuredClone(queue);
  for (const review of result.reviews) {
    if (review.status === "pending" && review.baseline !== gameFingerprint(dataset.games[review.gameId])) review.status = "superseded";
  }
  for (const alert of alerts) {
    if (!alert.gameId || !isReviewSource(alert.gameId, alert.link)) continue;
    // Keep a short excerpt and a full-evidence fingerprint, rather than copying
    // whole publisher articles into the public repository.
    const evidence = (alert.evidence || "").trim().split(/\s+/).slice(0, 100).join(" ").slice(0, 750);
    const evidenceHash = evidenceFingerprint(alert.evidence || "");
    if (result.reviews.some((item) => ["approved", "denied"].includes(item.status) && item.gameId === alert.gameId && item.source === alert.link && item.evidenceHash === evidenceHash)) continue;
    const baseline = gameFingerprint(dataset.games[alert.gameId]);
    const id = digest([alert.gameId, alert.link, alert.title, evidenceHash, baseline]);
    if (result.reviews.some((item) => item.id === id)) continue;
    for (const previous of result.reviews) {
      if (previous.status === "pending" && previous.gameId === alert.gameId && previous.source === alert.link && previous.headline === alert.title) previous.status = "superseded";
    }
    result.reviews.push({ id, gameId: alert.gameId, headline: alert.title.slice(0, 240), source: alert.link, evidence, evidenceHash,
      reason: alert.reason.slice(0, 500), discoveredAt: now.toISOString(), baseline, status: "pending",
      ...(alert.suggestedTitle ? { suggestedTitle: alert.suggestedTitle.slice(0, 120) } : {}),
    });
  }
  if (!isDeepStrictEqual(result.reviews, queue.reviews)) result.updatedAt = now.toISOString();
  if (!validateReviewQueue(result)) throw new Error("Generated review queue is invalid");
  return result;
}

export function decideReview(dataset, queue, decision, actor, now = new Date()) {
  if (actor !== "StephenBergman") throw new Error("Only the repository owner can decide season reviews");
  if (!validateSeasonDataset(dataset).success || !validateReviewQueue(queue) || !validateReviewDecision(decision)) throw new Error("Invalid review decision or dataset");
  const result = { dataset: structuredClone(dataset), queue: structuredClone(queue) };
  const review = result.queue.reviews.find((item) => item.id === decision.reviewId);
  if (!review || review.status !== "pending") throw new Error("This review is no longer pending. Refresh the queue.");
  if (review.baseline !== decision.expectedBaseline) throw new Error("This review changed. Refresh the queue.");
  const game = result.dataset.games[review.gameId];
  if (decision.decision === "approve") {
    if (gameFingerprint(game) !== review.baseline) throw new Error("Season data changed since this proposal. Run the source scan and review again.");
    const startDate = decision.startDate || null;
    if (decision.target === "current") {
      if (Date.parse(startDate) > now.getTime() || Date.parse(startDate) < Date.parse(game.currentSeason.startDate)) throw new Error("Current season start must not be in the future or older than the current season");
      game.currentSeason = { id: `${review.gameId}-review-${review.id.slice(0, 16)}`, title: decision.title.trim(), startDate, endDate: null };
      if (game.nextSeason.startDate && Date.parse(game.nextSeason.startDate) <= Date.parse(startDate)) game.nextSeason = { title: null, startDate: null, status: "unknown" };
    } else {
      if (startDate && (Date.parse(startDate) <= now.getTime() || Date.parse(startDate) <= Date.parse(game.currentSeason.startDate))) throw new Error("Next season must start after now and after the current season");
      game.nextSeason = { title: decision.title.trim(), startDate, status: decision.status };
    }
    game.source = review.source;
    game.lastUpdated = now.toISOString();
    result.dataset.updatedAt = now.toISOString();
  }
  review.status = decision.decision === "approve" ? "approved" : "denied";
  review.decidedAt = now.toISOString();
  review.decidedBy = actor;
  // Keep the decision fingerprint so the same rejected evidence cannot reappear.
  review.evidence = "";
  result.queue.updatedAt = now.toISOString();
  if (!validateSeasonDataset(result.dataset).success || !validateReviewQueue(result.queue)) throw new Error("Review would create invalid season data");
  return result;
}
