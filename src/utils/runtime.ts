import type { GameTimer } from "../services/timer.service";

export const ActiveGames = new Map<
  string,
  {
    timer: GameTimer;
    round: number;
  }
>();
