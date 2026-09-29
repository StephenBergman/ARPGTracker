import { fetch as nativeFetch } from "@tauri-apps/plugin-http";
import type { CurrencyExchangeMarket, CurrencyExchangeResponse, EconomyQuote, EconomySnapshot } from "./economy.types";

const API_ROOT = "https://web.poecdn.com/api/currency-exchange";
const CHAOS_ID = "Metadata/Items/Currency/CurrencyRerollRare";
const DIVINE_ID = "Metadata/Items/Currency/CurrencyModValues";
const CACHE_KEY = "arpg-seasons.poe-economy-snapshots.v2";
const MAX_SNAPSHOTS = 168;
const HOUR_SECONDS = 3_600;
const WATCHLIST = [
  { id: DIVINE_ID, label: "Divine Orb", baseId: CHAOS_ID, baseLabel: "chaos" },
  { id: "Metadata/Items/Currency/CurrencyAddModToRare", label: "Exalted Orb", baseId: CHAOS_ID, baseLabel: "chaos" },
  { id: "Metadata/Items/Currency/CurrencyRemoveMod", label: "Orb of Annulment", baseId: CHAOS_ID, baseLabel: "chaos" },
  { id: "Metadata/Items/Currency/CurrencyRerollUnique", label: "Ancient Orb", baseId: CHAOS_ID, baseLabel: "chaos" },
  { id: "Metadata/Items/Currency/CurrencyDuplicate", label: "Mirror of Kalandra", baseId: DIVINE_ID, baseLabel: "divine" },
] as const;

interface StorageAdapter { getItem(key: string): string | null; setItem(key: string, value: string): void; }
type ExchangeFetcher = (hour: number) => Promise<unknown>;

export function getLastCompletedExchangeHour(now = Date.now()): number { return Math.floor(now / 3_600_000) * HOUR_SECONDS - HOUR_SECONDS; }

function isMarket(value: unknown): value is CurrencyExchangeMarket {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CurrencyExchangeMarket>;
  return typeof item.league === "string" && typeof item.market_id === "string" && Array.isArray(item.market_pair)
    && item.market_pair.length === 2 && !!item.volume_traded && !!item.lowest_ratio && !!item.highest_ratio;
}

export function parseCurrencyExchangeResponse(value: unknown): CurrencyExchangeResponse | null {
  if (!value || typeof value !== "object") return null;
  const response = value as Partial<CurrencyExchangeResponse>;
  if (!Number.isInteger(response.next_change_id) || !Array.isArray(response.markets) || !response.markets.every(isMarket)) return null;
  return { next_change_id: response.next_change_id as number, markets: response.markets };
}

