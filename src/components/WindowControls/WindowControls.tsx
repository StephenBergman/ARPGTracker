import { closeMainWindow, minimizeMainWindow, toggleMaximizeMainWindow } from "../../platform/window";
import type { DisplayMode } from "../../features/settings/settings.types";
import styles from "./WindowControls.module.css";

interface WindowControlsProps {
  displayMode: DisplayMode;
  alwaysOnTop: boolean;
  onToggleDisplayMode: () => void;
  onToggleAlwaysOnTop: () => void;
  onOpenSettings: () => void;
}

export function WindowControls({ displayMode, alwaysOnTop, onToggleDisplayMode, onToggleAlwaysOnTop, onOpenSettings }: WindowControlsProps) {
  return <div className={styles.controls} data-window-drag="disabled">
    <button aria-label="Open settings" className={styles.settings} onClick={onOpenSettings} title="Settings" type="button">&#9881;</button>
    <button aria-label={`${alwaysOnTop ? "Disable" : "Enable"} always on top`} aria-pressed={alwaysOnTop} className={styles.pin} data-active={alwaysOnTop} onClick={onToggleAlwaysOnTop} title="Always on top" type="button">&#9670;</button>
    <button aria-label={`Switch to ${displayMode === "compact" ? "expanded" : "compact"} mode`} className={styles.mode} onClick={onToggleDisplayMode} title={`Switch to ${displayMode === "compact" ? "expanded" : "compact"} mode`} type="button">{displayMode === "compact" ? "□" : "▭"}</button>
    <button aria-label="Minimize" onClick={minimizeMainWindow} title="Minimize" type="button">&#8212;</button>
    <button aria-label="Maximize or restore" className={styles.maximize} onClick={toggleMaximizeMainWindow} title="Maximize or restore" type="button">&#9633;</button>
    <button aria-label="Close to tray" className={styles.close} onClick={closeMainWindow} title="Close to tray" type="button">&#215;</button>
  </div>;
}
