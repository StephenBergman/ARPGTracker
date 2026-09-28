import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserSeasonCache, HttpSeasonSource, SeasonService, type SeasonDataOrigin } from "../features/seasons/season.service";
import type { SeasonDataset } from "../features/seasons/season.types";

export interface SeasonDataState {
  dataset: SeasonDataset;
  origin: SeasonDataOrigin;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

type StoredSeasonData = Pick<SeasonDataState, "dataset" | "origin">;
const DEFAULT_SEASON_DATA_URL = "https://raw.githubusercontent.com/StephenBergman/ARPGTracker/main/data/seasons.json";
const SEASON_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const INITIAL_REFRESH_DELAY_MS = 5_000;

export function useSeasonData(): SeasonDataState {
  const service = useMemo(() => {
    const url = import.meta.env.VITE_SEASON_DATA_URL || DEFAULT_SEASON_DATA_URL;
    return new SeasonService(new BrowserSeasonCache(), new HttpSeasonSource(url));
  }, []);
  const [state, setState] = useState<StoredSeasonData>({ dataset: service.getBundledSnapshot(), origin: "bundled" });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    void service.loadLocal().then((result) => {
      if (active) setState({ dataset: result.data, origin: result.origin });
    });
    return () => { active = false; };
  }, [service]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await service.refresh(state.dataset);
      if (result.data !== state.dataset) setState({ dataset: result.data, origin: result.origin });
    } finally { setIsRefreshing(false); }
  }, [service, state.dataset]);

  useEffect(() => {
    const initial = window.setTimeout(() => { void refresh(); }, INITIAL_REFRESH_DELAY_MS);
    const interval = window.setInterval(() => { void refresh(); }, SEASON_REFRESH_INTERVAL_MS);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); };
  }, [refresh]);

  return { ...state, refresh, isRefreshing };
}
