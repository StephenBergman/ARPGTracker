import { useState } from "react";
import { Countdown } from "../components/Countdown/Countdown";
import { CompactWidget } from "../components/CompactWidget/CompactWidget";
import { CurrentSeason } from "../components/CurrentSeason/CurrentSeason";
import { GameSelector } from "../components/GameSelector/GameSelector";
import { SeasonProgress } from "../components/SeasonProgress/SeasonProgress";
import { WidgetShell } from "../components/WidgetShell/WidgetShell";
import { GAME_DEFINITIONS } from "../features/seasons/game.config";
import type { GameId } from "../features/seasons/season.types";
import { useSeasonData } from "../hooks/useSeasonData";
import { useDisplayMode } from "../hooks/useDisplayMode";
import { useDesktopIntegration } from "../hooks/useDesktopIntegration";
import { loadSelectedGame } from "../features/settings/settings.store";
import { GAME_THEMES } from "../themes";
import styles from "./App.module.css";

export function App() {
  const [selectedGameId, setSelectedGameId] = useState<GameId>(loadSelectedGame);
  const { displayMode, setDisplayMode, toggleDisplayMode } = useDisplayMode();
  const { dataset, origin, refresh, isRefreshing } = useSeasonData();
  const { alwaysOnTop, setAlwaysOnTop } = useDesktopIntegration({ selectedGameId, setSelectedGameId, displayMode, setDisplayMode, refresh });
  const selectedSeason = dataset.games[selectedGameId];
  const now = Date.now();
  const gameDefinition = GAME_DEFINITIONS.find((game) => game.id === selectedGameId) ?? GAME_DEFINITIONS[0];
  return (
    <WidgetShell theme={GAME_THEMES[selectedGameId]} displayMode={displayMode} alwaysOnTop={alwaysOnTop} onToggleDisplayMode={toggleDisplayMode} onToggleAlwaysOnTop={() => setAlwaysOnTop((value) => !value)}>
      {displayMode === "compact" ? <CompactWidget season={selectedSeason} shortName={gameDefinition.shortName} checkingForUpdate={isRefreshing} onElapsed={() => { void refresh(); }} /> : <><GameSelector games={GAME_DEFINITIONS} selectedGameId={selectedGameId} onSelect={setSelectedGameId} />
      <main className={styles.content}>
        <CurrentSeason season={selectedSeason} now={now} />
        <div className={styles.divider} aria-hidden="true"><span /></div>
        <Countdown nextSeason={selectedSeason.nextSeason} showSeconds checkingForUpdate={isRefreshing} onElapsed={() => { void refresh(); }} />
        <SeasonProgress season={selectedSeason} now={now} />
        <p className={styles.source}>Data source: {origin}{isRefreshing ? " / checking for updates" : ""}</p>
      </main></>}
    </WidgetShell>
  );
}
