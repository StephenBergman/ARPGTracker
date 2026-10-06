import type { GameSeasonData } from "../../features/seasons/season.types";
import { useCountdown } from "../../hooks/useCountdown";
import { SeasonTransition } from "../SeasonTransition/SeasonTransition";
import styles from "./CompactWidget.module.css";

interface CompactWidgetProps { season: GameSeasonData; shortName: string; checkingForUpdate: boolean; onElapsed: () => void; }

export function CompactWidget({ season, shortName, checkingForUpdate, onElapsed }: CompactWidgetProps) {
  const countdown = useCountdown(season.nextSeason.status === "unknown" ? null : season.nextSeason.startDate, false, onElapsed);
  const nextText = countdown.status === "active"
    ? `Next season · ${countdown.remaining.days}d ${String(countdown.remaining.hours).padStart(2, "0")}h${season.nextSeason.status === "estimated" ? " · Estimated" : ""}`
    : "Next season not announced";
  return (
    <main className={styles.compact}>
      <p><strong>{shortName}</strong><span aria-hidden="true">•</span><span>{season.currentSeason.title}</span></p>
      {countdown.status === "elapsed"
        ? <SeasonTransition key={season.nextSeason.startDate} status={season.nextSeason.status} checkingForUpdate={checkingForUpdate} compact />
        : <p className={styles.next}>{nextText}</p>}
    </main>
  );
}