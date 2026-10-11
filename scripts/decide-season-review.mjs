import { readFile, writeFile } from "node:fs/promises";
import { decideReview } from "./season-review.mjs";

const dataPath = new URL("../data/seasons.json", import.meta.url);
const queuePath = new URL("../data/season-reviews.json", import.meta.url);
const dataset = JSON.parse(await readFile(dataPath, "utf8"));
const queue = JSON.parse(await readFile(queuePath, "utf8"));
// Workflow inputs arrive as data, never interpolated into a shell command.
const decision = JSON.parse(process.env.SEASON_REVIEW_DECISION || "null");
const result = decideReview(dataset, queue, decision, process.env.GITHUB_ACTOR);
if (decision.decision === "approve") {
  for (const path of [dataPath, new URL("../src/data/default-seasons.json", import.meta.url)]) await writeFile(path, `${JSON.stringify(result.dataset, null, 2)}\n`);
}
await writeFile(queuePath, `${JSON.stringify(result.queue, null, 2)}\n`);
console.log(`Season review ${decision.reviewId}: ${decision.decision === "approve" ? "approved" : "denied"}`);
