import { useCallback, useState } from "react";
import { Countdown } from "../components/Countdown/Countdown";
import { CompactWidget } from "../components/CompactWidget/CompactWidget";
import { CurrentSeason } from "../components/CurrentSeason/CurrentSeason";
import { InsightsPanel } from "../components/InsightsPanel/InsightsPanel";
import { GameSelector, type WidgetContentLayout } from "../components/GameSelector/GameSelector";
import { SeasonProgress } from "../components/SeasonProgress/SeasonProgress";
import { SettingsPanel } from "../components/SettingsPanel/SettingsPanel";
import { SeasonReviewPanel } from "../components/SeasonReviewPanel/SeasonReviewPanel";
import { WidgetShell } from "../components/WidgetShell/WidgetShell";
import { GAME_DEFINITIONS } from "../features/seasons/game.config";
import type { GameId } from "../features/seasons/season.types";
import { useSeasonData } from "../hooks/useSeasonData";
import { useDisplayMode } from "../hooks/useDisplayMode";
import { useDesktopIntegration } from "../hooks/useDesktopIntegration";
import { useDisplayPreferences } from "../hooks/useDisplayPreferences";
import { useAppUpdater } from "../hooks/useAppUpdater";
import { useSeasonReviewer } from "../hooks/useSeasonReviewer";
import { loadSelectedGame } from "../features/settings/settings.store";
import { GAME_THEMES } from "../themes";
import styles from "./App.module.css";

export function App() {
  const [selectedGameId, setSelectedGameId] = useState<GameId>(loadSelectedGame);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const { displayMode, setDisplayMode, toggleDisplayMode } = useDisplayMode();
  const preferences = useDisplayPreferences();
  const { dataset, origin, refresh, isRefreshing } = useSeasonData();
  const openReviews = useCallback(() => { setDisplayMode("expanded"); setSettingsOpen(false); setReviewsOpen(true); }, [setDisplayMode]);
  const reviewer = useSeasonReviewer(openReviews, () => { void refresh(); });
  const appUpdater = useAppUpdater(!reviewer.enabled);
  const openSettings = useCallback(() => { setDisplayMode("expanded"); setReviewsOpen(false); setSettingsOpen(true); }, [setDisplayMode]);
  const { alwaysOnTop, setAlwaysOnTop, widgetMode, setWidgetMode, positionLocked, setPositionLocked, widgetPlacement, setWidgetPlacement } = useDesktopIntegration({ selectedGameId, setSelectedGameId, displayMode, setDisplayMode, settingsOpen: settingsOpen || reviewsOpen, refresh, openSettings });
  const selectedSeason = dataset.games[selectedGameId];
  const now = Date.now();
  const gameDefinition = GAME_DEFINITIONS.find((game) => game.id === selectedGameId) ?? GAME_DEFINITIONS[0];
  const setModeFromSettings = (mode: "compact" | "expanded") => { setDisplayMode(mode); if (mode === "compact") setSettingsOpen(false); };
  const setPlacementFromSettings = (placement: typeof widgetPlacement) => { setWidgetPlacement(placement); setPositionLocked(placement !== "free"); };
  const widgetLayout: WidgetContentLayout = !widgetMode ? "standard" : widgetPlacement === "topCenter" || widgetPlacement === "bottomCenter" ? "horizontal" : widgetPlacement === "leftCenter" || widgetPlacement === "rightCenter" ? "vertical" : widgetPlacement === "free" ? "standard" : "corner";
  return (
    <WidgetShell theme={GAME_THEMES[selectedGameId]} displayMode={displayMode} alwaysOnTop={alwaysOnTop} widgetMode={widgetMode} positionLocked={positionLocked} widgetPlacement={widgetPlacement} onToggleDisplayMode={toggleDisplayMode} onToggleAlwaysOnTop={() => setAlwaysOnTop((value) => !value)} onTogglePositionLock={() => setPositionLocked((value) => !value)} onOpenSettings={openSettings}>
      <div className={styles.body} inert={reviewsOpen}>
      {reviewer.enabled && <button aria-label={`Personal reviews, ${reviewer.pending.length} pending`} className={styles.reviews} data-window-drag="disabled" onClick={openReviews} type="button"><span>Season reviews</span>{reviewer.pending.length > 0 && <span className={styles.reviewCount}>{reviewer.pending.length}</span>}</button>}
      {displayMode === "compact" ? <CompactWidget season={selectedSeason} shortName={gameDefinition.shortName} checkingForUpdate={isRefreshing} onElapsed={() => { void refresh(); }} /> : <><GameSelector games={GAME_DEFINITIONS} selectedGameId={selectedGameId} onSelect={setSelectedGameId} layout={widgetLayout} />
      <div className={styles.workspace} data-standard={!widgetMode}>
      <main className={styles.content} data-layout={widgetLayout}>
        <CurrentSeason season={selectedSeason} now={now} />
        <div className={styles.divider} aria-hidden="true"><span /></div>
        <Countdown nextSeason={selectedSeason.nextSeason} showSeconds={preferences.showSeconds} checkingForUpdate={isRefreshing} onElapsed={() => { void refresh(); }} />
        {preferences.showSeasonProgress && <SeasonProgress season={selectedSeason} now={now} />}
        <p className={styles.source}>Data source: {origin}{isRefreshing ? " / checking for updates" : ""}</p>
      </main>
      {!widgetMode && <InsightsPanel gameId={selectedGameId} seasonTitle={selectedSeason.currentSeason.title} />}
      </div></>}
      </div>
      {reviewer.enabled && reviewsOpen && <SeasonReviewPanel reviewer={reviewer} onClose={() => setReviewsOpen(false)} />}
      {settingsOpen && <SettingsPanel displayMode={displayMode} alwaysOnTop={alwaysOnTop} widgetMode={widgetMode} positionLocked={positionLocked} widgetPlacement={widgetPlacement} launchAtStartup={preferences.launchAtStartup} startupSyncStatus={preferences.startupSyncStatus} showSeconds={preferences.showSeconds} showSeasonProgress={preferences.showSeasonProgress} lastUpdated={dataset.updatedAt} isRefreshing={isRefreshing} appUpdater={appUpdater} onDisplayMode={setModeFromSettings} onAlwaysOnTop={setAlwaysOnTop} onWidgetMode={(value) => { if (!value) setDisplayMode("expanded"); else setSettingsOpen(false); setWidgetMode(value); }} onPositionLocked={setPositionLocked} onWidgetPlacement={setPlacementFromSettings} onLaunchAtStartup={preferences.setLaunchAtStartup} onShowSeconds={preferences.setShowSeconds} onShowSeasonProgress={preferences.setShowSeasonProgress} onRefresh={() => { void refresh(); }} onClose={() => setSettingsOpen(false)} />}
    </WidgetShell>
  );
}
