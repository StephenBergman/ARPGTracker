import { useCallback, useEffect, useState } from "react";
import { fetchEconomySnapshots, loadEconomySnapshots, saveEconomySnapshot } from "../features/economy/economy.service";
import type { EconomySnapshot } from "../features/economy/economy.types";

export function useEconomySnapshot(enabled: boolean, seasonTitle?: string) {
  const [history, setHistory] = useState<EconomySnapshot[]>(loadEconomySnapshots);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const snapshots = await fetchEconomySnapshots(seasonTitle);
      let next = loadEconomySnapshots();
      for (const snapshot of snapshots) next = saveEconomySnapshot(snapshot);
      setHistory(next);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Economy snapshot unavailable"); }
    finally { setIsRefreshing(false); }
  }, [seasonTitle]);
  useEffect(() => {
    if (!enabled) return;
    const latest = history[history.length - 1];
    if (!latest || latest.hour < Math.floor(Date.now() / 3_600_000) * 3_600 - 3_600) void refresh();
  }, [enabled, history, refresh]);
  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(() => { void refresh(); }, 60 * 60 * 1_000);
    return () => window.clearInterval(interval);
  }, [enabled, refresh]);
  const latest = history[history.length - 1] ?? null;
  const candidate = latest ? history.slice(0, -1).sort((left, right) => Math.abs(left.hour - (latest.hour - 86_400)) - Math.abs(right.hour - (latest.hour - 86_400)))[0] ?? null : null;
  const comparison = latest && candidate && Math.abs(candidate.hour - (latest.hour - 86_400)) <= 10_800 ? candidate : null;
  return { latest, previous: comparison, history, isRefreshing, error, refresh };
}
