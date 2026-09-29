import type { GameId } from "../../features/seasons/season.types";
import { EconomySnapshot } from "../EconomySnapshot/EconomySnapshot";
import { openUrl } from "@tauri-apps/plugin-opener";
import styles from "./InsightsPanel.module.css";

interface ResourceLink {
  label: string;
  description: string;
  href: string;
  provider: "Maxroll" | "poe.ninja";
}

const RESOURCES: Partial<Record<GameId, readonly ResourceLink[]>> = {
  poe: [
    { label: "Popular build guides", description: "Curated league starters and endgame builds", href: "https://maxroll.gg/poe/build-guides", provider: "Maxroll" },
    { label: "Build trends", description: "Explore skills, classes, and equipment", href: "https://poe.ninja/poe1/builds", provider: "poe.ninja" },
    { label: "Market overview", description: "Currency and item prices for the current league", href: "https://poe.ninja/poe1/economy", provider: "poe.ninja" },
  ],
  poe2: [
    { label: "Popular build guides", description: "Curated leveling and endgame builds", href: "https://maxroll.gg/poe2/build-guides", provider: "Maxroll" },
    { label: "Build trends", description: "Explore skills, classes, and equipment", href: "https://poe.ninja/poe2/builds", provider: "poe.ninja" },
    { label: "Market overview", description: "Currency and item prices for the current league", href: "https://poe.ninja/poe2/economy", provider: "poe.ninja" },
  ],
  diablo4: [
    { label: "Popular build guides", description: "Curated leveling, endgame, and meta builds", href: "https://maxroll.gg/d4/build-guides", provider: "Maxroll" },
  ],
  lastEpoch: [
    { label: "Popular build guides", description: "Curated mastery and endgame builds", href: "https://maxroll.gg/last-epoch/build-guides", provider: "Maxroll" },
  ],
};

export function InsightsPanel({ gameId, seasonTitle }: { gameId: GameId; seasonTitle: string }) {
  const resources = RESOURCES[gameId] ?? [];
  return <aside className={styles.panel} aria-label="Builds and market">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>INSIGHTS</p><h2>Builds &amp; Market</h2></div>
      <span>External resources</span>
    </header>
    <EconomySnapshot enabled={gameId === "poe"} seasonTitle={seasonTitle} />
    <div className={styles.resources}>
      {resources.map((resource) => <button className={styles.resource} key={resource.href} onClick={() => { void openUrl(resource.href); }} type="button">
        <span className={styles.provider}>{resource.provider}</span>
        <strong>{resource.label}</strong>
        <small>{resource.description}</small>
        <span className={styles.open} aria-hidden="true">↗</span>
      </button>)}
    </div>
    <p className={styles.note}>Live provider data is opened at its source. Embedded, cached market snapshots can be added later without exposing unsupported build APIs.</p>
  </aside>;
}
