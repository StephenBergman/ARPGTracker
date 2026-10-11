import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mergeReviews, decideReview, gameFingerprint, isDeniedEvidence } from "./season-review.mjs";
import { validateReviewQueue, validateReviewDecision } from "../src/features/seasons/season-review.ts";
import { validateSeasonDataset } from "../src/features/seasons/season.schema.ts";

const original = JSON.parse(await readFile(new URL("../data/seasons.json", import.meta.url), "utf8"));
const now = new Date("2026-10-11T18:00:00Z");
const empty = () => ({ schemaVersion: 1, updatedAt: "2026-10-01T00:00:00Z", reviews: [] });
const data = () => ({ ...structuredClone(original), games: { ...structuredClone(original.games), torchlightInfinite: {
  gameId: "torchlightInfinite", gameName: "Torchlight: Infinite", currentSeason: { id: "tli-old", title: "Previous", startDate: "2026-07-01T02:00:00Z", endDate: null },
  nextSeason: { title: null, startDate: null, status: "unknown" }, source: "https://torchlight.xd.com/", lastUpdated: "2026-10-01T00:00:00Z",
} } });
const alert = { gameId: "torchlightInfinite", title: "Season: Tartarus", link: "https://torchlight.xd.com/", evidence: "SEASON LAUNCH: Oct 15, 7 PM PDT", reason: "Launch year missing", suggestedTitle: "Tartarus" };
const queue = (dataset = data()) => mergeReviews(empty(), [alert], dataset, now);
const decision = (reviews, changes = {}) => ({ reviewId: reviews.reviews[0].id, expectedBaseline: reviews.reviews[0].baseline, decision: "approve", target: "next", title: "Tartarus", startDate: "2026-10-16T02:00:00Z", status: "confirmed", ...changes });

