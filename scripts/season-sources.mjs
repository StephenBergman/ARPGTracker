// Developer-published Steam announcements are a fallback for sites that require
// JavaScript or block automated readers. Never ingest Steam's third-party news.
const steam = (appid) => `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appid}&count=40&maxlength=0&feeds=steam_community_announcements`;

export const sources = [
  { gameId: "poe", name: "Path of Exile developer announcements", url: steam(238960), kind: "steam", appid: 238960 },
  { gameId: "poe2", name: "Path of Exile 2 developer announcements", url: steam(2694490), kind: "steam", appid: 2694490 },
  { gameId: "diablo4", name: "Diablo IV official news", url: "https://news.blizzard.com/en-us/api/feed/diablo-4?locale=en-us", kind: "blizzard" },
  { gameId: "diablo2Resurrected", name: "Diablo II: Resurrected official news", url: "https://news.blizzard.com/en-us/api/feed/diablo-2-resurrected?locale=en-us", kind: "blizzard" },
  { gameId: "lastEpoch", name: "Last Epoch developer announcements", url: steam(899770), kind: "steam", appid: 899770 },
  { gameId: "projectDiablo2", name: "Project Diablo 2 official website", url: "https://www.projectdiablo2.com/", kind: "homepage" },
  { gameId: "torchlightInfinite", name: "Torchlight: Infinite official website", url: "https://torchlight.xd.com/", kind: "homepage" },
];

export function isOfficialArticle(url, source) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password &&
      (source.kind === "steam"
        ? ["steamcommunity.com", "store.steampowered.com", "steamstore-a.akamaihd.net"].includes(parsed.hostname)
        : parsed.origin === new URL(source.url).origin);
  } catch { return false; }
}

export async function fetchText(url, fetcher = fetch) {
  const response = await fetcher(url, {
    headers: { "user-agent": "ARPGTracker season monitor/2.0" },
    signal: AbortSignal.timeout(20_000), redirect: "error",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  if (text.length > 3_000_000) throw new Error("Source response exceeds size limit");
  return text;
}

export async function loadAnnouncements(source, fetcher = fetch) {
  const body = await fetchText(source.url, fetcher);
  if (source.kind === "homepage") return [{ title: source.name, body, link: source.url, published: "" }];
  const parsed = JSON.parse(body);
  if (source.kind === "steam") {
    if (parsed.appnews?.appid !== source.appid || !Array.isArray(parsed.appnews.newsitems)) throw new Error("Unexpected Steam feed");
    return parsed.appnews.newsitems
      .filter((item) => item.appid === source.appid && item.feedname === "steam_community_announcements" &&
        typeof item.title === "string" && typeof item.contents === "string" && Number.isFinite(item.date) && isOfficialArticle(item.url, source))
      .map((item) => ({ title: item.title, body: item.contents, link: item.url, published: new Date(item.date * 1000).toISOString() }));
  }
  if (!Array.isArray(parsed.contentItems)) throw new Error("Unexpected Blizzard feed");
  return parsed.contentItems.map((item) => item.properties).filter((item) => item && typeof item.title === "string" && isOfficialArticle(item.newsUrl, source))
    .map((item) => ({ title: item.title, body: null, link: item.newsUrl, published: item.lastUpdated }));
}
