import { db } from "../database/db";
import type { GenerateAliasOptions } from "../types/game_service";
import { ALIASES } from "../config";

export class AliasService {
  public getAliasByUserId(userId: string): string {
    const alias = db
      .query(
        `
        SELECT alias_name
        FROM aliases
        WHERE user_id = ?
        LIMIT 1
      `,
      )
      .get(userId) as { alias_name: string } | null;

    return alias?.alias_name ?? "Unknown";
  }

  public getAliasAvatarUrl(userId: string): string {
    const alias = db
      .query(
        `
        SELECT avatar_url
        FROM aliases
        WHERE user_id = ?
        LIMIT 1
      `,
      )
      .get(userId) as { avatar_url: string } | null;

    return alias?.avatar_url ?? "";
  }

  public generateAlias(options: GenerateAliasOptions): string {
    const usedAliases = db
      .query(
        `
      SELECT alias_name
      FROM aliases
      WHERE round_id = ?
    `,
      )
      .all(options.round_id) as {
      alias_name: string;
    }[];

    const used = new Set(usedAliases.map((a) => a.alias_name));

    const availableAliases = ALIASES.filter((alias) => !used.has(alias));

    if (availableAliases.length === 0) {
      throw new Error("Not enough aliases available for this round.");
    }

    const aliasName =
      availableAliases[Math.floor(Math.random() * availableAliases.length)]!;

    const avatarURL = `https://api.dicebear.com/9.x/bottts/png?seed=${encodeURIComponent(
      aliasName,
    )}`;

    db.query(
      `
      INSERT INTO aliases (
        round_id,
        user_id,
        alias_name,
        avatar_url
      )
      VALUES (?, ?, ?, ?)
    `,
    ).run(options.round_id, options.user_id, aliasName, avatarURL);

    return aliasName;
  }

  public getAliasesForRound(roundId: string) {
    return db
      .query(
        `
        SELECT
          user_id,
          alias_name
        FROM aliases
        WHERE round_id = ?
      `,
      )
      .all(roundId) as {
      user_id: string;
      alias_name: string;
    }[];
  }

  public getAliasForRound(roundId: string, userId: string) {
    return db
      .query(
        `
        SELECT
          alias_name,
          avatar_url
        FROM aliases
        WHERE round_id = ? AND user_id = ?
        LIMIT 1
      `,
      )
      .get(roundId, userId) as {
      alias_name: string;
      avatar_url: string;
    } | null;
  }

  public getUserIdByAlias(
    roundId: string,
    aliasName: string,
  ): string | undefined {
    const result = db
      .query(
        `
        SELECT user_id
        FROM aliases
        WHERE round_id = ? AND alias_name = ?
        LIMIT 1
      `,
      )
      .get(roundId, aliasName) as { user_id: string } | undefined;

    return result?.user_id;
  }
}

export const aliasService = new AliasService();
