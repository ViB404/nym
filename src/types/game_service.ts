export interface CreateGameOptions {
  guild_id: string;
  channel_id: string;
  host_id: string;

  rounds: number;

  discussion_duration: number;
  voting_duration: number;
}

export interface JoinGameOptions {
  game_id: string;
  user_id: string;
  players_limit: number;
  is_host: boolean;
  is_afk: boolean;
  score: number;
  message_sent: number;
}

export interface LeaveGameOptions {
  game_id: string;
  user_id: string;
}

export interface StartGameOptions {
  game_id: string;
}

export interface EndGameOptions {
  game_id: string;
  reason?: string;
}

export interface GenerateAliasOptions {
  round_id: string;
  user_id: string;
}

export type GameStatus = "LOBBY" | "DISCUSSION" | "VOTING" | "REVEAL" | "ENDED";

export interface PlayerInfo {
  game_id: string;
  user_id: string;
  joined_at: number;
  is_host: boolean;
  is_afk: boolean;
  score: number;
  message_sent: number;
}

export interface GameInfo {
  id: string;
  guild_id: string;
  channel_id: string;
  host_id: string;
  status: GameStatus;
  discussion_duration: number;
  voting_duration: number;
  players: PlayerInfo[];
}
