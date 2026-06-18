import { Database } from "bun:sqlite";

export const db = new Database("nym.db", {
  create: true,
});

export function intializeDb() {
  db.run(
    `
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,

      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,

      host_id TEXT NOT NULL,

      status TEXT NOT NULL,

      current_round INTEGER NOT NULL DEFAULT 0,

      discussion_duration INTEGER NOT NULL,
      voting_duration INTEGER NOT NULL,

      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      started_at INTEGER,
      ended_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS players (
      game_id TEXT NOT NULL,
      user_id TEXT NOT NULL,

      joined_at INTEGER NOT NULL DEFAULT (unixepoch()),

      is_host INTEGER NOT NULL DEFAULT 0,
      is_afk INTEGER NOT NULL DEFAULT 0,

      score INTEGER NOT NULL DEFAULT 0,

      messages_sent INTEGER NOT NULL DEFAULT 0,

      PRIMARY KEY (game_id, user_id),

      FOREIGN KEY (game_id)
        REFERENCES games(id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,

      game_id TEXT NOT NULL,

      round_number INTEGER NOT NULL,

      phase TEXT NOT NULL,

      started_at INTEGER NOT NULL,
      ended_at INTEGER,

      FOREIGN KEY (game_id)
        REFERENCES games(id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS aliases (
      round_id TEXT NOT NULL,

      user_id TEXT NOT NULL,

      alias_name TEXT NOT NULL,

      avatar_url TEXT,

      PRIMARY KEY (round_id, user_id),

      FOREIGN KEY (round_id)
        REFERENCES rounds(id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS votes (
      round_id TEXT NOT NULL,

      voter_id TEXT NOT NULL,

      alias_name TEXT NOT NULL,

      guessed_user_id TEXT NOT NULL,

      created_at INTEGER NOT NULL DEFAULT (unixepoch()),

      PRIMARY KEY (round_id, voter_id),

      FOREIGN KEY (round_id)
        REFERENCES rounds(id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS webhooks (
        channel_id TEXT PRIMARY KEY,
        webhook_id TEXT NOT NULL,
        webhook_token TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_games_channel
    ON games(channel_id);

    CREATE INDEX IF NOT EXISTS idx_players_game
    ON players(game_id);

    CREATE INDEX IF NOT EXISTS idx_rounds_game
    ON rounds(game_id);

    CREATE INDEX IF NOT EXISTS idx_aliases_round
    ON aliases(round_id);

    CREATE INDEX IF NOT EXISTS idx_votes_round
    ON votes(round_id);`,
  );
}
