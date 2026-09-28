import { LogicalSize } from "@tauri-apps/api/dpi";
import { availableMonitors, getCurrentWindow, PhysicalPosition, type Monitor } from "@tauri-apps/api/window";
import type { DisplayMode } from "../features/settings/settings.types";
export async function minimizeMainWindow(): Promise<void> { await getCurrentWindow().minimize(); }
export async function startDraggingMainWindow(): Promise<void> { try { await getCurrentWindow().startDragging(); } catch { /* Browser preview. */ } }
// Phase 7 can replace this implementation with hide-to-tray behavior.
export async function closeMainWindow(): Promise<void> { await getCurrentWindow().close(); }
export async function setWidgetDisplayMode(mode: DisplayMode): Promise<void> {
  try { await getCurrentWindow().setSize(new LogicalSize(430, mode === "compact" ? 136 : 620)); }
  catch { /* Browser preview has no native window; Tauri errors are non-fatal. */ }
}
export async function setWidgetAlwaysOnTop(value: boolean): Promise<void> { try { await getCurrentWindow().setAlwaysOnTop(value); } catch { /* Browser preview. */ } }

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