test("turns ambiguous evidence into a validated, idempotent review queue", () => {
  const dataset = data(), result = queue(dataset);
  assert.equal(validateReviewQueue(result), true);
  assert.equal(result.reviews[0].baseline, gameFingerprint(dataset.games.torchlightInfinite));
  assert.equal(result.reviews[0].suggestedTitle, "Tartarus");
  assert.deepEqual(mergeReviews(result, [alert], dataset, new Date(now.getTime() + 1000)), result);
});
test("approval publishes only the reviewed game with its official source", () => {
  const dataset = data(), reviews = queue(dataset);
  const result = decideReview(dataset, reviews, decision(reviews, { source: "https://attacker.invalid" }), "StephenBergman", now);
  assert.equal(result.dataset.games.torchlightInfinite.nextSeason.title, "Tartarus");
  assert.equal(result.dataset.games.torchlightInfinite.nextSeason.status, "confirmed");
  assert.equal(result.dataset.games.torchlightInfinite.source, alert.link);
  assert.equal(result.queue.reviews[0].status, "approved");
  assert.equal(result.queue.reviews[0].decidedBy, "StephenBergman");
  assert.equal(result.dataset.updatedAt, now.toISOString());
  assert.deepEqual(result.dataset.games.poe, dataset.games.poe);
  assert.equal(dataset.games.torchlightInfinite.nextSeason.status, "unknown");
  assert.equal(reviews.reviews[0].status, "pending");
  assert.equal(validateSeasonDataset(result.dataset).success, true);
});
test("denial leaves public data untouched and the same evidence stays denied", () => {
  const dataset = data(), reviews = queue(dataset);
  const result = decideReview(dataset, reviews, decision(reviews, { decision: "deny" }), "StephenBergman", now);
  assert.deepEqual(result.dataset, dataset);
  assert.equal(result.queue.reviews[0].status, "denied");
  assert.deepEqual(mergeReviews(result.queue, [alert], dataset, now), result.queue);
  assert.equal(isDeniedEvidence(result.queue, alert.gameId, alert.link, alert.evidence), true);
  assert.equal(isDeniedEvidence(result.queue, alert.gameId, alert.link, "A corrected official announcement"), false);
});
test("changed evidence creates a fresh proposal and supersedes an older pending one", () => {
  const dataset = data(), reviews = queue(dataset);
  const result = mergeReviews(reviews, [{ ...alert, evidence: "New launch date: October 20" }], dataset, now);
  assert.equal(result.reviews.length, 2);
  assert.equal(result.reviews[0].status, "superseded");
  assert.equal(result.reviews[1].status, "pending");
});
test("stores only short excerpts but detects changes beyond the excerpt", () => {
  const dataset = data();
  const prefix = "Official season information ".repeat(100);
  const reviews = mergeReviews(empty(), [{ ...alert, evidence: `${prefix}old date` }], dataset, now);
  assert.ok(reviews.reviews[0].evidence.length <= 750);
  assert.ok(reviews.reviews[0].evidence.split(/\s+/).length <= 100);
  const changed = mergeReviews(reviews, [{ ...alert, evidence: `${prefix}new date` }], dataset, now);
  assert.equal(changed.reviews.length, 2);
  assert.equal(changed.reviews[0].status, "superseded");
});
test("rejects other accounts, replayed decisions and stale proposals", () => {
  const dataset = data(), reviews = queue(dataset), approve = decision(reviews);
  assert.throws(() => decideReview(dataset, reviews, approve, "SomeoneElse", now), /owner/);
  const approved = decideReview(dataset, reviews, approve, "StephenBergman", now);
  assert.throws(() => decideReview(approved.dataset, approved.queue, approve, "StephenBergman", now), /no longer pending/);
  dataset.games.torchlightInfinite.currentSeason.title = "A newer official season";
  assert.throws(() => decideReview(dataset, reviews, approve, "StephenBergman", now), /changed since/);
  assert.equal(mergeReviews(reviews, [], dataset, now).reviews[0].status, "superseded");
  const refreshed = mergeReviews(reviews, [alert], dataset, now);
  assert.equal(refreshed.reviews.length, 2);
  assert.equal(refreshed.reviews[1].status, "pending");
  assert.equal(refreshed.reviews[1].baseline, gameFingerprint(dataset.games.torchlightInfinite));
  assert.notEqual(refreshed.reviews[1].id, approve.reviewId);
});
test("baseline mismatches cannot approve a refreshed queue by accident", () => {
  const reviews = queue();
  assert.throws(() => decideReview(data(), reviews, decision(reviews, { expectedBaseline: "b".repeat(64) }), "StephenBergman", now), /review changed/);
});
test("supports estimated launches and announced titles without a date", () => {
  for (const changes of [{ status: "estimated" }, { status: "unknown", startDate: null }]) {
    const dataset = data(), reviews = queue(dataset);
    const result = decideReview(dataset, reviews, decision(reviews, changes), "StephenBergman", now);
    assert.equal(result.dataset.games.torchlightInfinite.nextSeason.status, changes.status);
    if (changes.status === "unknown") assert.equal(result.dataset.games.torchlightInfinite.nextSeason.startDate, null);
  }
});
test("can publish a live current season and clear an obsolete upcoming season", () => {
  const dataset = data();
  dataset.games.torchlightInfinite.nextSeason = { title: "Tartarus", startDate: "2026-10-10T02:00:00Z", status: "confirmed" };
  const reviews = queue(dataset);
  const result = decideReview(dataset, reviews, decision(reviews, { target: "current", startDate: "2026-10-10T02:00:00Z" }), "StephenBergman", now);
  assert.equal(result.dataset.games.torchlightInfinite.currentSeason.title, "Tartarus");
  assert.equal(result.dataset.games.torchlightInfinite.nextSeason.status, "unknown");
});
test("rejects impossible times, future current seasons and past next seasons", () => {
  const dataset = data(), reviews = queue(dataset);
  assert.equal(validateReviewDecision(decision(reviews, { startDate: "2026-02-30T02:00:00Z" })), false);
  assert.equal(validateReviewDecision(decision(reviews, { target: "current", status: "estimated" })), false);
  assert.equal(validateReviewDecision(decision(reviews, { status: "unknown" })), false);
  assert.throws(() => decideReview(dataset, reviews, decision(reviews, { target: "current" }), "StephenBergman", now), /future/);
  assert.throws(() => decideReview(dataset, reviews, decision(reviews, { startDate: "2026-10-01T02:00:00Z" }), "StephenBergman", now), /Next season/);
});
test("rejects malformed queues, unsupported games, duplicate IDs and off-site evidence", () => {
  const reviews = queue();
  for (const item of [null, { ...reviews, schemaVersion: 2 }, { ...reviews, reviews: [...reviews.reviews, reviews.reviews[0]] }, { ...reviews, reviews: [{ ...reviews.reviews[0], source: "https://attacker.invalid" }] }, { ...reviews, reviews: [{ ...reviews.reviews[0], gameId: "unknown" }] }]) {
    assert.equal(validateReviewQueue(item), false);
  }
  assert.equal(mergeReviews(empty(), [{ ...alert, link: "https://attacker.invalid" }], data(), now).reviews.length, 0);
});
