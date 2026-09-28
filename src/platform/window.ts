import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { availableMonitors, currentMonitor, getCurrentWindow, PhysicalPosition, type Monitor } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { DisplayMode, WidgetPlacement } from "../features/settings/settings.types";
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
    const overlay = new WebviewWindow(SNAP_OVERLAY_LABEL, { url: "/?snap-overlay=1", x: position.x, y: position.y, width: size.width, height: size.height, decorations: false, transparent: true, alwaysOnTop: true, skipTaskbar: true, focus: false, resizable: false, shadow: false });
    await new Promise<void>((resolve, reject) => { void overlay.once("tauri://created", () => resolve()); void overlay.once("tauri://error", ({ payload }) => reject(payload)); });
    await overlay.setIgnoreCursorEvents(true);
  } catch { /* Overlay failure must not prevent dragging. */ }
}
export async function hideSnapOverlay(): Promise<void> { try { await (await WebviewWindow.getByLabel(SNAP_OVERLAY_LABEL))?.destroy(); } catch { /* Non-fatal. */ } }
export async function startDraggingMainWindow(showPlacementPreview = false): Promise<void> {
  try {
    if (showPlacementPreview) { await showSnapOverlay(); window.dispatchEvent(new Event("widget-native-drag-start")); }
    await getCurrentWindow().startDragging();
  } catch { /* Browser preview. */ }
  finally { if (showPlacementPreview) window.dispatchEvent(new Event("widget-native-drag-end")); }
}
// Phase 7 can replace this implementation with hide-to-tray behavior.
export async function closeMainWindow(): Promise<void> { await getCurrentWindow().close(); }
export async function setWidgetDisplayMode(mode: DisplayMode, widgetMode = false): Promise<void> {
  try { await getCurrentWindow().setSize(new LogicalSize(430, mode === "compact" ? 136 : widgetMode ? 560 : 620)); }
  catch { /* Browser preview has no native window; Tauri errors are non-fatal. */ }
}
export async function setWidgetAlwaysOnTop(value: boolean): Promise<void> { try { await getCurrentWindow().setAlwaysOnTop(value); } catch { /* Browser preview. */ } }
export async function setWidgetMode(value: boolean): Promise<void> { try { await getCurrentWindow().setSkipTaskbar(value); } catch { /* Browser preview. */ } }

const PLACEMENT_GAP = 12;
export function getWidgetPlacementSize(placement: WidgetPlacement): { width: number; height: number } {
  if (placement === "topCenter" || placement === "bottomCenter") return { width: 720, height: 210 };
  if (placement === "leftCenter" || placement === "rightCenter") return { width: 380, height: 560 };
  if (placement !== "free") return { width: 430, height: 390 };
  return { width: 430, height: 560 };
}

export function detectWidgetPlacement(position: { x: number; y: number }, size: { width: number; height: number }, monitors: readonly Monitor[]): WidgetPlacement {
  const center = { x: position.x + size.width / 2, y: position.y + size.height / 2 };
  const monitor = monitors.find((candidate) => center.x >= candidate.workArea.position.x && center.x < candidate.workArea.position.x + candidate.workArea.size.width && center.y >= candidate.workArea.position.y && center.y < candidate.workArea.position.y + candidate.workArea.size.height);
  if (!monitor) return "free";
  const horizontal = (center.x - monitor.workArea.position.x) / monitor.workArea.size.width;
  const vertical = (center.y - monitor.workArea.position.y) / monitor.workArea.size.height;
  const xZone = horizontal < 0.28 ? "Left" : horizontal > 0.72 ? "Right" : "Center";
  const yZone = vertical < 0.28 ? "top" : vertical > 0.72 ? "bottom" : "center";
  if (xZone === "Center" && yZone === "center") return "free";
  if (yZone === "center") return xZone === "Left" ? "leftCenter" : xZone === "Right" ? "rightCenter" : "free";
  if (xZone === "Center") return yZone === "top" ? "topCenter" : "bottomCenter";
  return `${yZone}${xZone}` as WidgetPlacement;
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
