import { describe, expect, it } from "vitest";
import bundled from "../../data/default-seasons.json";
import { SeasonService, type SeasonCache, type SeasonRemoteSource } from "./season.service";
import type { SeasonDataset } from "./season.types";

class MemoryCache implements SeasonCache {
  written: SeasonDataset | null = null;
  constructor(private value: unknown = null, private readonly shouldThrow = false) {}
  async read(): Promise<unknown> { if (this.shouldThrow) throw new Error("unavailable"); return this.value; }
  async write(dataset: SeasonDataset): Promise<void> { this.written = dataset; this.value = dataset; }
}

const source = (value: unknown, shouldThrow = false): SeasonRemoteSource => ({ fetch: async () => { if (shouldThrow) throw new Error("offline"); return value; } });

describe("SeasonService", () => {
  it("loads valid remote data first and caches it", async () => {
    const remoteData = structuredClone(bundled) as SeasonDataset;
    remoteData.updatedAt = "2026-09-29T12:00:00Z";
    const cache = new MemoryCache();
    const result = await new SeasonService(cache, source(remoteData)).resolve();
    expect(result.origin).toBe("remote");
    expect(cache.written?.updatedAt).toBe(remoteData.updatedAt);
  });

  it("falls back to a valid cache when remote is unavailable", async () => {
    const result = await new SeasonService(new MemoryCache(bundled), source(null, true)).resolve();
    expect(result.origin).toBe("cache");
  });

  it("falls back to bundled data for corrupt or unavailable caches", async () => {
    expect((await new SeasonService(new MemoryCache("corrupt")).loadLocal()).origin).toBe("bundled");
    expect((await new SeasonService(new MemoryCache(null, true)).loadLocal()).origin).toBe("bundled");
  });

  it("replaces an older valid cache with newer bundled data", async () => {
    const older = structuredClone(bundled) as SeasonDataset;
    older.updatedAt = "2026-09-28T12:00:00Z";
    older.games.projectDiablo2.currentSeason = { id: "pd2-placeholder", title: "Current Season", startDate: "2026-08-01T00:00:00Z", endDate: null };
    const cache = new MemoryCache(older);
    const result = await new SeasonService(cache).loadLocal();
    expect(result.origin).toBe("bundled");
    expect(result.data.games.projectDiablo2.currentSeason.id).toBe("pd2-season-13");
    expect(cache.written?.updatedAt).toBe(bundled.updatedAt);
  });

  it("rejects malformed remote data without replacing the cache", async () => {
    const cache = new MemoryCache(bundled);
    const result = await new SeasonService(cache, source({ schemaVersion: 1 })).resolve();
    expect(result.origin).toBe("cache");
    expect(cache.written).toBeNull();
  });

  it("keeps current data when a refresh is not newer", async () => {
    const cache = new MemoryCache();
    const result = await new SeasonService(cache, source(bundled)).refresh(bundled as SeasonDataset);
    expect(result.data.updatedAt).toBe(bundled.updatedAt);
    expect(cache.written).toBeNull();
  });
});
