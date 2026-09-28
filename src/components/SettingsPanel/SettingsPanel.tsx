import type { DisplayMode } from "../../features/settings/settings.types";
import { formatCalendarDate } from "../../features/seasons/season.utils";
import styles from "./SettingsPanel.module.css";
import type { StartupSyncStatus } from "../../hooks/useDisplayPreferences";

interface ToggleRowProps { label: string; checked: boolean; onChange: (value: boolean) => void; description?: string; }
function ToggleRow({ label, checked, onChange, description }: ToggleRowProps) {
  return <div className={styles.row}><div><strong>{label}</strong>{description && <span>{description}</span>}</div><button aria-checked={checked} className={styles.switch} data-checked={checked} onClick={() => onChange(!checked)} role="switch" type="button"><span /></button></div>;
}

interface SettingsPanelProps {
  displayMode: DisplayMode; alwaysOnTop: boolean; launchAtStartup: boolean; startupSyncStatus: StartupSyncStatus; showSeconds: boolean; showSeasonProgress: boolean; lastUpdated: string; isRefreshing: boolean;
  onDisplayMode: (mode: DisplayMode) => void; onAlwaysOnTop: (value: boolean) => void; onLaunchAtStartup: (value: boolean) => void; onShowSeconds: (value: boolean) => void; onShowSeasonProgress: (value: boolean) => void; onRefresh: () => void; onClose: () => void;
}

export function SettingsPanel(props: SettingsPanelProps) {
  const updatedDate = formatCalendarDate(props.lastUpdated) ?? "Unavailable";
  const updatedTime = Number.isFinite(Date.parse(props.lastUpdated)) ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(Date.parse(props.lastUpdated)) : "";
  const startupDescription = props.startupSyncStatus === "syncing" ? "Updating Windows startup…" : props.startupSyncStatus === "error" ? "Windows startup could not be updated" : "Start automatically after sign-in";
  return <section aria-label="Settings" className={styles.panel}>
    <header><div><p>Preferences</p><h2>Settings</h2></div><button aria-label="Close settings" onClick={props.onClose} type="button">&#215;</button></header>
    <div className={styles.group}><h3>General</h3>
      <ToggleRow label="Launch with Windows" checked={props.launchAtStartup} onChange={props.onLaunchAtStartup} description={startupDescription} />
      <ToggleRow label="Always on top" checked={props.alwaysOnTop} onChange={props.onAlwaysOnTop} />
      <ToggleRow label="Compact mode" checked={props.displayMode === "compact"} onChange={(value) => props.onDisplayMode(value ? "compact" : "expanded")} />
    </div>
    <div className={styles.group}><h3>Display</h3>
      <ToggleRow label="Show seconds" checked={props.showSeconds} onChange={props.onShowSeconds} />
      <ToggleRow label="Show season progress" checked={props.showSeasonProgress} onChange={props.onShowSeasonProgress} />
    </div>
    <div className={styles.group}><h3>Data</h3><div className={styles.updated}><span>Last updated</span><strong>{updatedDate}{updatedTime ? ` at ${updatedTime}` : ""}</strong></div>
      <button className={styles.refresh} disabled={props.isRefreshing} onClick={props.onRefresh} type="button">{props.isRefreshing ? "Checking…" : "Check for updates"}</button>
    </div>
  </section>;
}
