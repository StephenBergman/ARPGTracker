const seasonWords = /\b(season|league|ladder|cycle|launch|release|update|expansion)\b/i;

export function plainText(value) {
  return value.replace(/<!--[\s\S]*?-->/g, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&(?:nbsp|amp|quot|#39);/g, " ").replace(/\s+/g, " ").trim();
}

export function candidatesFromHtml(body, url) {
  const result = [];
  // Homepage announcements may be headings rather than links (notably PD2).
  const markup = body.replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  for (const match of markup.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const title = plainText(match[2]);
    if (title.length < 12 || title.length > 180 || !seasonWords.test(title)) continue;
    try {
      const link = new URL(match[1], url);
      if (["https:", "http:"].includes(link.protocol)) result.push({ title, link: link.href, published: "" });
    } catch { /* Ignore malformed links; continue scanning other announcements. */ }
  }
  for (const match of markup.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)) {
    const title = plainText(match[1]);
    if (title.length >= 12 && title.length <= 180 && seasonWords.test(title)) result.push({ title, link: url, published: "" });
  }
  return result.filter((item, index) => result.findIndex((other) => other.title === item.title && other.link === item.link) === index);
}

export function findRelevantCandidates(items, games) {
  const knownTitles = games.flatMap((game) => [game.currentSeason.title, game.nextSeason.title]).filter(Boolean).map((title) => title.toLowerCase());
  const lastUpdated = Math.min(...games.map((game) => Date.parse(game.lastUpdated)));
  return items.filter((item) => {
    if (!seasonWords.test(item.title)) return false;
    if (knownTitles.some((title) => item.title.toLowerCase().includes(title))) return false;
    const published = Date.parse(item.published);
    return !Number.isFinite(published) || published > lastUpdated;
  }).slice(0, 5);
}
