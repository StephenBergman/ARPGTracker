import { plainText } from "./season-source-parser.mjs";

const DAY = 86_400_000;
const offsets = { UTC: 0, GMT: 0, PDT: -7, PST: -8, EDT: -4, EST: -5, CDT: -5, CST: -6, CEST: 2, CET: 1 };
const zoneNames = { PDT: "America/Los_Angeles", PST: "America/Los_Angeles", EDT: "America/New_York", EST: "America/New_York", CDT: "America/Chicago", CST: "America/Chicago", CEST: "Europe/Paris", CET: "Europe/Paris" };
const months = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");
const datePattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?\s*(?:,|at)?\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*(UTC|GMT|PDT|PST|EDT|EST|CDT|CST|CEST|CET)\b/gi;
const excluded = /\b(preview|reveal|livestream|stream|beta|PTR|maintenance|drops|sale|race|patch notes|early access to|estimated|tentative|expected|approximately|delayed|postponed|cancelled)\b/i;
const launch = /\b(?:season launch\s*:|(?:season|league|ladder|cycle|Path of Exile(?: 2)?)\b.{0,100}?\b(?:will\s+)?(?:begins?|starts?|launch(?:es)?|arrives?|releases?|go(?:es)? live)\b)/i;

export function announcementLines(body) {
  return body.replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(?:p|div|h[1-6]|li|section)>|<br\s*\/?>|\[\/?(?:p|h[1-6])\]/gi, "\n")
    .replace(/\[[^\]\n]+\]/g, " ").split(/\n+/).map(plainText).filter(Boolean);
}

// Only precise times are eligible. Missing years use the nearest occurrence to
// the publication date, or the scan date when the announcement is undated.
export function parseLaunchDate(text, published, now = new Date()) {
  const results = [];
  for (const match of text.matchAll(datePattern)) {
    const [, monthText, dayText, yearText, hourText, minuteText, meridiem, zone] = match;
    const month = months.indexOf(monthText.toLowerCase().slice(0, 3));
    const day = Number(dayText), minute = Number(minuteText || 0);
    let hour = Number(hourText);
    if (meridiem) {
      if (hour < 1 || hour > 12) return null;
      hour = hour % 12 + (/^p/i.test(meridiem) ? 12 : 0);
    } else if (!minuteText) return null;
    if (hour > 23 || minute > 59 || day < 1 || day > 31) return null;
    const publicationDate = Date.parse(published);
    const anchor = Number.isFinite(publicationDate) ? publicationDate : now.getTime();
    if (!Number.isFinite(anchor)) return null;
    const years = yearText ? [Number(yearText)] : [-1, 0, 1].map((delta) => new Date(anchor).getUTCFullYear() + delta);
    const candidates = years.map((year) => {
      const local = new Date(Date.UTC(year, month, day, hour, minute));
      if (local.getUTCMonth() !== month || local.getUTCDate() !== day) return NaN;
      return local.getTime() - offsets[zone.toUpperCase()] * 3_600_000;
    }).filter(Number.isFinite).sort((a, b) => Math.abs(a - anchor) - Math.abs(b - anchor));
    if (!candidates.length || (!yearText && candidates.length > 1 && Math.abs(candidates[0] - anchor) === Math.abs(candidates[1] - anchor))) return null;
    const date = candidates[0];
    if (date < now.getTime() - 180 * DAY || date > now.getTime() + 365 * DAY) return null;
    const zoneName = zoneNames[zone.toUpperCase()];
    if (zoneName) {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: zoneName, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(date);
      if (Number(parts.find((part) => part.type === "hour")?.value) !== hour || Number(parts.find((part) => part.type === "minute")?.value) !== minute) return null;
    }
    results.push(new Date(date).toISOString().replace(".000Z", "Z"));
  }
  const unique = [...new Set(results)];
  return unique.length === 1 ? unique[0] : null;
}

