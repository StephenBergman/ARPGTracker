import bundledData from "../../data/default-seasons.json";
import { validateSeasonDataset } from "./season.schema";
import type { SeasonDataset } from "./season.types";

function logDevelopment(message: string): void {
  if (import.meta.env.DEV && import.meta.env.MODE !== "test") console.info(`[season] ${message}`);
}

export interface SeasonCache {
  read(): Promise<unknown | null>;
  write(dataset: SeasonDataset): Promise<void>;
}

export interface SeasonRemoteSource { fetch(): Promise<unknown>; }
export type SeasonDataOrigin = "remote" | "cache" | "bundled";
export interface SeasonDataResult { data: SeasonDataset; origin: SeasonDataOrigin; }

export class BrowserSeasonCache implements SeasonCache {
  constructor(private readonly key = "arpg-seasons.dataset.v1") {}
  async read(): Promise<unknown | null> {
    try { const value = localStorage.getItem(this.key); return value ? JSON.parse(value) as unknown : null; }
    catch { return null; }
  }
  async write(dataset: SeasonDataset): Promise<void> {
    try { localStorage.setItem(this.key, JSON.stringify(dataset)); }
    catch { /* A full or unavailable cache must not break the application. */ }
  }
}

export class HttpSeasonSource implements SeasonRemoteSource {
  constructor(private readonly url: string) {}
  async fetch(): Promise<unknown> {
    const response = await fetch(this.url, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Season data request failed with ${response.status}`);
    return response.json() as Promise<unknown>;
  }
}

function requireBundledData(value: unknown): SeasonDataset {
  const result = validateSeasonDataset(value);
  if (!result.success) throw new Error(`Bundled season data is invalid: ${result.errors.join("; ")}`);
  return result.data;
}

export class SeasonService {
  private readonly bundled: SeasonDataset;
  constructor(private readonly cache: SeasonCache, private readonly remote?: SeasonRemoteSource, bundled: unknown = bundledData) {
    this.bundled = requireBundledData(bundled);
  }

  getBundledSnapshot(): SeasonDataset { return this.bundled; }

  async loadLocal(): Promise<SeasonDataResult> {
    try {
      const cached = validateSeasonDataset(await this.cache.read());
      if (cached.success && Date.parse(cached.data.updatedAt) >= Date.parse(this.bundled.updatedAt)) { logDevelopment("Loaded cached season dataset"); return { data: cached.data, origin: "cache" }; }
      if (cached.success) { await this.cache.write(this.bundled); logDevelopment("Bundled dataset is newer than cache"); return { data: this.bundled, origin: "bundled" }; }
      logDevelopment("Cached dataset invalid; using bundled fallback");
    } catch { logDevelopment("Cache unavailable; using bundled fallback"); }
    return { data: this.bundled, origin: "bundled" };
  }

  async refresh(current: SeasonDataset): Promise<SeasonDataResult> {
    if (!this.remote) return { data: current, origin: "bundled" };
    try {
      logDevelopment("Checking remote dataset");
      const remote = validateSeasonDataset(await this.remote.fetch());
      if (!remote.success) { logDevelopment("Remote validation failed; keeping current data"); return { data: current, origin: "cache" }; }
      if (Date.parse(remote.data.updatedAt) <= Date.parse(current.updatedAt)) return { data: current, origin: "cache" };
      await this.cache.write(remote.data);
      logDevelopment("Remote dataset updated");
      return { data: remote.data, origin: "remote" };
    } catch { logDevelopment("Remote dataset unavailable; keeping current data"); return { data: current, origin: "cache" }; }
  }

  async resolve(): Promise<SeasonDataResult> {
    if (this.remote) {
      try {
        logDevelopment("Checking remote dataset");
        const remote = validateSeasonDataset(await this.remote.fetch());
        if (remote.success) { await this.cache.write(remote.data); return { data: remote.data, origin: "remote" }; }
        logDevelopment("Remote validation failed; checking cache");
      } catch { logDevelopment("Remote dataset unavailable; checking cache"); }
    }
    return this.loadLocal();
  }
}
