import { getVersion } from "@tauri-apps/api/app";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useRef, useState } from "react";

const UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const INITIAL_CHECK_DELAY_MS = 10_000;

export type AppUpdateStatus = "idle" | "checking" | "available" | "downloading" | "installing" | "current" | "error";
export interface AppUpdaterState { currentVersion: string; availableVersion: string | null; releaseNotes: string | null; progress: number | null; status: AppUpdateStatus; checkForUpdate: () => Promise<void>; installUpdate: () => Promise<void>; }

export function useAppUpdater(): AppUpdaterState {
  const updateRef = useRef<Update | null>(null);
  const checkingRef = useRef(false);
  const [currentVersion, setCurrentVersion] = useState("1.1.0");
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<AppUpdateStatus>("idle");

  const checkForUpdate = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setStatus("checking");
    try {
      const update = await check({ timeout: 15_000 });
      if (updateRef.current && updateRef.current !== update) await updateRef.current.close();
      updateRef.current = update;
      setAvailableVersion(update?.version ?? null);
      setReleaseNotes(update?.body?.trim() || null);
      setProgress(null);
      setStatus(update ? "available" : "current");
    } catch { setStatus("error"); }
    finally { checkingRef.current = false; }
  }, []);

  const installUpdate = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;
    setStatus("downloading");
    setProgress(0);
    let downloaded = 0;
    let total: number | undefined;
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") total = event.data.contentLength;
        if (event.event === "Progress") downloaded += event.data.chunkLength;
        if (event.event === "Finished") { setProgress(100); setStatus("installing"); return; }
        setProgress(total ? Math.min(99, Math.round((downloaded / total) * 100)) : null);
      }, { restartAfterInstall: true, timeout: 120_000 });
    } catch { setProgress(null); setStatus("error"); }
  }, []);

  useEffect(() => {
    void getVersion().then(setCurrentVersion).catch(() => { /* Browser preview. */ });
    const initial = window.setTimeout(() => { void checkForUpdate(); }, INITIAL_CHECK_DELAY_MS);
    const interval = window.setInterval(() => { void checkForUpdate(); }, UPDATE_INTERVAL_MS);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); if (updateRef.current) void updateRef.current.close(); };
  }, [checkForUpdate]);

  return { currentVersion, availableVersion, releaseNotes, progress, status, checkForUpdate, installUpdate };
}
