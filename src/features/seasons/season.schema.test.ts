import { describe, expect, it } from "vitest";
import bundled from "../../data/default-seasons.json";
import remoteSource from "../../../data/seasons.json";
import { validateSeasonDataset } from "./season.schema";

describe("validateSeasonDataset", () => {
  it("accepts the bundled dataset", () => expect(validateSeasonDataset(bundled).success).toBe(true));

  it("keeps the bundled fallback synchronized with the static source", () => {
    expect(validateSeasonDataset(remoteSource).success).toBe(true);
    expect(bundled).toEqual(remoteSource);
  });

  it("keeps Project Diablo 2 independent from Diablo II Resurrected", () => {
    const result = validateSeasonDataset(bundled);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const pd2 = result.data.games.projectDiablo2;
    const d2r = result.data.games.diablo2Resurrected;
    expect(pd2.currentSeason.id).toBe("pd2-season-13");
    expect(pd2.currentSeason.title).toBe("Season 13: Betrayal");
    expect(pd2.currentSeason.startDate).toBe("2026-04-24T17:00:00Z");
    expect(pd2.currentSeason).not.toEqual(d2r.currentSeason);
    expect(pd2.source).toBe("https://www.projectdiablo2.com/");
  });

  it("uses the official Torchlight Infinite season instead of placeholder data", () => {
    const result = validateSeasonDataset(bundled);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const season = result.data.games.torchlightInfinite;
    expect(season.currentSeason.id).toBe("tli-afterlight");
    expect(season.currentSeason.title).toBe("Afterlight");
    expect(season.currentSeason.startDate).toBe("2026-07-17T02:00:00Z");
    expect(season.nextSeason.status).toBe("unknown");
    expect(season.source).toContain("steamcommunity.com");
  });

  it("rejects unsupported schema versions", () => {
    expect(validateSeasonDataset({ ...bundled, schemaVersion: 2 }).success).toBe(false);
  });

  it("rejects malformed required dates", () => {
    const data = structuredClone(bundled);
    data.games.poe.currentSeason.startDate = "not-a-date";
    expect(validateSeasonDataset(data).success).toBe(false);
  });

  it("rejects unknown statuses", () => {
    const data: unknown = { ...structuredClone(bundled), games: { ...structuredClone(bundled.games), poe: { ...structuredClone(bundled.games.poe), nextSeason: { status: "maybe" } } } };
    expect(validateSeasonDataset(data).success).toBe(false);
  });
});
