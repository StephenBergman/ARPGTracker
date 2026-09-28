import { describe, expect, it } from "vitest";
import { loadAlwaysOnTop, loadDisplayMode, loadLaunchAtStartup, loadSelectedGame, loadShowSeasonProgress, loadShowSeconds, loadWindowPosition, saveAlwaysOnTop, saveDisplayMode, saveLaunchAtStartup, saveSelectedGame, saveShowSeasonProgress, saveShowSeconds, saveWindowPosition } from "./settings.store";

class MemoryStorage {
  value: string | null = null;
  getItem(): string | null { return this.value; }
  setItem(_key: string, value: string): void { this.value = value; }
}

describe("display mode storage", () => {
  it("defaults to expanded for first-run and corrupt values", () => {
    const storage = new MemoryStorage();
    expect(loadDisplayMode(storage)).toBe("expanded");
    storage.value = "unexpected";
    expect(loadDisplayMode(storage)).toBe("expanded");
  });

  it("persists compact mode", () => {
    const storage = new MemoryStorage();
    saveDisplayMode("compact", storage);
    expect(loadDisplayMode(storage)).toBe("compact");
  });

  it("persists desktop integration preferences", () => {
    const storage = new MemoryStorage();
    saveSelectedGame("diablo4", storage);
    expect(loadSelectedGame(storage)).toBe("diablo4");
    saveAlwaysOnTop(true, storage);
    expect(loadAlwaysOnTop(storage)).toBe(true);
    saveWindowPosition({ x: -1200, y: 80 }, storage);
    expect(loadWindowPosition(storage)).toEqual({ x: -1200, y: 80 });
  });

  it("rejects invalid saved game and window values", () => {
    const storage = new MemoryStorage();
    storage.value = "invalid-game";
    expect(loadSelectedGame(storage)).toBe("poe2");
    storage.value = '{"x":"bad","y":2}';
    expect(loadWindowPosition(storage)).toBeNull();
  });

  it("uses sane display defaults and persists overrides", () => {
    const storage = new MemoryStorage();
    expect(loadLaunchAtStartup(storage)).toBe(false);
    expect(loadShowSeconds(storage)).toBe(true);
    expect(loadShowSeasonProgress(storage)).toBe(true);
    saveLaunchAtStartup(true, storage);
    expect(loadLaunchAtStartup(storage)).toBe(true);
    saveShowSeconds(false, storage);
    expect(loadShowSeconds(storage)).toBe(false);
    saveShowSeasonProgress(false, storage);
    expect(loadShowSeasonProgress(storage)).toBe(false);
  });
});
