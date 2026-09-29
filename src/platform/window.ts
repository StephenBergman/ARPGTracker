import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { availableMonitors, currentMonitor, getCurrentWindow, PhysicalPosition, type Monitor } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import type { DisplayMode, WidgetPlacement } from "../features/settings/settings.types";
import { loadStandardWindowSize } from "../features/settings/settings.store";
export async function minimizeMainWindow(): Promise<void> { await getCurrentWindow().minimize(); }
const SNAP_OVERLAY_LABEL = "snap-overlay";
async function showSnapOverlay(): Promise<void> {
  try {
    const existing = await WebviewWindow.getByLabel(SNAP_OVERLAY_LABEL);
    if (existing) await existing.destroy();
    const monitor = await currentMonitor();
    if (!monitor) return;
    const position = monitor.workArea.position.toLogical(monitor.scaleFactor);
    const size = monitor.workArea.size.toLogical(monitor.scaleFactor);
    const overlay = new WebviewWindow(SNAP_OVERLAY_LABEL, { url: "index.html?snap-overlay=1", x: position.x, y: position.y, width: size.width, height: size.height, decorations: false, transparent: true, alwaysOnTop: true, skipTaskbar: true, focus: false, resizable: false, shadow: false });
    await new Promise<void>((resolve, reject) => { void overlay.once("tauri://created", () => resolve()); void overlay.once("tauri://error", ({ payload }) => reject(payload)); });
    await overlay.setIgnoreCursorEvents(true);
  } catch { /* Overlay failure must not prevent dragging. */ }
}
export async function hideSnapOverlay(): Promise<void> { try { await (await WebviewWindow.getByLabel(SNAP_OVERLAY_LABEL))?.destroy(); } catch { /* Non-fatal. */ } }
export async function startDraggingMainWindow(showPlacementPreview = false): Promise<void> {
  try {
    if (showPlacementPreview) { await showSnapOverlay(); window.dispatchEvent(new Event("widget-native-drag-start")); await invoke("watch_widget_drag_release"); }
    await getCurrentWindow().startDragging();
  } catch { /* Browser preview. */ }
}
// Phase 7 can replace this implementation with hide-to-tray behavior.
export async function closeMainWindow(): Promise<void> { await getCurrentWindow().close(); }
export async function setWidgetDisplayMode(mode: DisplayMode, widgetMode = false): Promise<void> {
  try {
    const appWindow = getCurrentWindow();
    await appWindow.setResizable(!widgetMode);
    await appWindow.setMinSize(new LogicalSize(widgetMode ? 380 : 760, widgetMode ? 120 : 600));
    const standardSize = loadStandardWindowSize();
    await appWindow.setSize(widgetMode
      ? new LogicalSize(430, mode === "compact" ? 136 : 560)
      : new LogicalSize(standardSize.width, mode === "compact" ? 180 : standardSize.height));
  }
  catch { /* Browser preview has no native window; Tauri errors are non-fatal. */ }
}
export async function setWidgetAlwaysOnTop(value: boolean): Promise<void> { try { await getCurrentWindow().setAlwaysOnTop(value); } catch { /* Browser preview. */ } }
export async function setWidgetMode(value: boolean): Promise<void> { try { await getCurrentWindow().setSkipTaskbar(value); } catch { /* Browser preview. */ } }

const PLACEMENT_GAP = 12;
export function getWidgetPlacementSize(placement: WidgetPlacement): { width: number; height: number } {
  if (placement === "topCenter" || placement === "bottomCenter") return { width: 720, height: 250 };
  if (placement === "leftCenter" || placement === "rightCenter") return { width: 380, height: 560 };
  if (placement !== "free") return { width: 430, height: 390 };
  return { width: 430, height: 560 };
}

