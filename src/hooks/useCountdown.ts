import { useEffect, useRef, useState } from "react";
import { getTimeUntil, type DurationParts } from "../features/seasons/season.utils";

export type CountdownStatus = "active" | "elapsed" | "unavailable";
export interface CountdownSnapshot { status: CountdownStatus; remaining: DurationParts; }

export function getCountdownSnapshot(date: string | null | undefined, now = Date.now()): CountdownSnapshot {
  if (!date) return { status: "unavailable", remaining: getTimeUntil(null, now) };
  const target = Date.parse(date);
  if (!Number.isFinite(target)) return { status: "unavailable", remaining: getTimeUntil(null, now) };
  return { status: target <= now ? "elapsed" : "active", remaining: getTimeUntil(date, now) };
}

export function useCountdown(date: string | null | undefined, showSeconds: boolean, onElapsed?: () => void): CountdownSnapshot {
  const [snapshot, setSnapshot] = useState(() => getCountdownSnapshot(date));
  const elapsedCallback = useRef(onElapsed);
  const notifiedDate = useRef<string | null>(null);
  elapsedCallback.current = onElapsed;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    const interval = showSeconds ? 1_000 : 60_000;

    const update = () => {
      const current = getCountdownSnapshot(date);
      if (!active) return;
      setSnapshot(current);
      if (current.status === "elapsed" && date && notifiedDate.current !== date) {
        notifiedDate.current = date;
        elapsedCallback.current?.();
      }
      if (current.status === "active") {
        const delay = interval - (Date.now() % interval);
        timer = setTimeout(update, delay);
      }
    };

    if (notifiedDate.current !== date) notifiedDate.current = null;
    update();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [date, showSeconds]);

  return snapshot;
}
