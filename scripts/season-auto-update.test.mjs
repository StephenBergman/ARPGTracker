import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { extractSeasonUpdate, parseLaunchDate, applySeasonUpdates } from "./season-auto-update.mjs";
import { loadAnnouncements, sources, isOfficialArticle } from "./season-sources.mjs";
import { validateSeasonDataset } from "../src/features/seasons/season.schema.ts";

const now = new Date("2026-10-11T12:00:00Z");
const article = (body, title = "New season launch") => ({ title, body, published: "2026-10-01T12:00:00Z", link: "https://torchlight.xd.com/" });
const original = JSON.parse(await readFile(new URL("../data/seasons.json", import.meta.url), "utf8"));
const fixture = () => ({
  ...structuredClone(original), updatedAt: "2026-10-01T00:00:00Z",
  games: { ...structuredClone(original.games), torchlightInfinite: {
    gameId: "torchlightInfinite", gameName: "Torchlight: Infinite",
    currentSeason: { id: "tli-old", title: "Previous", startDate: "2026-07-01T00:00:00Z", endDate: null },
    nextSeason: { title: null, startDate: null, status: "unknown" },
    source: "https://torchlight.xd.com/", lastUpdated: "2026-10-01T00:00:00Z",
  } },
});
const update = (title = "Tartarus", startDate = "2026-10-16T02:00:00Z") => ({ title, startDate, source: "https://torchlight.xd.com/" });

for (const [gameId, body, expected] of [
  ["poe", "<p>Path of Exile: New Embers launches on October 15, 2026 at 7 PM PDT.</p>", "New Embers"],
  ["poe2", "<p>Path of Exile 2: New Depths launches on October 15, 2026 at 7 PM PDT.</p>", "New Depths"],
  ["diablo4", "<p>Season of New Shadows starts on October 15, 2026 at 7 PM PDT.</p>", "Season of New Shadows"],
  ["diablo2Resurrected", "<p>Ladder Season 16 begins on October 15, 2026 at 7 PM PDT.</p>", "Ladder Season 16"],
  ["lastEpoch", "[p][b]Season 6: New Ages[/b] launches on October 15, 2026 at 7 PM PDT.[/p]", "Season 6: New Ages"],
  ["projectDiablo2", "<h2>Season 15: New Alliance</h2><p>The season begins October 15, 2026 at 7 PM PDT.</p>", "Season 15: New Alliance"],
  ["torchlightInfinite", "<div>New Seasonal Mechanic: Tartarus</div><div>SEASON LAUNCH: Oct 15, 2026, 7 PM PDT</div>", "Tartarus"],
]) {
  test(`extracts an explicit developer launch for ${gameId}`, () => {
    const result = extractSeasonUpdate(gameId, article(body), now);
    assert.equal(result.update?.title, expected, result.reason);
    assert.equal(result.update?.startDate, "2026-10-16T02:00:00Z");
  });
}

