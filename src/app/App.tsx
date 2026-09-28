import { useCallback, useState } from "react";
import { Countdown } from "../components/Countdown/Countdown";
import { CompactWidget } from "../components/CompactWidget/CompactWidget";
import { CurrentSeason } from "../components/CurrentSeason/CurrentSeason";
import { GameSelector } from "../components/GameSelector/GameSelector";
import { SeasonProgress } from "../components/SeasonProgress/SeasonProgress";
import { SettingsPanel } from "../components/SettingsPanel/SettingsPanel";
import { WidgetShell } from "../components/WidgetShell/WidgetShell";
import { GAME_DEFINITIONS } from "../features/seasons/game.config";
import type { GameId } from "../features/seasons/season.types";
import { useSeasonData } from "../hooks/useSeasonData";
import { useDisplayMode } from "../hooks/useDisplayMode";
import { useDesktopIntegration } from "../hooks/useDesktopIntegration";
import { useDisplayPreferences } from "../hooks/useDisplayPreferences";
import { loadSelectedGame } from "../features/settings/settings.store";
import { GAME_THEMES } from "../themes";
import styles from "./App.module.css";

export function App() {
  const [selectedGameId, setSelectedGameId] = useState<GameId>(loadSelectedGame);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { displayMode, setDisplayMode, toggleDisplayMode } = useDisplayMode();
  const preferences = useDisplayPreferences();
  const { dataset, origin, refresh, isRefreshing } = useSeasonData();
  const openSettings = useCallback(() => { setDisplayMode("expanded"); setSettingsOpen(true); }, [setDisplayMode]);
  const { alwaysOnTop, setAlwaysOnTop } = useDesktopIntegration({ selectedGameId, setSelectedGameId, displayMode, setDisplayMode, refresh, openSettings });
  const selectedSeason = dataset.games[selectedGameId];
  const now = Date.now();
  const gameDefinition = GAME_DEFINITIONS.find((game) => game.id === selectedGameId) ?? GAME_DEFINITIONS[0];
  const setModeFromSettings = (mode: "compact" | "expanded") => { setDisplayMode(mode); if (mode === "compact") setSettingsOpen(false); };
  return (
    <WidgetShell theme={GAME_THEMES[selectedGameId]} displayMode={displayMode} alwaysOnTop={alwaysOnTop} onToggleDisplayMode={toggleDisplayMode} onToggleAlwaysOnTop={() => setAlwaysOnTop((value) => !value)} onOpenSettings={openSettings}>
      {displayMode === "compact" ? <CompactWidget season={selectedSeason} shortName={gameDefinition.shortName} checkingForUpdate={isRefreshing} onElapsed={() => { void refresh(); }} /> : <><GameSelector games={GAME_DEFINITIONS} selectedGameId={selectedGameId} onSelect={setSelectedGameId} />
      <main className={styles.content}>
        <CurrentSeason season={selectedSeason} now={now} />
        <div className={styles.divider} aria-hidden="true"><span /></div>
        <Countdown nextSeason={selectedSeason.nextSeason} showSeconds={preferences.showSeconds} checkingForUpdate={isRefreshing} onElapsed={() => { void refresh(); }} />
        {preferences.showSeasonProgress && <SeasonProgress season={selectedSeason} now={now} />}
        <p className={styles.source}>Data source: {origin}{isRefreshing ? " / checking for updates" : ""}</p>
      </main></>}
      {settingsOpen && <SettingsPanel displayMode={displayMode} alwaysOnTop={alwaysOnTop} launchAtStartup={preferences.launchAtStartup} startupSyncStatus={preferences.startupSyncStatus} showSeconds={preferences.showSeconds} showSeasonProgress={preferences.showSeasonProgress} lastUpdated={dataset.updatedAt} isRefreshing={isRefreshing} onDisplayMode={setModeFromSettings} onAlwaysOnTop={setAlwaysOnTop} onLaunchAtStartup={preferences.setLaunchAtStartup} onShowSeconds={preferences.setShowSeconds} onShowSeasonProgress={preferences.setShowSeasonProgress} onRefresh={() => { void refresh(); }} onClose={() => setSettingsOpen(false)} />}
    </WidgetShell>
  );
}
