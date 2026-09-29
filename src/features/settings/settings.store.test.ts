import { describe, expect, it } from "vitest";
import { loadAlwaysOnTop, loadDisplayMode, loadLaunchAtStartup, loadPositionLocked, loadSelectedGame, loadShowSeasonProgress, loadShowSeconds, loadStandardWindowPosition, loadStandardWindowSize, loadWidgetMode, loadWidgetPlacement, loadWidgetWindowGeometry, loadWindowPosition, saveAlwaysOnTop, saveDisplayMode, saveLaunchAtStartup, savePositionLocked, saveSelectedGame, saveShowSeasonProgress, saveShowSeconds, saveStandardWindowPosition, saveStandardWindowSize, saveWidgetMode, saveWidgetPlacement, saveWidgetWindowGeometry, saveWindowPosition } from "./settings.store";

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

  it("persists a standard window size and enforces usable minimums", () => {
    const storage = new MemoryStorage();
    expect(loadStandardWindowSize(storage)).toEqual({ width: 960, height: 720 });
    saveStandardWindowSize({ width: 500, height: 400 }, storage);
    expect(loadStandardWindowSize(storage)).toEqual({ width: 760, height: 600 });
  });

  it("keeps standard and widget geometry independent", () => {
    const standardStorage = new MemoryStorage();
    saveStandardWindowPosition({ x: 120, y: 80 }, standardStorage);
    expect(loadStandardWindowPosition(standardStorage)).toEqual({ x: 120, y: 80 });
    const widgetStorage = new MemoryStorage();
    saveWidgetWindowGeometry({ position: { x: 1450, y: 40 }, size: { width: 720, height: 250 } }, widgetStorage);
    expect(loadWidgetWindowGeometry(widgetStorage)).toEqual({ position: { x: 1450, y: 40 }, size: { width: 720, height: 250 } });
  });

  it("uses sane display defaults and persists overrides", () => {
    const storage = new MemoryStorage();
    expect(loadLaunchAtStartup(storage)).toBe(false);
    expect(loadShowSeconds(storage)).toBe(true);
    expect(loadShowSeasonProgress(storage)).toBe(true);
    expect(loadWidgetMode(storage)).toBe(true);
    expect(loadPositionLocked(storage)).toBe(false);
    expect(loadWidgetPlacement(storage)).toBe("free");
    saveLaunchAtStartup(true, storage);
    expect(loadLaunchAtStartup(storage)).toBe(true);
    saveShowSeconds(false, storage);
    expect(loadShowSeconds(storage)).toBe(false);
    saveShowSeasonProgress(false, storage);
    expect(loadShowSeasonProgress(storage)).toBe(false);
    saveWidgetMode(false, storage);
    expect(loadWidgetMode(storage)).toBe(false);
    savePositionLocked(true, storage);
    expect(loadPositionLocked(storage)).toBe(true);
    saveWidgetPlacement("bottomRight", storage);
    expect(loadWidgetPlacement(storage)).toBe("bottomRight");
  });
});
