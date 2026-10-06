import { describe, expect, it } from "vitest";
import bundled from "../../data/default-seasons.json";
import { getNextConfirmedStart, rollOverConfirmedSeasons } from "./season.rollover";
import type { SeasonDataset } from "./season.types";
import { getSeasonProgress, getTimeSince } from "./season.utils";

const data = () => structuredClone(bundled) as SeasonDataset;
const launch = Date.parse("2026-10-01T16:00:00Z");

describe("confirmed season rollover", () => {
  it("keeps the current season until the exact launch time", () => {
    const dataset = data();
    expect(rollOverConfirmedSeasons(dataset, launch - 1)).toBe(dataset);
  });
  it("moves Last Epoch to the left and clears the next-season panel at zero", () => {
    const result = rollOverConfirmedSeasons(data(), launch);
    const season = result.games.lastEpoch;
    expect(season.currentSeason.title).toBe("Season 5: Rage of the Frostborn");
    expect(season.currentSeason.startDate).toBe("2026-10-01T16:00:00Z");
    expect(getTimeSince(season.currentSeason.startDate, launch).totalMilliseconds).toBe(0);
    expect(season.nextSeason).toEqual({ title: null, startDate: null, status: "unknown" });
    expect(getSeasonProgress(season.currentSeason.startDate, season.currentSeason.endDate, launch)).toBeNull();
  });
  it("rolls over offline on restart without changing cached data or freshness", () => {
    const dataset = data();
    const original = structuredClone(dataset);
    const result = rollOverConfirmedSeasons(dataset, launch + 5 * 86_400_000);
    expect(result.games.lastEpoch.currentSeason.title).toBe("Season 5: Rage of the Frostborn");
    expect(result.updatedAt).toBe(dataset.updatedAt);
    expect(result.games.lastEpoch.lastUpdated).toBe(dataset.games.lastEpoch.lastUpdated);
    expect(dataset).toEqual(original);
    expect(rollOverConfirmedSeasons(result, launch + 5 * 86_400_000)).toBe(result);
  });
  it("never promotes an estimated start", () => {
    const dataset = data();
    dataset.games.lastEpoch.nextSeason.status = "estimated";
    expect(rollOverConfirmedSeasons(dataset, launch)).toBe(dataset);
  });
  it("ignores missing, invalid and obsolete dates", () => {
    for (const startDate of [null, "invalid", "2026-01-01T00:00:00Z"]) {
      const dataset = data();
      dataset.games.lastEpoch.nextSeason.startDate = startDate;
      expect(rollOverConfirmedSeasons(dataset, launch)).toBe(dataset);
    }
  });
  it("schedules the nearest launch across games and skips completed launches", () => {
    const dataset = data();
    expect(getNextConfirmedStart(dataset, launch - 1)).toBe("2026-10-01T16:00:00Z");
    expect(getNextConfirmedStart(dataset, launch)).toBe("2026-10-23T17:00:00Z");
    expect(getNextConfirmedStart(dataset, Date.parse("2026-10-24T00:00:00Z"))).toBeNull();
  });
  it("preserves a newer dataset that already declares the launched season", () => {
    const dataset = rollOverConfirmedSeasons(data(), launch);
    dataset.games.lastEpoch.currentSeason.id = "official-season-5";
    dataset.games.lastEpoch.nextSeason = { title: "Season 6", startDate: "2027-01-01T16:00:00Z", status: "confirmed" };
    const result = rollOverConfirmedSeasons(dataset, launch + 1);
    expect(result).toBe(dataset);
    expect(result.games.lastEpoch.nextSeason.title).toBe("Season 6");
  });
});
