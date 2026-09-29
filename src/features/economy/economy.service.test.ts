import { describe, expect, it } from "vitest";
import { createEconomySnapshot, fetchEconomySnapshotNear, getLastCompletedExchangeHour, parseCurrencyExchangeResponse, saveEconomySnapshot } from "./economy.service";

const chaos = "Metadata/Items/Currency/CurrencyRerollRare";
const divine = "Metadata/Items/Currency/CurrencyModValues";
const response = {
  next_change_id: 7_200,
  markets: [{ league: "Standard", market_id: `${chaos}|${divine}`, market_pair: [chaos, divine], volume_traded: { [chaos]: 9_999, [divine]: 99 }, lowest_ratio: { [chaos]: 300, [divine]: 1 }, highest_ratio: { [chaos]: 310, [divine]: 1 } },
    { league: "Allflame", market_id: `${chaos}|${divine}`, market_pair: [chaos, divine], volume_traded: { [chaos]: 40_000, [divine]: 100 }, lowest_ratio: { [chaos]: 380, [divine]: 1 }, highest_ratio: { [chaos]: 400, [divine]: 1 } }],
};

describe("official economy snapshots", () => {
  it("targets the most recently completed UTC hour", () => { expect(getLastCompletedExchangeHour(Date.UTC(2026, 8, 29, 17, 45))).toBe(Date.UTC(2026, 8, 29, 16) / 1_000); });
  it("validates and normalizes the active league chaos/divine market", () => {
    const parsed = parseCurrencyExchangeResponse(response);
    expect(parsed).not.toBeNull();
    expect(createEconomySnapshot(parsed!, 3_600, "2026-09-29T18:00:00Z")).toMatchObject({ league: "Allflame", chaosPerDivine: 390, chaosPerDivineLow: 380, chaosPerDivineHigh: 400 });
  });
  it("rejects malformed API data", () => { expect(parseCurrencyExchangeResponse({ next_change_id: "bad", markets: [] })).toBeNull(); });
  it("matches the season title before falling back to market volume", () => {
    const parsed = parseCurrencyExchangeResponse({ ...response, markets: response.markets.map((market, index) => index === 1 ? { ...market, volume_traded: { [chaos]: 1, [divine]: 1 } } : market) });
    expect(createEconomySnapshot(parsed!, 3_600, undefined, "Curse of the Allflame")?.league).toBe("Allflame");
  });
  it("falls back when the newest exchange hour is not published", async () => {
    const requested: number[] = [];
    const snapshot = await fetchEconomySnapshotNear(10_800, "Curse of the Allflame", async (hour) => {
      requested.push(hour);
      return hour === 10_800 ? { next_change_id: 14_400, markets: [] } : response;
    });
    expect(requested).toEqual([10_800, 7_200]);
    expect(snapshot.hour).toBe(7_200);
  });
  it("replaces duplicate hours in local history", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const snapshot = createEconomySnapshot(parseCurrencyExchangeResponse(response)!, 3_600)!;
    saveEconomySnapshot(snapshot, storage);
    expect(saveEconomySnapshot({ ...snapshot, chaosPerDivine: 395 }, storage)).toHaveLength(1);
  });
});
