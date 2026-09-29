import { useEconomySnapshot } from "../../hooks/useEconomySnapshot";
import styles from "./EconomySnapshot.module.css";

function formatQuote(value: number): string { return value >= 100 ? value.toFixed(0) : value >= 10 ? value.toFixed(1) : value.toFixed(2); }

export function EconomySnapshot({ enabled, seasonTitle }: { enabled: boolean; seasonTitle: string }) {
  const economy = useEconomySnapshot(enabled, seasonTitle);
  if (!enabled) return null;
  const change = economy.latest && economy.previous ? ((economy.latest.chaosPerDivine / economy.previous.chaosPerDivine) - 1) * 100 : null;
  const ageHours = economy.latest ? Math.max(0, (Date.now() / 1_000 - economy.latest.hour) / 3_600) : null;
  const freshness = ageHours === null ? "empty" : ageHours > 30 ? "stale" : ageHours > 3 ? "cached" : "fresh";
  return <section className={styles.snapshot} aria-label="Path of Exile economy snapshot" data-freshness={freshness}>
    <div className={styles.heading}><div><span>OFFICIAL EXCHANGE</span><h3>Economy Snapshot</h3></div><button disabled={economy.isRefreshing} onClick={() => { void economy.refresh(); }} type="button">{economy.isRefreshing ? "Capturing…" : "Capture"}</button></div>
    {economy.latest ? <>
      <div className={styles.value}><strong>{economy.latest.chaosPerDivine.toFixed(1)}<small> chaos</small></strong><span>per Divine Orb</span></div>
      <div className={styles.metrics}>
        <div><span>Hourly range</span><strong>{economy.latest.chaosPerDivineLow.toFixed(0)}–{economy.latest.chaosPerDivineHigh.toFixed(0)}c</strong></div>
        <div><span>24-hour change</span><strong data-direction={change === null ? "flat" : change > 0 ? "up" : change < 0 ? "down" : "flat"}>{change === null ? "Unavailable" : `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}</strong></div>
      </div>
      <div className={styles.watchlist} aria-label="Currency watchlist">
        {economy.latest.quotes.slice(1).map((quote) => <div key={quote.id}><span>{quote.label}</span><strong>{formatQuote(quote.value)} <small>{quote.baseLabel}</small></strong></div>)}
      </div>
      <p><span className={styles.state}>{freshness === "stale" ? "STALE" : freshness === "cached" ? "CACHED" : "CURRENT"}</span> {economy.latest.league} · hour ending {new Date((economy.latest.hour + 3_600) * 1_000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {economy.history.length} saved</p>
    </> : <p className={styles.empty}>{economy.isRefreshing ? "Reading the latest completed exchange hour…" : economy.error ?? "Capture the first economy snapshot."}</p>}
    {economy.latest && economy.error && <p className={styles.error}>Refresh failed; showing the last saved snapshot. {economy.error}</p>}
  </section>;
}
