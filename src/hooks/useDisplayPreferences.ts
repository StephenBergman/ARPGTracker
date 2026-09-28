import { useEffect, useState } from "react";
import { loadLaunchAtStartup, loadShowSeasonProgress, loadShowSeconds, saveLaunchAtStartup, saveShowSeasonProgress, saveShowSeconds } from "../features/settings/settings.store";
import { synchronizeLaunchAtStartup } from "../platform/startup";

export type StartupSyncStatus = "idle" | "syncing" | "ready" | "error";

export function useDisplayPreferences() {
  const [launchAtStartup, setLaunchAtStartup] = useState(loadLaunchAtStartup);
  const [showSeconds, setShowSeconds] = useState(loadShowSeconds);
  const [showSeasonProgress, setShowSeasonProgress] = useState(loadShowSeasonProgress);
  const [startupSyncStatus, setStartupSyncStatus] = useState<StartupSyncStatus>("idle");
  useEffect(() => {
    let active = true;
    saveLaunchAtStartup(launchAtStartup);
    setStartupSyncStatus("syncing");
    void synchronizeLaunchAtStartup(launchAtStartup).then(() => { if (active) setStartupSyncStatus("ready"); }).catch(() => { if (active) setStartupSyncStatus("error"); });
    return () => { active = false; };
  }, [launchAtStartup]);
  useEffect(() => saveShowSeconds(showSeconds), [showSeconds]);
  useEffect(() => saveShowSeasonProgress(showSeasonProgress), [showSeasonProgress]);
  return { launchAtStartup, setLaunchAtStartup, startupSyncStatus, showSeconds, setShowSeconds, showSeasonProgress, setShowSeasonProgress };
}
