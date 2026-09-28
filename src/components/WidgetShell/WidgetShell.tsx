import type { CSSProperties, PointerEvent, PropsWithChildren } from "react";
import type { GameTheme } from "../../themes";
import type { DisplayMode } from "../../features/settings/settings.types";
import { startDraggingMainWindow } from "../../platform/window";
import { WindowControls } from "../WindowControls/WindowControls";
import styles from "./WidgetShell.module.css";

type ThemeStyle = CSSProperties & Record<`--${string}`, string>;
interface WidgetShellProps { theme: GameTheme; displayMode: DisplayMode; alwaysOnTop: boolean; onToggleDisplayMode: () => void; onToggleAlwaysOnTop: () => void; onOpenSettings: () => void; }
export function WidgetShell({ children, theme, displayMode, alwaysOnTop, onToggleDisplayMode, onToggleAlwaysOnTop, onOpenSettings }: PropsWithChildren<WidgetShellProps>) {
  const themeStyle: ThemeStyle = { "--color-background": theme.background, "--color-surface": theme.surface, "--color-border": theme.border, "--color-border-strong": theme.borderStrong, "--color-accent": theme.primary, "--color-accent-dim": theme.primaryDim, "--color-secondary": theme.secondary, "--color-text": theme.text, "--color-text-bright": theme.brightText, "--color-text-muted": theme.mutedText, "--color-glow": theme.glow };
  const beginDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !(event.target instanceof Element)) return;
    if (event.target.closest("button, a, input, select, textarea, [role='button'], [role='switch'], [data-window-drag='disabled']")) return;
    void startDraggingMainWindow();
  };
  return <div className={styles.frame} data-mode={displayMode} data-theme={theme.id} onPointerDown={beginDrag} style={themeStyle}><header className={styles.titlebar} data-tauri-drag-region><div className={styles.brand} data-tauri-drag-region><span className={styles.mark} aria-hidden="true" /><span data-tauri-drag-region>ARPG SEASONS</span></div><WindowControls displayMode={displayMode} alwaysOnTop={alwaysOnTop} onToggleDisplayMode={onToggleDisplayMode} onToggleAlwaysOnTop={onToggleAlwaysOnTop} onOpenSettings={onOpenSettings} /></header>{children}</div>;
}
