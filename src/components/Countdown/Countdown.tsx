import type { NextSeason } from "../../features/seasons/season.types";
import { formatCalendarDate } from "../../features/seasons/season.utils";
import { useCountdown } from "../../hooks/useCountdown";
import { SeasonTransition } from "../SeasonTransition/SeasonTransition";
import { StatusBadge } from "../StatusBadge/StatusBadge";
import styles from "./Countdown.module.css";

interface CountdownProps { nextSeason: NextSeason; showSeconds?: boolean; checkingForUpdate?: boolean; onElapsed?: () => void; }

export function Countdown({ nextSeason, showSeconds = true, checkingForUpdate = false, onElapsed }: CountdownProps) {
  const countdown = useCountdown(nextSeason.status === "unknown" ? null : nextSeason.startDate, showSeconds, onElapsed);
  if (countdown.status === "unavailable" || nextSeason.status === "unknown") {
    return <section className={styles.section} aria-label="Next season"><p className={styles.eyebrow}>Next season</p><p className={styles.unknown}>Next season has not been announced</p><StatusBadge status="unknown" /></section>;
  }
  const duration = countdown.remaining;
  const units = [
    { label: "Days", value: String(duration.days) },
    { label: "Hours", value: String(duration.hours).padStart(2, "0") },
    { label: "Minutes", value: String(duration.minutes).padStart(2, "0") },
    ...(showSeconds ? [{ label: "Seconds", value: String(duration.seconds).padStart(2, "0") }] : []),
  ];
  return (
    <section className={styles.section} aria-label="Next season countdown">
      <p className={styles.eyebrow}>{nextSeason.title ?? "Next season"}</p>
      <p className={styles.date}>{formatCalendarDate(nextSeason.startDate)}</p>
      {countdown.status === "elapsed" ? <SeasonTransition key={nextSeason.startDate} status={nextSeason.status} checkingForUpdate={checkingForUpdate} /> : <div className={styles.countdown} data-units={units.length} aria-label={`${duration.days} days, ${duration.hours} hours, ${duration.minutes} minutes${showSeconds ? `, ${duration.seconds} seconds` : ""}`}>{units.map((unit) => <div key={unit.label}><strong>{unit.value}</strong><span>{unit.label}</span></div>)}</div>}
      <StatusBadge status={nextSeason.status} />
    </section>
  );
}
