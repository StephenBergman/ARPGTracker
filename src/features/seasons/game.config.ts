import type { GameId } from "./season.types";

export interface GameDefinition { id: GameId; shortName: string; }

export const GAME_DEFINITIONS: readonly GameDefinition[] = [
  { id: "poe", shortName: "POE" },
  { id: "poe2", shortName: "POE 2" },
  { id: "diablo4", shortName: "D4" },
  { id: "lastEpoch", shortName: "LE" },
  { id: "diablo2Resurrected", shortName: "D2R" },
  { id: "projectDiablo2", shortName: "PD2" },
  { id: "torchlightInfinite", shortName: "TLI" },
];
