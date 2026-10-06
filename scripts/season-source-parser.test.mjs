import { test } from "node:test";
import assert from "node:assert/strict";
import { candidatesFromHtml, findRelevantCandidates } from "./season-source-parser.mjs";

const url = "https://www.projectdiablo2.com/";
const announcement = '<h2 class="heading"><!--[--> Season 14: Alliance <!--]--></h2><p>Season begins Oct 23rd.</p>';
const game = { currentSeason: { title: "Season 13: Betrayal" }, nextSeason: { title: null }, lastUpdated: "2026-09-28T20:10:00Z" };

test("detects the PD2 homepage announcement without an announcement link", () => {
  assert.deepEqual(findRelevantCandidates(candidatesFromHtml(announcement, url), [game]), [{ title: "Season 14: Alliance", link: url, published: "" }]);
});
test("does not alert again for a reviewed upcoming season", () => {
  assert.deepEqual(findRelevantCandidates(candidatesFromHtml(announcement, url), [{ ...game, nextSeason: { title: "Season 14: Alliance" } }]), []);
});
test("ignores script content, invalid links and unrelated headings", () => {
  assert.deepEqual(candidatesFromHtml('<script>"<h2>Season 99: Fake</h2>"</script><h2>Play for free</h2><a href="javascript:alert(1)">Season 99: Fake</a><a href="http://[">Season 99: Fake</a>', url), []);
});
test("retains linked news announcements and resolves relative links", () => {
  assert.deepEqual(candidatesFromHtml('<a href="/news/14">Season 14: Alliance</a>', url), [{ title: "Season 14: Alliance", link: `${url}news/14`, published: "" }]);
});
