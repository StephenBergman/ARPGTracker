import type { SeasonDateStatus } from "../../features/seasons/season.types";
import styles from "./SeasonTransition.module.css";

interface SeasonTransitionProps {
  status: SeasonDateStatus;
  checkingForUpdate: boolean;
  compact?: boolean;
}

export function SeasonTransition({ status, checkingForUpdate, compact = false }: SeasonTransitionProps) {
  const estimated = status === "estimated";
  return (
    <div className={styles.transition} data-compact={compact} role="status" aria-live="polite" aria-atomic="true">
      <span className={styles.mark} aria-hidden="true">◆</span>
      <div className={styles.message}>
        <strong>{estimated ? "Estimated start reached" : "It's launch time"}</strong>
        <span>{checkingForUpdate ? "Checking season information…" : estimated ? "Awaiting an official start date" : "Scheduled start reached · awaiting season update"}</span>
      </div>
    </div>
  );
}
