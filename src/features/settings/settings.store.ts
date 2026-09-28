import type { DisplayMode } from "./settings.types";
import type { GameId } from "../seasons/season.types";
import { GAME_IDS } from "../seasons/season.types";
import type { WindowPosition } from "./settings.types";

const DISPLAY_MODE_KEY = "arpg-seasons.display-mode.v1";
interface StorageReader { getItem(key: string): string | null; setItem(key: string, value: string): void; }
const SELECTED_GAME_KEY = "arpg-seasons.selected-game.v1";
const ALWAYS_ON_TOP_KEY = "arpg-seasons.always-on-top.v1";
const WINDOW_POSITION_KEY = "arpg-seasons.window-position.v1";

export function loadDisplayMode(storage: StorageReader = localStorage): DisplayMode {
  try { return storage.getItem(DISPLAY_MODE_KEY) === "compact" ? "compact" : "expanded"; }
  catch { return "expanded"; }
}

export function saveDisplayMode(mode: DisplayMode, storage: StorageReader = localStorage): void {
  try { storage.setItem(DISPLAY_MODE_KEY, mode); }
  catch { /* Unavailable browser storage must not prevent mode changes. */ }
}

export function loadSelectedGame(storage: StorageReader = localStorage): GameId {
  try { const value = storage.getItem(SELECTED_GAME_KEY); return GAME_IDS.find((id) => id === value) ?? "poe2"; }
  catch { return "poe2"; }
}
export function saveSelectedGame(gameId: GameId, storage: StorageReader = localStorage): void { try { storage.setItem(SELECTED_GAME_KEY, gameId); } catch { /* Non-fatal. */ } }
export function loadAlwaysOnTop(storage: StorageReader = localStorage): boolean { try { return storage.getItem(ALWAYS_ON_TOP_KEY) === "true"; } catch { return false; } }
export function saveAlwaysOnTop(value: boolean, storage: StorageReader = localStorage): void { try { storage.setItem(ALWAYS_ON_TOP_KEY, String(value)); } catch { /* Non-fatal. */ } }
export function loadWindowPosition(storage: StorageReader = localStorage): WindowPosition | null {
  try {
    const raw = storage.getItem(WINDOW_POSITION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<WindowPosition>;
    return Number.isFinite(value.x) && Number.isFinite(value.y) ? { x: value.x as number, y: value.y as number } : null;
  } catch { return null; }
}
export function saveWindowPosition(position: WindowPosition, storage: StorageReader = localStorage): void { try { storage.setItem(WINDOW_POSITION_KEY, JSON.stringify(position)); } catch { /* Non-fatal. */ } }
