import { nanoid } from "nanoid";
import { db } from "../database/db";

class RoundService {
  public createRound(gameId: string, roundNumber: number) {
    const roundId = nanoid();
    db.query(
      `INSERT INTO rounds (id, game_id, round_number, phase, started_at) VALUES (?, ?, ?, 'ACTIVE', ?)`,
    ).run(roundId, gameId, roundNumber, new Date().toISOString());
    return roundId;
  }

  public getCurrentRoundId(gameId: string): string {
    const round = db
      .query(
        `
        SELECT id
        FROM rounds
        WHERE game_id = ?
        ORDER BY round_number DESC
        LIMIT 1
      `,
      )
      .get(gameId) as { id: string } | undefined;

    return round?.id ?? "";
  }
}

export const round_service = new RoundService();
