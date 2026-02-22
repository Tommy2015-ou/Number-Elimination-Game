import { Type } from "@google/genai";

export enum GameMode {
  CLASSIC = "CLASSIC",
  TIME = "TIME",
}

export interface BlockData {
  id: string;
  value: number;
  row: number;
  col: number;
  isSelected: boolean;
}

export interface GameState {
  grid: BlockData[];
  targetSum: number;
  currentSum: number;
  score: number;
  gameOver: boolean;
  mode: GameMode;
  timeLeft: number;
  highScore: number;
}