test("handles publication-year inference across New Year", () => {
  assert.equal(parseLaunchDate("January 5 at 19:00 UTC", "2026-12-20T00:00:00Z", new Date("2026-12-21T00:00:00Z")), "2027-01-05T19:00:00Z");
});
test("never guesses missing homepage years, times, or timezones", () => {
  for (const text of ["October 15 at 7 PM PDT", "October 15, 2026", "October 15, 2026 at 7 PM", "October 15, 2026 at 7 PT"]) {
    assert.equal(parseLaunchDate(text, "", now), null);
  }
});
test("rejects impossible dates, ambiguous 12-hour times, stale dates and timezone mismatches", () => {
  for (const text of ["February 30, 2026 at 19:00 UTC", "October 15, 2026 at 13 PM PDT", "October 15, 2026 at 7 PST", "October 15, 2026 at 7 PM PST", "January 1, 2020 at 19:00 UTC", "October 15, 2026 at 25:00 UTC"]) {
    assert.equal(parseLaunchDate(text, "", now), null, text);
  }
  assert.equal(parseLaunchDate("November 15, 2026 at 7 PM PST", "", now), "2026-11-16T03:00:00Z");
});
test("rejects conflicting launch times", () => {
  const body = "<h2>Ladder Season 16</h2><p>The season begins October 15, 2026 at 7 PM PDT.</p><p>The season begins October 16, 2026 at 7 PM PDT.</p>";
  assert.equal(extractSeasonUpdate("diablo2Resurrected", article(body), now).update, undefined);
});
test("ignores preview, beta, sale, race and patch announcements", () => {
  for (const title of ["Season preview", "Season beta", "Season sale", "Season race", "Season patch notes", "Season delayed"]) {
    const result = extractSeasonUpdate("diablo2Resurrected", article("<p>Ladder Season 16 begins October 15, 2026 at 7 PM PDT.</p>", title), now);
    assert.equal(result.update, undefined, title);
  }
});
test("does not treat script content or a preview date as the launch", () => {
  const body = '<h2>Ladder Season 16</h2><script>"The season begins October 15, 2026 at 7 PM PDT"</script><p>The season preview starts October 15, 2026 at 7 PM PDT.</p>';
  assert.equal(extractSeasonUpdate("diablo2Resurrected", article(body), now).update, undefined);
});
test("keeps multiple seasons and cross-posted games separate", () => {
  const body = "<p>Ladder Season 16 begins October 15, 2026 at 7 PM PDT.</p><p>Ladder Season 17 begins October 16, 2026 at 7 PM PDT.</p>";
  assert.equal(extractSeasonUpdate("diablo2Resurrected", article(body), now).update, undefined);
  assert.equal(extractSeasonUpdate("poe", article("<p>Path of Exile 2: New Depths launches October 15, 2026 at 7 PM PDT.</p>", "Path of Exile 2: New Depths"), now).update, undefined);
});
test("adds an upcoming season without mutating the input, and is idempotent", () => {
  const input = fixture();
  const result = applySeasonUpdates(input, "torchlightInfinite", [update()], now);
  assert.equal(result.dataset.games.torchlightInfinite.nextSeason.title, "Tartarus");
  assert.equal(result.dataset.games.torchlightInfinite.nextSeason.status, "confirmed");
  assert.equal(input.games.torchlightInfinite.nextSeason.status, "unknown");
  assert.equal(result.dataset.updatedAt, "2026-10-11T12:00:00Z");
  assert.equal(validateSeasonDataset(result.dataset).success, true);
  assert.deepEqual(applySeasonUpdates(result.dataset, "torchlightInfinite", [update()], now).changed, []);
});
test("promotes a launched season, clears old next-season data, and retains other games", () => {
  const input = fixture();
  const result = applySeasonUpdates(input, "torchlightInfinite", [update("New Current", "2026-10-10T02:00:00Z")], now);
  assert.equal(result.dataset.games.torchlightInfinite.currentSeason.title, "New Current");
  assert.equal(result.dataset.games.torchlightInfinite.nextSeason.status, "unknown");
  assert.deepEqual(result.dataset.games.poe, input.games.poe);
});
test("preserves history, confirmed dates and timestamps when no reliable update exists", () => {
  const input = fixture();
  input.games.torchlightInfinite.nextSeason = { title: "Tartarus", startDate: "2026-10-16T02:00:00Z", status: "confirmed" };
  for (const candidates of [[], [update("Old", "2026-06-01T00:00:00Z")], [update("Tartarus", "2026-10-17T02:00:00Z")], [update("Different", "2026-10-20T02:00:00Z")]]) {
    assert.deepEqual(applySeasonUpdates(input, "torchlightInfinite", candidates, now).dataset, input);
  }
});
test("rejects conflicting sources regardless of input order", () => {
  const input = fixture();
  for (const candidates of [[update(), update("Tartarus", "2026-10-17T02:00:00Z")], [update(), update("Different")]]) {
    assert.deepEqual(applySeasonUpdates(input, "torchlightInfinite", candidates, now).dataset, input);
    assert.deepEqual(applySeasonUpdates(input, "torchlightInfinite", candidates.reverse(), now).dataset, input);
  }
});
test("covers every configured game with a trusted source", () => {
  assert.deepEqual(sources.map((item) => item.gameId).sort(), Object.keys(original.games).sort());
  for (const source of sources) {
    assert.equal(isOfficialArticle("https://attacker.invalid/season", source), false);
    assert.equal(isOfficialArticle("javascript:alert(1)", source), false);
  }
});
test("filters Steam feeds to the matching game's developer announcements", async () => {
  const source = sources.find((item) => item.gameId === "poe");
  const item = { appid: source.appid, feedname: "steam_community_announcements", title: "Season launch", contents: "Launch details", date: 1790856000, url: "https://steamcommunity.com/games/238960/announcements/detail/1" };
  const fetcher = async () => new Response(JSON.stringify({ appnews: { appid: source.appid, newsitems: [item, { ...item, appid: 999 }, { ...item, feedname: "third_party" }, { ...item, url: "https://attacker.invalid" }] } }));
  assert.equal((await loadAnnouncements(source, fetcher)).length, 1);
});
test("source failures and malformed feeds reject without producing updates", async () => {
  const source = sources[0];
  await assert.rejects(loadAnnouncements(source, async () => new Response("offline", { status: 503 })));
  await assert.rejects(loadAnnouncements(source, async () => new Response("{broken")));
  await assert.rejects(loadAnnouncements(source, async () => new Response('{"appnews":{"appid":999}}')));
});

test("loads Blizzard articles only from the official origin", async () => {
  const source = sources.find((item) => item.gameId === "diablo4");
  const properties = { title: "New Season", newsUrl: "https://news.blizzard.com/en-us/article/1/new-season", lastUpdated: "2026-10-01T12:00:00Z" };
  const fetcher = async () => new Response(JSON.stringify({ contentItems: [{ properties }, { properties: { ...properties, newsUrl: "https://attacker.invalid/season" } }] }));
  const articles = await loadAnnouncements(source, fetcher);
  assert.equal(articles.length, 1);
  assert.equal(articles[0].body, null);
  assert.equal(articles[0].published, properties.lastUpdated);
});
