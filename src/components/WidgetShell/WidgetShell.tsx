import type { CSSProperties, PointerEvent, PropsWithChildren } from "react";
import type { DisplayMode, WidgetPlacement } from "../../features/settings/settings.types";
import { closeMainWindow, startDraggingMainWindow } from "../../platform/window";
import type { GameTheme } from "../../themes";
import { WindowControls } from "../WindowControls/WindowControls";
import styles from "./WidgetShell.module.css";

type ThemeStyle = CSSProperties & Record<`--${string}`, string>;
interface WidgetShellProps {
  theme: GameTheme; displayMode: DisplayMode; alwaysOnTop: boolean; widgetMode: boolean; positionLocked: boolean; widgetPlacement: WidgetPlacement;
  onToggleDisplayMode: () => void; onToggleAlwaysOnTop: () => void; onTogglePositionLock: () => void; onOpenSettings: () => void;
}

export function WidgetShell({ children, theme, displayMode, alwaysOnTop, widgetMode, positionLocked, widgetPlacement, onToggleDisplayMode, onToggleAlwaysOnTop, onTogglePositionLock, onOpenSettings }: PropsWithChildren<WidgetShellProps>) {
  const themeStyle: ThemeStyle = { "--color-background": theme.background, "--color-surface": theme.surface, "--color-border": theme.border, "--color-border-strong": theme.borderStrong, "--color-accent": theme.primary, "--color-accent-dim": theme.primaryDim, "--color-secondary": theme.secondary, "--color-text": theme.text, "--color-text-bright": theme.brightText, "--color-text-muted": theme.mutedText, "--color-glow": theme.glow };
  const beginDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (positionLocked || event.button !== 0 || !(event.target instanceof Element)) return;
    if (event.target.closest("button, a, input, select, textarea, [role='button'], [role='switch'], [data-window-drag='disabled']")) return;
    void startDraggingMainWindow();
  };
  return <div className={styles.frame} data-mode={displayMode} data-theme={theme.id} data-widget={widgetMode} data-locked={positionLocked} data-placement={widgetPlacement} onPointerDown={beginDrag} style={themeStyle}>
    {widgetMode ? <div aria-label="Widget controls" className={styles.widgetControls} data-window-drag="disabled">
      <button aria-label="Open settings" onClick={onOpenSettings} title="Settings" type="button">&#9881;</button>
      <button aria-label={positionLocked ? "Unlock widget position" : "Lock widget position"} aria-pressed={positionLocked} data-active={positionLocked} onClick={onTogglePositionLock} title={positionLocked ? "Unlock position" : "Lock position"} type="button">{positionLocked ? "\uD83D\uDD12" : "\uD83D\uDD13"}</button>
      <button aria-label="Close to tray" onClick={closeMainWindow} title="Close to tray" type="button">&#215;</button>
    </div> : <header className={styles.titlebar} data-tauri-drag-region={positionLocked ? undefined : true}>
      <div className={styles.brand} data-tauri-drag-region={positionLocked ? undefined : true}><span className={styles.mark} aria-hidden="true" /><span data-tauri-drag-region={positionLocked ? undefined : true}>ARPG SEASONS</span></div>
      <WindowControls displayMode={displayMode} alwaysOnTop={alwaysOnTop} onToggleDisplayMode={onToggleDisplayMode} onToggleAlwaysOnTop={onToggleAlwaysOnTop} onOpenSettings={onOpenSettings} />
    </header>}
    {children}
  </div>;
}
