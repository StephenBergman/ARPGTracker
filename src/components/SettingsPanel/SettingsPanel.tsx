import { useEffect, useRef, type KeyboardEvent } from "react";
import type { DisplayMode } from "../../features/settings/settings.types";
import { formatCalendarDate } from "../../features/seasons/season.utils";
import styles from "./SettingsPanel.module.css";
import type { StartupSyncStatus } from "../../hooks/useDisplayPreferences";
import type { AppUpdaterState } from "../../hooks/useAppUpdater";

interface ToggleRowProps { label: string; checked: boolean; onChange: (value: boolean) => void; description?: string; }
function ToggleRow({ label, checked, onChange, description }: ToggleRowProps) {
  return <div className={styles.row}><div><strong>{label}</strong>{description && <span>{description}</span>}</div><button aria-checked={checked} className={styles.switch} data-checked={checked} onClick={() => onChange(!checked)} role="switch" type="button"><span /></button></div>;
}

interface SettingsPanelProps {
  displayMode: DisplayMode; alwaysOnTop: boolean; widgetMode: boolean; positionLocked: boolean; launchAtStartup: boolean; startupSyncStatus: StartupSyncStatus; showSeconds: boolean; showSeasonProgress: boolean; lastUpdated: string; isRefreshing: boolean; appUpdater: AppUpdaterState;
  onDisplayMode: (mode: DisplayMode) => void; onAlwaysOnTop: (value: boolean) => void; onWidgetMode: (value: boolean) => void; onPositionLocked: (value: boolean) => void; onLaunchAtStartup: (value: boolean) => void; onShowSeconds: (value: boolean) => void; onShowSeasonProgress: (value: boolean) => void; onRefresh: () => void; onClose: () => void;
}

export function SettingsPanel(props: SettingsPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeButtonRef.current?.focus(); }, []);
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") { props.onClose(); return; }
    if (event.key !== "Tab") return;
    const controls = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])") ?? []);
    if (controls.length === 0) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const updatedDate = formatCalendarDate(props.lastUpdated) ?? "Unavailable";
  const updatedTime = Number.isFinite(Date.parse(props.lastUpdated)) ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(Date.parse(props.lastUpdated)) : "";
  const startupDescription = props.startupSyncStatus === "syncing" ? "Updating Windows startup…" : props.startupSyncStatus === "error" ? "Windows startup could not be updated" : "Start automatically after sign-in";
  const updater = props.appUpdater;
  const updateBusy = updater.status === "checking" || updater.status === "downloading" || updater.status === "installing";
  const updateMessage = updater.status === "available" ? `Version ${updater.availableVersion} is available` : updater.status === "checking" ? "Checking for application updates…" : updater.status === "downloading" ? `Downloading${updater.progress === null ? "…" : ` ${updater.progress}%`}` : updater.status === "installing" ? "Installing and restarting…" : updater.status === "current" ? "You have the latest version" : updater.status === "error" ? "Unable to check for updates" : "Checks automatically every 6 hours";
  return <section aria-label="Settings" aria-modal="true" className={styles.panel} data-window-drag="disabled" onKeyDown={handleKeyDown} ref={panelRef} role="dialog">
    <header><div><p>Preferences</p><h2>Settings</h2></div><button aria-label="Close settings" onClick={props.onClose} ref={closeButtonRef} type="button">&#215;</button></header>
    <div className={styles.group}><h3>General</h3>
      <ToggleRow label="Launch with Windows" checked={props.launchAtStartup} onChange={props.onLaunchAtStartup} description={startupDescription} />
      <ToggleRow label="Widget mode" checked={props.widgetMode} onChange={props.onWidgetMode} description="Hide from the taskbar and manage from the system tray" />
      <ToggleRow label="Lock position" checked={props.positionLocked} onChange={props.onPositionLocked} description="Prevent accidental dragging" />
      <ToggleRow label="Always on top" checked={props.alwaysOnTop} onChange={props.onAlwaysOnTop} />
      <ToggleRow label="Compact mode" checked={props.displayMode === "compact"} onChange={(value) => props.onDisplayMode(value ? "compact" : "expanded")} />
    </div>
    <div className={styles.group}><h3>Display</h3>
      <ToggleRow label="Show seconds" checked={props.showSeconds} onChange={props.onShowSeconds} />
      <ToggleRow label="Show season progress" checked={props.showSeasonProgress} onChange={props.onShowSeasonProgress} />
    </div>
    <div className={styles.group}><h3>Season data</h3><div className={styles.updated}><span>Last updated</span><strong>{updatedDate}{updatedTime ? ` at ${updatedTime}` : ""}</strong></div>
      <button className={styles.refresh} disabled={props.isRefreshing} onClick={props.onRefresh} type="button">{props.isRefreshing ? "Checking…" : "Refresh season data"}</button>
    </div>
    <div className={styles.group}><h3>Application</h3><div className={styles.updated}><span>Installed version</span><strong>{updater.currentVersion}</strong><span className={styles.updateMessage}>{updateMessage}</span>{updater.status === "available" && updater.releaseNotes && <span className={styles.releaseNotes}>{updater.releaseNotes}</span>}</div>
      {updater.status === "available" ? <button className={styles.refresh} onClick={() => { void updater.installUpdate(); }} type="button">Update and restart</button> : <button className={styles.refresh} disabled={updateBusy} onClick={() => { void updater.checkForUpdate(); }} type="button">{updater.status === "checking" ? "Checking…" : "Check for app update"}</button>}
    </div>
  </section>;
}
