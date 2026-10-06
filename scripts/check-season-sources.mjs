import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { candidatesFromHtml, findRelevantCandidates, plainText } from "./season-source-parser.mjs";

const dataset = JSON.parse(await readFile(new URL("../data/seasons.json", import.meta.url), "utf8"));
const sources = [
  { games: ["poe", "poe2"], name: "Path of Exile news", url: "https://www.pathofexile.com/news/rss" },
  { games: ["diablo4"], name: "Diablo IV news", url: "https://news.blizzard.com/en-us/diablo4" },
  { games: ["diablo2Resurrected"], name: "Diablo II: Resurrected news", url: "https://news.blizzard.com/en-us/diablo2" },
  { games: ["lastEpoch"], name: "Last Epoch patch notes", url: "https://lastepoch.com/patchnotes/" },
  { games: ["projectDiablo2"], name: "Project Diablo 2", url: "https://www.projectdiablo2.com/" },
  { games: ["torchlightInfinite"], name: "Torchlight: Infinite Steam news", url: "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=1974050&count=20&maxlength=1200&format=json" },
];


function candidatesFromXml(body) {
  return [...body.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(([item]) => ({
    title: plainText(item.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "Untitled announcement"),
    link: plainText(item.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? ""),
    published: plainText(item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ?? ""),
  }));
}

function candidatesFromSteam(body) {
  const parsed = JSON.parse(body);
  return (parsed.appnews?.newsitems ?? []).map((item) => ({ title: item.title, link: item.url, published: new Date(item.date * 1000).toISOString() }));
}


const alerts = [];
const failures = [];
for (const source of sources) {
  try {
    const response = await fetch(source.url, { headers: { "user-agent": "ARPGTracker season monitor/1.0" }, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.text();
    const items = source.url.includes("api.steampowered.com") ? candidatesFromSteam(body) : body.includes("<item") ? candidatesFromXml(body) : candidatesFromHtml(body, source.url);
    const relevant = findRelevantCandidates(items, source.games.map((id) => dataset.games[id]));
    if (relevant.length) alerts.push({ source, relevant });
  } catch (error) { failures.push(`${source.name}: ${error instanceof Error ? error.message : String(error)}`); }
}

const lines = ["## Daily official-source scan", "", `Dataset timestamp: \`${dataset.updatedAt}\``, ""];
if (alerts.length) {
  lines.push("Potential newer season information was found. Verify it before editing `data/seasons.json`:", "");
  for (const { source, relevant } of alerts) {
    lines.push(`### ${source.name}`, "");
    for (const item of relevant) lines.push(`- [${item.title}](${item.link || source.url})${item.published ? ` — ${item.published}` : ""}`);
    lines.push("");
  }
} else lines.push("No potential newer season announcements were found.", "");
if (failures.length) lines.push("### Sources that could not be checked", "", ...failures.map((failure) => `- ${failure}`), "");
const report = lines.join("\n");
await writeFile(new URL("../season-source-report.md", import.meta.url), report);
const fingerprint = createHash("sha256").update(JSON.stringify(alerts)).digest("hex").slice(0, 12);
if (process.env.GITHUB_OUTPUT) await writeFile(process.env.GITHUB_OUTPUT, `alerts=${alerts.length ? "true" : "false"}\nfingerprint=${fingerprint}\n`, { flag: "a" });
console.log(report);
