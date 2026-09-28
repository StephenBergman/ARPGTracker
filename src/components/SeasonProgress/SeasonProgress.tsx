import type { GameSeasonData } from "../../features/seasons/season.types";
import { getSeasonProgress } from "../../features/seasons/season.utils";
import styles from "./SeasonProgress.module.css";

export function SeasonProgress({ season, now }: { season: GameSeasonData; now: number }) {
  const endDate = season.currentSeason.endDate ?? season.nextSeason.startDate;
  const progress = getSeasonProgress(season.currentSeason.startDate, endDate, now);
  if (progress === null) return null;
  const percent = Math.round(progress * 100);
  const approximate = season.nextSeason.status === "estimated";
  return <section className={styles.section} aria-label={`Season progress ${percent} percent${approximate ? ", approximate" : ""}`}><div className={styles.label}><span>Season progress{approximate ? " (approx.)" : ""}</span><strong>{percent}%</strong></div><div className={styles.track}><span style={{ width: `${percent}%` }} /></div></section>;
}
