import type { GameDefinition } from "../../features/seasons/game.config";
import type { GameId } from "../../features/seasons/season.types";
import styles from "./GameSelector.module.css";

export type WidgetContentLayout = "standard" | "horizontal" | "vertical" | "corner";
interface GameSelectorProps { games: readonly GameDefinition[]; selectedGameId: GameId; onSelect: (gameId: GameId) => void; layout?: WidgetContentLayout; }

export function GameSelector({ games, selectedGameId, onSelect, layout = "standard" }: GameSelectorProps) {
  return <nav className={styles.selector} data-layout={layout} aria-label="Choose a game">{games.map((game) => <button aria-pressed={game.id === selectedGameId} className={styles.gameButton} data-active={game.id === selectedGameId} key={game.id} onClick={() => onSelect(game.id)} type="button">{game.shortName}</button>)}</nav>;
}
