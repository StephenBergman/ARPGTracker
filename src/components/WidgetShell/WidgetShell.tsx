import type { CSSProperties, PropsWithChildren } from "react";
import type { GameTheme } from "../../themes";
import type { DisplayMode } from "../../features/settings/settings.types";
import { WindowControls } from "../WindowControls/WindowControls";
import styles from "./WidgetShell.module.css";

type ThemeStyle = CSSProperties & Record<`--${string}`, string>;
interface WidgetShellProps { theme: GameTheme; displayMode: DisplayMode; alwaysOnTop: boolean; onToggleDisplayMode: () => void; onToggleAlwaysOnTop: () => void; }
export function WidgetShell({ children, theme, displayMode, alwaysOnTop, onToggleDisplayMode, onToggleAlwaysOnTop }: PropsWithChildren<WidgetShellProps>) {
  const themeStyle: ThemeStyle = { "--color-background": theme.background, "--color-surface": theme.surface, "--color-border": theme.border, "--color-border-strong": theme.borderStrong, "--color-accent": theme.primary, "--color-accent-dim": theme.primaryDim, "--color-secondary": theme.secondary, "--color-text": theme.text, "--color-text-bright": theme.brightText, "--color-text-muted": theme.mutedText, "--color-glow": theme.glow };
  return <div className={styles.frame} data-mode={displayMode} data-theme={theme.id} style={themeStyle}><header className={styles.titlebar} data-tauri-drag-region><div className={styles.brand} data-tauri-drag-region><span className={styles.mark} aria-hidden="true" /><span data-tauri-drag-region>ARPG SEASONS</span></div><WindowControls displayMode={displayMode} alwaysOnTop={alwaysOnTop} onToggleDisplayMode={onToggleDisplayMode} onToggleAlwaysOnTop={onToggleAlwaysOnTop} /></header>{children}</div>;
}
