import { useEffect, useState } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { availableMonitors, getCurrentWindow } from "@tauri-apps/api/window";
import { loadAlwaysOnTop, loadPositionLocked, loadWidgetMode, loadWidgetPlacement, loadWindowPosition, saveAlwaysOnTop, savePositionLocked, saveSelectedGame, saveWidgetMode, saveWidgetPlacement, saveWindowPosition } from "../features/settings/settings.store";
import type { DisplayMode } from "../features/settings/settings.types";
import { GAME_IDS, type GameId } from "../features/seasons/season.types";
import { applyWidgetPlacement, detectWidgetPlacement, hideSnapOverlay, restoreWidgetPosition, setWidgetAlwaysOnTop, setWidgetDisplayMode, setWidgetMode } from "../platform/window";

interface DesktopIntegrationOptions { selectedGameId: GameId; setSelectedGameId: (id: GameId) => void; displayMode: DisplayMode; setDisplayMode: (mode: DisplayMode) => void; settingsOpen: boolean; refresh: () => Promise<void>; openSettings: () => void; }

export function useDesktopIntegration(options: DesktopIntegrationOptions) {
  const [alwaysOnTop, setAlwaysOnTop] = useState(loadAlwaysOnTop);
  const [widgetMode, setWidgetModeEnabled] = useState(loadWidgetMode);
  const [positionLocked, setPositionLocked] = useState(loadPositionLocked);
  const [widgetPlacement, setWidgetPlacement] = useState(loadWidgetPlacement);

  useEffect(() => { saveSelectedGame(options.selectedGameId); }, [options.selectedGameId]);
  useEffect(() => { saveAlwaysOnTop(alwaysOnTop); void setWidgetAlwaysOnTop(alwaysOnTop); }, [alwaysOnTop]);
  useEffect(() => {
    saveWidgetMode(widgetMode);
    void setWidgetMode(widgetMode);
    if (widgetMode && options.settingsOpen) void setWidgetDisplayMode("expanded", true);
    else if (widgetMode && options.displayMode === "expanded" && widgetPlacement !== "free") void applyWidgetPlacement(widgetPlacement);
    else void setWidgetDisplayMode(options.displayMode, widgetMode);
  }, [options.displayMode, options.settingsOpen, widgetMode, widgetPlacement]);
  useEffect(() => savePositionLocked(positionLocked), [positionLocked]);
  useEffect(() => saveWidgetPlacement(widgetPlacement), [widgetPlacement]);

  useEffect(() => {
    let disposed = false;
    let dragging = false;
    const unlisteners: Array<() => void> = [];
    const previewPlacement = async (position: { x: number; y: number }) => {
      try {
        const appWindow = getCurrentWindow();
        const placement = detectWidgetPlacement(position, await appWindow.outerSize(), await availableMonitors());
        await emit("widget-snap-preview", placement);
        return placement;
      } catch { return "free" as const; }
    };
    const onDragStart = () => { dragging = true; };
    const onDragEnd = () => {
      dragging = false;
      void (async () => {
        try {
          const position = await getCurrentWindow().outerPosition();
          const placement = await previewPlacement(position);
          await hideSnapOverlay();
          if (placement === "free") await setWidgetDisplayMode("expanded", true);
          else await applyWidgetPlacement(placement);
          if (!disposed) setWidgetPlacement(placement);
        } catch { await hideSnapOverlay(); }
      })();
    };
    window.addEventListener("widget-native-drag-start", onDragStart);
    void (async () => {
      await restoreWidgetPosition(loadWindowPosition());
      if (widgetMode && !options.settingsOpen && options.displayMode === "expanded" && widgetPlacement !== "free") await applyWidgetPlacement(widgetPlacement);
      if (disposed) return;
      try {
        unlisteners.push(await listen("widget-drag-released", onDragEnd));
        unlisteners.push(await getCurrentWindow().onMoved(({ payload }) => {
          saveWindowPosition({ x: payload.x, y: payload.y });
          if (!dragging || !widgetMode || options.displayMode !== "expanded" || positionLocked) return;
          void previewPlacement(payload);
        }));
        unlisteners.push(await listen<string>("tray-select-game", ({ payload }) => { const id = GAME_IDS.find((gameId) => gameId === payload); if (id) options.setSelectedGameId(id); }));
        unlisteners.push(await listen("tray-toggle-compact", () => options.setDisplayMode(options.displayMode === "compact" ? "expanded" : "compact")));
        unlisteners.push(await listen("tray-toggle-always-on-top", () => setAlwaysOnTop((value) => !value)));
        unlisteners.push(await listen("tray-toggle-widget-mode", () => setWidgetModeEnabled((value) => !value)));
        unlisteners.push(await listen("tray-toggle-position-lock", () => setPositionLocked((value) => !value)));
        unlisteners.push(await listen("tray-refresh-data", () => { void options.refresh(); }));
        unlisteners.push(await listen("tray-open-settings", options.openSettings));
      } catch { /* Browser preview has no native event bridge. */ }
    })();
    return () => { disposed = true; window.removeEventListener("widget-native-drag-start", onDragStart); for (const unlisten of unlisteners) unlisten(); };
  }, [options.displayMode, options.openSettings, options.refresh, options.setDisplayMode, options.setSelectedGameId, options.settingsOpen, positionLocked, widgetMode, widgetPlacement]);

  return { alwaysOnTop, setAlwaysOnTop, widgetMode, setWidgetMode: setWidgetModeEnabled, positionLocked, setPositionLocked, widgetPlacement, setWidgetPlacement };
}
