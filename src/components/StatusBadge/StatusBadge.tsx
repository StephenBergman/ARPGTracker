import type { SeasonDateStatus } from "../../features/seasons/season.types";
import styles from "./StatusBadge.module.css";

const labels: Record<SeasonDateStatus, string> = { confirmed: "Confirmed", estimated: "Estimated", unknown: "Not announced" };

export function StatusBadge({ status }: { status: SeasonDateStatus }) {
  return <span className={styles.badge} data-status={status}><span className={styles.icon} aria-hidden="true" />{labels[status]}</span>;
}