function seasonTitle(gameId, lines) {
  const patterns = {
    projectDiablo2: /^Season \d+: [\p{L}\d '\u2019-]+$/u,
    diablo2Resurrected: /\bLadder Season \d+\b/i,
    diablo4: /\bSeason of [\p{L} '\u2019-]+/u,
    lastEpoch: /\bSeason \d+: [\p{L}\d '\u2019-]+/u,
    poe: /\bPath of Exile(?: 1)?: [\p{L}\d '\u2019-]+/u,
    poe2: /\bPath of Exile 2: [\p{L}\d '\u2019-]+/u,
    torchlightInfinite: /^New Seasonal Mechanic: [\p{L}\d '\u2019-]+$/u,
  };
  const found = [];
  for (const line of lines) {
    const match = line.match(patterns[gameId]);
    if (!match) continue;
    const title = match[0].replace(/\s+(?:will\s+)?(?:launch(?:es|ing)?|begin(?:s)?|start(?:s)?|arrive(?:s)?|go(?:es)? live)\b.*$/i, "")
      .replace(/^New Seasonal Mechanic: /, "").replace(/^Path of Exile(?: [12])?: /, "").trim();
    if (title.length > 3 && title.length < 100 && !excluded.test(title)) found.push(title);
  }
  const unique = [...new Set(found)];
  return unique.length === 1 ? unique[0] : null;
}

export function extractSeasonUpdate(gameId, article, now = new Date()) {
  if (typeof article.body !== "string") return { reason: "Article body unavailable" };
  if (excluded.test(article.title)) return { reason: "Not a season launch announcement" };
  const lines = announcementLines(article.body);
  // PoE feeds cross-post both games. Require the matching game in the article.
  if (gameId === "poe" && /Path of Exile 2/i.test(article.title)) return { reason: "Announcement is for Path of Exile 2" };
  const title = seasonTitle(gameId, lines.filter((line) => launch.test(line) && !excluded.test(line))) || seasonTitle(gameId, [...lines, article.title]);
  if (!title) return { reason: "No unambiguous season title" };
  const dates = [];
  for (const line of lines) {
    if (!launch.test(line) || excluded.test(line)) continue;
    const namedTitle = seasonTitle(gameId, [line]);
    if (namedTitle && namedTitle !== title) continue;
    // A paragraph mentioning multiple seasons is unsafe to associate automatically.
    if ([...line.matchAll(/\b(?:Season|League|Cycle) \d+\b/gi)].length > 1) continue;
    const date = parseLaunchDate(line, article.published, now);
    if (date) dates.push(date);
  }
  const unique = [...new Set(dates)];
  if (unique.length !== 1) return { reason: "Launch time is missing, ambiguous, or has an unclear year/timezone", suggestedTitle: title };
  return { update: { title, startDate: unique[0], source: article.link, published: article.published } };
}

export function applySeasonUpdates(dataset, gameId, updates, now = new Date()) {
  const result = structuredClone(dataset);
  const game = result.games[gameId];
  const changed = [];
  const stamp = now.toISOString().replace(".000Z", "Z");
  // Conflicting claims are never resolved by array order or a guessed date.
  const byTitle = new Map();
  for (const update of updates) {
    const key = update.title.toLowerCase();
    const group = byTitle.get(key) || [];
    group.push(update);
    byTitle.set(key, group);
  }
  const safe = [...byTitle.values()].filter((group) => new Set(group.map((item) => item.startDate)).size === 1).map((group) => group[0]);
  const dates = new Map();
  for (const update of safe) dates.set(update.startDate, (dates.get(update.startDate) || 0) + 1);
  for (const update of safe.filter((item) => dates.get(item.startDate) === 1).sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate))) {
    const start = Date.parse(update.startDate);
    const current = Date.parse(game.currentSeason.startDate);
    // Never rewrite history or silently revise an already-confirmed date.
    if (start <= current || update.title.toLowerCase() === game.currentSeason.title.toLowerCase()) continue;
    if (game.nextSeason.status === "confirmed" && game.nextSeason.title?.toLowerCase() === update.title.toLowerCase() && game.nextSeason.startDate !== update.startDate) continue;
    if (start <= now.getTime()) {
      if (game.nextSeason.status === "confirmed" && Date.parse(game.nextSeason.startDate) > start) continue;
      game.currentSeason = { id: `${gameId}-${update.startDate.slice(0, 10)}-${update.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}`, title: update.title, startDate: update.startDate, endDate: null };
      game.nextSeason = { title: null, startDate: null, status: "unknown" };
    } else {
      if (game.nextSeason.status === "confirmed") continue;
      game.nextSeason = { title: update.title, startDate: update.startDate, status: "confirmed" };
    }
    game.source = update.source;
    game.lastUpdated = stamp;
    changed.push(`${game.gameName}: ${update.title} — ${update.startDate}`);
  }
  if (changed.length) result.updatedAt = stamp;
  return { dataset: result, changed };
}
