import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { loadAlwaysOnTop, loadWidgetMode, loadWindowPosition, saveAlwaysOnTop, saveSelectedGame, saveWidgetMode, saveWindowPosition } from "../features/settings/settings.store";
import type { DisplayMode } from "../features/settings/settings.types";
import { GAME_IDS, type GameId } from "../features/seasons/season.types";
import { restoreWidgetPosition, setWidgetAlwaysOnTop, setWidgetMode } from "../platform/window";

interface DesktopIntegrationOptions { selectedGameId: GameId; setSelectedGameId: (id: GameId) => void; displayMode: DisplayMode; setDisplayMode: (mode: DisplayMode) => void; refresh: () => Promise<void>; openSettings: () => void; }

export function useDesktopIntegration(options: DesktopIntegrationOptions) {
  const [alwaysOnTop, setAlwaysOnTop] = useState(loadAlwaysOnTop);
  const [widgetMode, setWidgetModeEnabled] = useState(loadWidgetMode);

  useEffect(() => { saveSelectedGame(options.selectedGameId); }, [options.selectedGameId]);
  useEffect(() => { saveAlwaysOnTop(alwaysOnTop); void setWidgetAlwaysOnTop(alwaysOnTop); }, [alwaysOnTop]);
  useEffect(() => { saveWidgetMode(widgetMode); void setWidgetMode(widgetMode); }, [widgetMode]);

  useEffect(() => {
    let disposed = false;
    const unlisteners: Array<() => void> = [];
    void (async () => {
      await restoreWidgetPosition(loadWindowPosition());
      if (disposed) return;
      try {
        unlisteners.push(await getCurrentWindow().onMoved(({ payload }) => saveWindowPosition({ x: payload.x, y: payload.y })));
        unlisteners.push(await listen<string>("tray-select-game", ({ payload }) => { const id = GAME_IDS.find((gameId) => gameId === payload); if (id) options.setSelectedGameId(id); }));
        unlisteners.push(await listen("tray-toggle-compact", () => options.setDisplayMode(options.displayMode === "compact" ? "expanded" : "compact")));
        unlisteners.push(await listen("tray-toggle-always-on-top", () => setAlwaysOnTop((value) => !value)));
        unlisteners.push(await listen("tray-refresh-data", () => { void options.refresh(); }));
        unlisteners.push(await listen("tray-open-settings", options.openSettings));
      } catch { /* Browser preview has no native event bridge. */ }
    })();
    return () => { disposed = true; for (const unlisten of unlisteners) unlisten(); };
  }, [options.displayMode, options.openSettings, options.refresh, options.setDisplayMode, options.setSelectedGameId]);

  return { alwaysOnTop, setAlwaysOnTop, widgetMode, setWidgetMode: setWidgetModeEnabled };
}
