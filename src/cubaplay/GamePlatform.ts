export interface GameResult {
  gameId: string;
  gameVersion: string;
  score: number;
  durationMs: number;
  statistics?: Record<string, number | string | boolean>;
}

export interface GamePlatform {
  initialize(): Promise<void>;
  getPlayer(): Promise<{ id: string; displayName?: string }>;
  startGame(): Promise<{ sessionId: string; seed?: string }>;
  submitResult(result: GameResult): Promise<void>;
  exitGame(): void;
}
