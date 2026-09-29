import { useEffect, useRef, useState } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { availableMonitors, getCurrentWindow } from "@tauri-apps/api/window";
import { loadAlwaysOnTop, loadPositionLocked, loadStandardWindowPosition, loadStandardWindowSize, loadWidgetMode, loadWidgetPlacement, loadWidgetWindowGeometry, saveAlwaysOnTop, savePositionLocked, saveSelectedGame, saveStandardWindowPosition, saveStandardWindowSize, saveWidgetMode, saveWidgetPlacement, saveWidgetWindowGeometry } from "../features/settings/settings.store";
import type { DisplayMode } from "../features/settings/settings.types";
import { GAME_IDS, type GameId } from "../features/seasons/season.types";
import { applyWidgetPlacement, detectWidgetPlacement, getWindowGeometry, hideSnapOverlay, restoreWindowGeometry, setWidgetDisplayMode, setWidgetMode, setWindowLayer } from "../platform/window";

interface DesktopIntegrationOptions { selectedGameId: GameId; setSelectedGameId: (id: GameId) => void; displayMode: DisplayMode; setDisplayMode: (mode: DisplayMode) => void; settingsOpen: boolean; refresh: () => Promise<void>; openSettings: () => void; }

export function useDesktopIntegration(options: DesktopIntegrationOptions) {
  const [alwaysOnTop, setAlwaysOnTop] = useState(loadAlwaysOnTop);
  const [widgetMode, setWidgetModeEnabled] = useState(loadWidgetMode);
  const [positionLocked, setPositionLocked] = useState(loadPositionLocked);
  const [widgetPlacement, setWidgetPlacement] = useState(loadWidgetPlacement);
  const layoutQueueRef = useRef<Promise<void>>(Promise.resolve());
  const layoutGenerationRef = useRef(0);
  const programmaticResizeRef = useRef(false);
  const resizeReleaseTimerRef = useRef<number | null>(null);
  const previousWidgetModeRef = useRef(widgetMode);
  const hasAppliedInitialLayoutRef = useRef(false);

  useEffect(() => { saveSelectedGame(options.selectedGameId); }, [options.selectedGameId]);
  useEffect(() => { saveAlwaysOnTop(alwaysOnTop); void setWindowLayer(alwaysOnTop, widgetMode && !alwaysOnTop); }, [alwaysOnTop, widgetMode]);
  useEffect(() => {
    saveWidgetMode(widgetMode);
    const modeChanged = previousWidgetModeRef.current !== widgetMode;
    const initialLayout = !hasAppliedInitialLayoutRef.current;
    hasAppliedInitialLayoutRef.current = true;
    const outgoingWidgetMode = previousWidgetModeRef.current;
    previousWidgetModeRef.current = widgetMode;
    const generation = ++layoutGenerationRef.current;
    programmaticResizeRef.current = true;
    if (resizeReleaseTimerRef.current !== null) window.clearTimeout(resizeReleaseTimerRef.current);
    layoutQueueRef.current = layoutQueueRef.current.catch(() => undefined).then(async () => {
      if (generation !== layoutGenerationRef.current) return;
      if (modeChanged && !outgoingWidgetMode) {
        const outgoing = await getWindowGeometry();
        if (outgoing) {
          saveStandardWindowPosition(outgoing.position);
          if (outgoing.size.width >= 760 && outgoing.size.height >= 600) saveStandardWindowSize(outgoing.size);
        }
      }
      await setWidgetMode(widgetMode);
      if (generation !== layoutGenerationRef.current) return;
      if (!widgetMode) {
        await setWidgetDisplayMode("expanded", false);
        const standardSize = modeChanged ? { width: 960, height: 720 } : loadStandardWindowSize();
        const standardPosition = loadStandardWindowPosition();
        await restoreWindowGeometry(standardPosition ? { position: standardPosition, size: standardSize } : null, true);
      }
      else if ((modeChanged || initialLayout) && !options.settingsOpen) {
        await setWidgetDisplayMode(options.displayMode, true);
        const restored = await restoreWindowGeometry(loadWidgetWindowGeometry());
        if (!restored && options.displayMode === "expanded" && widgetPlacement !== "free") await applyWidgetPlacement(widgetPlacement);
      }
      else if (widgetMode && options.settingsOpen) await setWidgetDisplayMode("expanded", true);
      else if (widgetMode && options.displayMode === "expanded" && widgetPlacement !== "free") {
        await setWidgetDisplayMode("expanded", true);
        if (generation !== layoutGenerationRef.current) return;
        await applyWidgetPlacement(widgetPlacement);
      }
      else await setWidgetDisplayMode(options.displayMode, widgetMode);
      if (widgetMode && !options.settingsOpen) {
        const geometry = await getWindowGeometry();
        if (geometry) saveWidgetWindowGeometry(geometry);
      }
    }).finally(() => {
      if (generation !== layoutGenerationRef.current) return;
      resizeReleaseTimerRef.current = window.setTimeout(() => { programmaticResizeRef.current = false; }, 250);
    });
    return () => {
      if (resizeReleaseTimerRef.current !== null) window.clearTimeout(resizeReleaseTimerRef.current);
    };
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
      if (disposed) return;
      try {
        unlisteners.push(await listen("widget-drag-released", onDragEnd));
        unlisteners.push(await getCurrentWindow().onMoved(({ payload }) => {
          if (!programmaticResizeRef.current) {
            if (widgetMode && !options.settingsOpen) void getWindowGeometry().then((geometry) => { if (geometry) saveWidgetWindowGeometry(geometry); });
            else if (!widgetMode) saveStandardWindowPosition({ x: payload.x, y: payload.y });
          }
          if (!dragging || !widgetMode || options.displayMode !== "expanded" || positionLocked) return;
          void previewPlacement(payload);
        }));
        unlisteners.push(await getCurrentWindow().onResized(({ payload }) => {
          if (programmaticResizeRef.current) return;
          if (widgetMode) {
            if (!options.settingsOpen) void getWindowGeometry().then((geometry) => { if (geometry) saveWidgetWindowGeometry(geometry); });
            return;
          }
          if (options.displayMode === "compact") return;
          void getCurrentWindow().scaleFactor().then((scaleFactor) => {
            const logical = payload.toLogical(scaleFactor);
            if (logical.width < 760 || logical.height < 600) return;
            saveStandardWindowSize({ width: logical.width, height: logical.height });
          });
        }));
        unlisteners.push(await listen<string>("tray-select-game", ({ payload }) => { const id = GAME_IDS.find((gameId) => gameId === payload); if (id) options.setSelectedGameId(id); }));
        unlisteners.push(await listen("tray-toggle-compact", () => options.setDisplayMode(options.displayMode === "compact" ? "expanded" : "compact")));
        unlisteners.push(await listen("tray-toggle-always-on-top", () => setAlwaysOnTop((value) => !value)));
        unlisteners.push(await listen("tray-toggle-widget-mode", () => setWidgetModeEnabled((value) => {
          if (value) options.setDisplayMode("expanded");
          return !value;
        })));
        unlisteners.push(await listen("tray-toggle-position-lock", () => setPositionLocked((value) => !value)));
        unlisteners.push(await listen("tray-refresh-data", () => { void options.refresh(); }));
        unlisteners.push(await listen("tray-open-settings", options.openSettings));
      } catch { /* Browser preview has no native event bridge. */ }
    })();
    return () => { disposed = true; window.removeEventListener("widget-native-drag-start", onDragStart); for (const unlisten of unlisteners) unlisten(); };
  }, [options.displayMode, options.openSettings, options.refresh, options.setDisplayMode, options.setSelectedGameId, options.settingsOpen, positionLocked, widgetMode, widgetPlacement]);

  return { alwaysOnTop, setAlwaysOnTop, widgetMode, setWidgetMode: setWidgetModeEnabled, positionLocked, setPositionLocked, widgetPlacement, setWidgetPlacement };
}