export function detectWidgetPlacement(position: { x: number; y: number }, size: { width: number; height: number }, monitors: readonly Monitor[]): WidgetPlacement {
  const dragged = { x: position.x, y: position.y, width: size.width, height: size.height };
  const fixedPlacements: readonly Exclude<WidgetPlacement, "free">[] = ["topLeft", "topCenter", "topRight", "leftCenter", "rightCenter", "bottomLeft", "bottomCenter", "bottomRight"];
  let best: { placement: WidgetPlacement; score: number } | null = null;
  for (const monitor of monitors) {
    const scale = monitor.scaleFactor;
    const area = monitor.workArea;
    for (const placement of fixedPlacements) {
      const logicalSize = getWidgetPlacementSize(placement);
      const target = { width: logicalSize.width * scale, height: logicalSize.height * scale, x: 0, y: 0 };
      const gap = PLACEMENT_GAP * scale;
      target.x = placement.endsWith("Left") || placement === "leftCenter" ? area.position.x + gap : placement.endsWith("Right") || placement === "rightCenter" ? area.position.x + area.size.width - target.width - gap : area.position.x + (area.size.width - target.width) / 2;
      target.y = placement.startsWith("top") ? area.position.y + gap : placement.startsWith("bottom") ? area.position.y + area.size.height - target.height - gap : area.position.y + (area.size.height - target.height) / 2;
      const overlapWidth = Math.max(0, Math.min(dragged.x + dragged.width, target.x + target.width) - Math.max(dragged.x, target.x));
      const overlapHeight = Math.max(0, Math.min(dragged.y + dragged.height, target.y + target.height) - Math.max(dragged.y, target.y));
      const overlapRatio = (overlapWidth * overlapHeight) / Math.max(1, Math.min(dragged.width * dragged.height, target.width * target.height));
      const dx = Math.max(target.x - (dragged.x + dragged.width), dragged.x - (target.x + target.width), 0);
      const dy = Math.max(target.y - (dragged.y + dragged.height), dragged.y - (target.y + target.height), 0);
      const distance = Math.hypot(dx, dy);
      const tolerance = 72 * scale;
      if (overlapRatio < 0.1 && distance > tolerance) continue;
      const score = overlapRatio * 10_000 - distance;
      if (!best || score > best.score) best = { placement, score };
    }
  }
  return best?.placement ?? "free";
}

export async function applyWidgetPlacement(placement: WidgetPlacement): Promise<void> {
  if (placement === "free") return;
  try {
    const monitor = await currentMonitor();
    if (!monitor) return;
    const areaPosition = monitor.workArea.position.toLogical(monitor.scaleFactor);
    const areaSize = monitor.workArea.size.toLogical(monitor.scaleFactor);
    const size = getWidgetPlacementSize(placement);
    const left = areaPosition.x + PLACEMENT_GAP;
    const centerX = areaPosition.x + Math.round((areaSize.width - size.width) / 2);
    const right = areaPosition.x + areaSize.width - size.width - PLACEMENT_GAP;
    const top = areaPosition.y + PLACEMENT_GAP;
    const centerY = areaPosition.y + Math.round((areaSize.height - size.height) / 2);
    const bottom = areaPosition.y + areaSize.height - size.height - PLACEMENT_GAP;
    const x = placement.endsWith("Left") || placement === "leftCenter" ? left : placement.endsWith("Right") || placement === "rightCenter" ? right : centerX;
    const y = placement.startsWith("top") ? top : placement.startsWith("bottom") ? bottom : centerY;
    const appWindow = getCurrentWindow();
    await Promise.all([appWindow.setSize(new LogicalSize(size.width, size.height)), appWindow.setPosition(new LogicalPosition(x, y))]);
  } catch { /* Browser preview. */ }
}

export function isPositionOnAvailableDisplay(position: { x: number; y: number }, monitors: readonly Monitor[]): boolean {
  return monitors.some((monitor) => position.x >= monitor.position.x - 80 && position.x < monitor.position.x + monitor.size.width - 40 && position.y >= monitor.position.y - 40 && position.y < monitor.position.y + monitor.size.height - 40);
}

export async function restoreWidgetPosition(position: { x: number; y: number } | null): Promise<void> {
  if (!position) return;
  try {
    const appWindow = getCurrentWindow();
    if (isPositionOnAvailableDisplay(position, await availableMonitors())) await appWindow.setPosition(new PhysicalPosition(position.x, position.y));
    else await appWindow.center();
  } catch { /* Browser preview. */ }
}
