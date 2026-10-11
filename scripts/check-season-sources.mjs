import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { candidatesFromHtml, plainText } from "./season-source-parser.mjs";
import { sources, loadAnnouncements, fetchText } from "./season-sources.mjs";
import { extractSeasonUpdate, applySeasonUpdates } from "./season-auto-update.mjs";
import { validateSeasonDataset } from "../src/features/seasons/season.schema.ts";
import { mergeReviews, isDeniedEvidence } from "./season-review.mjs";
import { validateReviewQueue } from "../src/features/seasons/season-review.ts";

const paths = ["../data/seasons.json", "../src/data/default-seasons.json"].map((path) => new URL(path, import.meta.url));
let dataset = JSON.parse(await readFile(paths[0], "utf8"));
const initial = validateSeasonDataset(dataset);
if (!initial.success) throw new Error(`Existing season dataset is invalid: ${initial.errors.join("; ")}`);
const write = process.argv.includes("--write");
const now = new Date();
const alerts = [], failures = [], changes = [];
const queuePath = new URL("../data/season-reviews.json", import.meta.url);
const queue = JSON.parse(await readFile(queuePath, "utf8"));
if (!validateReviewQueue(queue)) throw new Error("Existing season review queue is invalid");

for (const source of sources) {
  try {
    const articles = await loadAnnouncements(source);
    const game = dataset.games[source.gameId];
    const candidates = [];
    for (const article of articles) {
      if (source.kind !== "homepage" && !/\b(season|league|ladder|cycle|Path of Exile(?: 2)?:)\b/i.test(article.title)) continue;
      const published = Date.parse(article.published);
      if (Number.isFinite(published) && published < now.getTime() - 180 * 86_400_000) continue;
      try {
        if (article.body === null) article.body = await fetchText(article.link);
        if (isDeniedEvidence(queue, source.gameId, article.link, plainText(article.body))) continue;
        const result = extractSeasonUpdate(source.gameId, article, now);
        if (result.update) candidates.push(result.update);
        else {
          const titles = source.kind === "homepage"
            ? candidatesFromHtml(article.body, source.url).map((item) => item.title)
            : [plainText(article.title)];
          // The Torchlight homepage uses divs instead of semantic headings.
          if (source.gameId === "torchlightInfinite") {
            const mechanic = plainText(article.body).match(/New Seasonal Mechanic:\s*([\p{L}\d '\u2019-]+?)(?= Capture| New |$)/u);
            if (mechanic) titles.push(`Season: ${mechanic[1].trim()}`);
          }
          for (const title of titles) {
            const known = [game.currentSeason.title, game.nextSeason.title].filter(Boolean).some((knownTitle) => title.toLowerCase().includes(knownTitle.toLowerCase()));
            if (!known) alerts.push({ gameId: source.gameId, source: source.name, title, link: article.link, reason: result.reason,
              evidence: plainText(article.body), suggestedTitle: result.suggestedTitle });
          }
        }
      } catch (error) { failures.push(`${source.name}: ${article.link}: ${error.message}`); }
    }
    const applied = applySeasonUpdates(dataset, source.gameId, candidates, now);
    dataset = applied.dataset;
    changes.push(...applied.changed);
    for (const candidate of candidates) {
      const updatedGame = dataset.games[source.gameId];
      const recorded = [updatedGame.currentSeason, updatedGame.nextSeason].some((season) => season.title?.toLowerCase() === candidate.title.toLowerCase() && season.startDate === candidate.startDate);
      if (!recorded && Date.parse(candidate.startDate) > Date.parse(updatedGame.currentSeason.startDate)) {
        alerts.push({ gameId: source.gameId, source: source.name, title: candidate.title, link: candidate.source,
          evidence: plainText(articles.find((item) => item.link === candidate.source)?.body || ""), suggestedTitle: candidate.title,
          reason: "Conflicts with another announcement or an existing confirmed date" });
      }
    }
  } catch (error) { failures.push(`${source.name}: ${error.message}`); }
}

const updatedQueue = mergeReviews(queue, alerts.filter((item) => item.reason !== "Not a season launch announcement"), dataset, now);
const queueChanged = JSON.stringify(updatedQueue) !== JSON.stringify(queue);
if (write && queueChanged) await writeFile(queuePath, `${JSON.stringify(updatedQueue, null, 2)}\n`);
if (write && changes.length) {
  const validated = validateSeasonDataset(dataset);
  if (!validated.success) throw new Error(`Generated season dataset is invalid: ${validated.errors.join("; ")}`);
  const json = `${JSON.stringify(dataset, null, 2)}\n`;
  for (const path of paths) await writeFile(path, json);
}
const lines = ["## Automatic official-source scan", "", `Dataset timestamp: ${dataset.updatedAt}`, ""];
lines.push(`Pending personal reviews: ${updatedQueue.reviews.filter((item) => item.status === "pending").length}`, "");
if (changes.length) lines.push(write ? "Automatically updated:" : "Dry run — would update:", "", ...changes.map((change) => `- ${change}`), "");
if (alerts.length) lines.push("Announcements requiring review (existing information was preserved):", "",
  ...alerts.map((item) => `- [${item.title.replace(/[\[\]\r\n]/g, " ")}](${item.link}) — ${item.reason} (${item.source})`), "");
if (failures.length) lines.push("Sources that could not be checked:", "", ...failures.map((failure) => `- ${failure}`), "");
if (!changes.length && !alerts.length && !failures.length) lines.push("No new season information found.", "");
const report = lines.join("\n");
await writeFile(new URL("../season-source-report.md", import.meta.url), report);
const fingerprint = createHash("sha256").update(JSON.stringify({ alerts, failures })).digest("hex").slice(0, 12);
if (process.env.GITHUB_OUTPUT) await writeFile(process.env.GITHUB_OUTPUT,
  `alerts=${alerts.length || failures.length ? "true" : "false"}\nchanged=${changes.length || queueChanged ? "true" : "false"}\nfingerprint=${fingerprint}\n`, { flag: "a" });
console.log(report);