function normalize(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

function chooseLeague(markets: readonly CurrencyExchangeMarket[], expectedSeasonTitle?: string): string | null {
  const volumeByLeague = new Map<string, number>();
  for (const market of markets) {
    if (/^(standard|hardcore|ruthless)/i.test(market.league) || market.league.includes("(")) continue;
    const volume = Object.values(market.volume_traded).reduce((total, amount) => total + (Number.isFinite(amount) ? amount : 0), 0);
    volumeByLeague.set(market.league, (volumeByLeague.get(market.league) ?? 0) + volume);
  }
  const leagues = [...volumeByLeague];
  const normalizedTitle = normalize(expectedSeasonTitle ?? "");
  const matched = leagues.filter(([league]) => normalizedTitle.includes(normalize(league))).sort((left, right) => right[1] - left[1])[0]?.[0];
  return matched ?? leagues.sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function createQuote(markets: readonly CurrencyExchangeMarket[], league: string, item: typeof WATCHLIST[number]): EconomyQuote | null {
  const market = markets.find((entry) => entry.league === league && entry.market_pair.includes(item.id) && entry.market_pair.includes(item.baseId));
  if (!market) return null;
  const lowItem = market.lowest_ratio[item.id];
  const lowBase = market.lowest_ratio[item.baseId];
  const highItem = market.highest_ratio[item.id];
  const highBase = market.highest_ratio[item.baseId];
  if (![lowItem, lowBase, highItem, highBase].every((number) => Number.isFinite(number) && number > 0)) return null;
  const low = lowBase / lowItem;
  const high = highBase / highItem;
  return { id: item.id, label: item.label, baseLabel: item.baseLabel, value: (low + high) / 2, low: Math.min(low, high), high: Math.max(low, high), volume: market.volume_traded[item.id] ?? 0 };
}

export function createEconomySnapshot(response: CurrencyExchangeResponse, hour: number, capturedAt = new Date().toISOString(), expectedSeasonTitle?: string): EconomySnapshot | null {
  const league = chooseLeague(response.markets, expectedSeasonTitle);
  if (!league) return null;
  const quotes = WATCHLIST.map((item) => createQuote(response.markets, league, item)).filter((quote): quote is EconomyQuote => quote !== null);
  const divine = quotes.find((quote) => quote.id === DIVINE_ID);
  const divineMarket = response.markets.find((entry) => entry.league === league && entry.market_pair.includes(CHAOS_ID) && entry.market_pair.includes(DIVINE_ID));
  if (!divine || !divineMarket) return null;
  return { hour, capturedAt, league, chaosPerDivine: divine.value, chaosPerDivineLow: divine.low, chaosPerDivineHigh: divine.high,
    chaosVolume: divineMarket.volume_traded[CHAOS_ID] ?? 0, divineVolume: divineMarket.volume_traded[DIVINE_ID] ?? 0, quotes };
}

function isSnapshot(item: unknown): item is EconomySnapshot {
  return !!item && typeof item === "object" && Number.isInteger((item as EconomySnapshot).hour)
    && typeof (item as EconomySnapshot).league === "string" && Number.isFinite((item as EconomySnapshot).chaosPerDivine)
    && Array.isArray((item as EconomySnapshot).quotes);
}

export function loadEconomySnapshots(storage: StorageAdapter = localStorage): EconomySnapshot[] {
  try { const value: unknown = JSON.parse(storage.getItem(CACHE_KEY) ?? "[]"); return Array.isArray(value) ? value.filter(isSnapshot).slice(-MAX_SNAPSHOTS) : []; }
  catch { return []; }
}

export function saveEconomySnapshot(snapshot: EconomySnapshot, storage: StorageAdapter = localStorage): EconomySnapshot[] {
  const history = loadEconomySnapshots(storage).filter((item) => item.hour !== snapshot.hour);
  const next = [...history, snapshot].sort((left, right) => left.hour - right.hour).slice(-MAX_SNAPSHOTS);
  try { storage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* A full or unavailable cache must not break economy refresh. */ }
  return next;
}

async function fetchExchangeHour(hour: number): Promise<unknown> {
  const response = await nativeFetch(`${API_ROOT}/${hour}`);
  if (!response.ok) throw new Error(`Currency Exchange returned HTTP ${response.status}`);
  return response.json();
}

export async function fetchEconomySnapshotNear(hour: number, expectedSeasonTitle?: string, fetcher: ExchangeFetcher = fetchExchangeHour): Promise<EconomySnapshot> {
  let lastError = "Official exchange data is not available yet";
  for (let offset = 0; offset < 3; offset += 1) {
    const candidateHour = hour - offset * HOUR_SECONDS;
    try {
      const parsed = parseCurrencyExchangeResponse(await fetcher(candidateHour));
      if (!parsed) { lastError = "Currency Exchange returned an invalid payload"; continue; }
      const snapshot = createEconomySnapshot(parsed, candidateHour, new Date().toISOString(), expectedSeasonTitle);
      if (snapshot) return snapshot;
      lastError = "The selected league had no exchange activity";
    } catch (reason) { lastError = reason instanceof Error ? reason.message : lastError; }
  }
  throw new Error(lastError);
}

export async function fetchEconomySnapshots(expectedSeasonTitle?: string, now = Date.now()): Promise<EconomySnapshot[]> {
  const latestHour = getLastCompletedExchangeHour(now);
  const latest = await fetchEconomySnapshotNear(latestHour, expectedSeasonTitle);
  const prior = await fetchEconomySnapshotNear(latest.hour - 24 * HOUR_SECONDS, expectedSeasonTitle);
  return prior.hour === latest.hour ? [latest] : [prior, latest];
}
