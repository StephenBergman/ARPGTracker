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

  it("keeps every game independently identified and sourced as seasons change", () => {
    const result = validateSeasonDataset(bundled);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const games = Object.values(result.data.games);
    expect(new Set(games.map((game) => game.gameId)).size).toBe(games.length);
    expect(new Set(games.map((game) => game.currentSeason.id)).size).toBe(games.length);
    for (const game of games) {
      expect(new URL(game.source!).protocol).toBe("https:");
      expect(game.currentSeason.title).not.toMatch(/placeholder|mock|demo/i);
      expect(Date.parse(game.lastUpdated)).toBeLessThanOrEqual(Date.parse(result.data.updatedAt));
      if (game.nextSeason.startDate) {
        expect(Date.parse(game.nextSeason.startDate)).toBeGreaterThan(Date.parse(game.currentSeason.startDate));
      }
    }
    expect(result.data.games.torchlightInfinite.source).toBe("https://torchlight.xd.com/");
    expect(result.data.games.projectDiablo2.currentSeason).not.toEqual(result.data.games.diablo2Resurrected.currentSeason);
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
