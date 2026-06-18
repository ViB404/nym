export interface LobbyEmbedOptions {
  hostId: string;

  currentPlayers: number;
  maxPlayers: number;

  rounds: number;

  discussion_duration: number;
  voting_duration: number;

  joinedPlayers: string[];
}
