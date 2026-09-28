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
