import { describe, expect, it } from "vitest";
import { GAME_IDS } from "../features/seasons/season.types";
import { GAME_THEMES } from ".";
describe("game themes", () => {
  it("provides a correctly identified theme for every game", () => { expect(Object.keys(GAME_THEMES)).toEqual([...GAME_IDS]); for (const id of GAME_IDS) expect(GAME_THEMES[id].id).toBe(id); });
  it("gives each game a distinct primary treatment", () => { expect(new Set(Object.values(GAME_THEMES).map((theme) => theme.primary)).size).toBe(GAME_IDS.length); });
});
