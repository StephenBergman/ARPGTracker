import type { GameSeasonData } from "../../features/seasons/season.types";
import { formatCalendarDate, formatRelativeDuration, getTimeSince } from "../../features/seasons/season.utils";
import styles from "./CurrentSeason.module.css";

export function CurrentSeason({ season, now }: { season: GameSeasonData; now: number }) {
  const started = formatCalendarDate(season.currentSeason.startDate) ?? "Date unavailable";
  const activeFor = formatRelativeDuration(getTimeSince(season.currentSeason.startDate, now));
  return (
    <section className={styles.section} aria-labelledby="current-season-title">
      <header className={styles.heading}>
        <p>{season.gameName}</p>
        <h1 id="current-season-title">{season.currentSeason.title}</h1>
      </header>
      <div className={styles.facts}>
        <div><span>Season started</span><strong>{started}</strong></div>
        <div><span>Active for</span><strong>{activeFor}</strong></div>
      </div>
    </section>
  );
}
