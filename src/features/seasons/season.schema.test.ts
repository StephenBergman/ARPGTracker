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
    expect(pd2.nextSeason.title).toBe("Season 14: Alliance");
    expect(pd2.nextSeason.startDate).toBe("2026-10-23T17:00:00Z");
    expect(pd2.nextSeason.status).toBe("confirmed");
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

  it("uses the official Path of Exile league instead of placeholder data", () => {
    const result = validateSeasonDataset(bundled);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const season = result.data.games.poe;
    expect(season.currentSeason.id).toBe("poe-3.29-allflame");
    expect(season.currentSeason.title).toBe("Curse of the Allflame");
    expect(season.currentSeason.startDate).toBe("2026-07-24T20:00:00Z");
    expect(season.nextSeason.status).toBe("unknown");
    expect(season.source).toBe("https://www.pathofexile.com/allflame");
  });

  it("uses the official Path of Exile 2 event league instead of placeholder data", () => {
    const result = validateSeasonDataset(bundled);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const season = result.data.games.poe2;
    expect(season.currentSeason.id).toBe("poe2-0.5.5-forbidden-rites");
    expect(season.currentSeason.title).toBe("Forbidden Rites");
    expect(season.currentSeason.startDate).toBe("2026-09-04T20:00:00Z");
    expect(season.currentSeason.endDate).toBeNull();
    expect(season.nextSeason.status).toBe("unknown");
    expect(season.source).toContain("youtube.com");
  });

  it("uses the official Diablo II Resurrected ladder instead of placeholder data", () => {
    const result = validateSeasonDataset(bundled);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const season = result.data.games.diablo2Resurrected;
    expect(season.currentSeason.id).toBe("d2r-ladder-season-15");
    expect(season.currentSeason.title).toBe("Ladder Season 15");
    expect(season.currentSeason.startDate).toBe("2026-08-22T00:00:00Z");
    expect(season.nextSeason.status).toBe("unknown");
    expect(season.source).toContain("news.blizzard.com");
  });

  it("uses the official Diablo IV season instead of placeholder dates", () => {
    const result = validateSeasonDataset(bundled);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const season = result.data.games.diablo4;
    expect(season.currentSeason.id).toBe("d4-season-15-hells-legacy");
    expect(season.currentSeason.title).toBe("Season of Hell's Legacy");
    expect(season.currentSeason.startDate).toBe("2026-09-15T16:30:00Z");
    expect(season.currentSeason.endDate).toBeNull();
    expect(season.nextSeason.status).toBe("unknown");
    expect(season.nextSeason.startDate).toBeNull();
    expect(season.source).toContain("news.blizzard.com");
  });

  it("uses the official Last Epoch current and upcoming seasons", () => {
    const result = validateSeasonDataset(bundled);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const season = result.data.games.lastEpoch;
    expect(season.currentSeason.id).toBe("le-season-4-shattered-omens");
    expect(season.currentSeason.title).toBe("Season 4: Shattered Omens");
    expect(season.currentSeason.startDate).toBe("2026-03-26T16:00:00Z");
    expect(season.currentSeason.endDate).toBe("2026-10-01T16:00:00Z");
    expect(season.nextSeason.title).toBe("Season 5: Rage of the Frostborn");
    expect(season.nextSeason.startDate).toBe("2026-10-01T16:00:00Z");
    expect(season.nextSeason.status).toBe("confirmed");
    expect(season.source).toBe("https://lastepoch.com/patchnotes/");
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
