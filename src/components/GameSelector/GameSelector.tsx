import type { GameDefinition } from "../../features/seasons/game.config";
import type { GameId } from "../../features/seasons/season.types";
import styles from "./GameSelector.module.css";

interface GameSelectorProps { games: readonly GameDefinition[]; selectedGameId: GameId; onSelect: (gameId: GameId) => void; }

export function GameSelector({ games, selectedGameId, onSelect }: GameSelectorProps) {
  return <nav className={styles.selector} aria-label="Choose a game">{games.map((game) => <button aria-pressed={game.id === selectedGameId} className={styles.gameButton} data-active={game.id === selectedGameId} key={game.id} onClick={() => onSelect(game.id)} type="button">{game.shortName}</button>)}</nav>;
}
