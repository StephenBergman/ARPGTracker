import type { GameSeasonData } from "../../features/seasons/season.types";
import { useCountdown } from "../../hooks/useCountdown";
import styles from "./CompactWidget.module.css";

interface CompactWidgetProps { season: GameSeasonData; shortName: string; checkingForUpdate: boolean; onElapsed: () => void; }

export function CompactWidget({ season, shortName, checkingForUpdate, onElapsed }: CompactWidgetProps) {
  const countdown = useCountdown(season.nextSeason.startDate, false, onElapsed);
  let nextText = "Next season not announced";
  if (countdown.status === "active") nextText = `Next season · ${countdown.remaining.days}d ${String(countdown.remaining.hours).padStart(2, "0")}h`;
  if (countdown.status === "elapsed") nextText = checkingForUpdate ? "Checking season information…" : "Season transition in progress";
  return <main className={styles.compact}><p><strong>{shortName}</strong><span aria-hidden="true">•</span><span>{season.currentSeason.title}</span></p><p className={styles.next}>{nextText}</p></main>;
}
