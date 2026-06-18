import { nanoid } from "nanoid";
import { db } from "../database/db";
import type {
  CreateGameOptions,
  EndGameOptions,
  GameInfo,
  GameStatus,
  JoinGameOptions,
  LeaveGameOptions,
  PlayerInfo,
  StartGameOptions,
} from "../types/game_service";

import {
  ActiveGameExistsError,
  AlreadyJoinedError,
  FailedToJoinGameError,
  FailedToLeaveGameError,
  GameNotFoundError,
  LobbyClosedError,
  NotEnoughPlayersError,
  PlayerLimitReachedError,
} from "../errors/game-error";
import { MIN_PLAYERS, REVEAL_DURATION } from "../config";
import { aliasService } from "./alias.service";
import { round_service } from "./round.service";
import { GameTimer } from "./timer.service";
import { ActiveGames } from "../utils/runtime";
import { voteService } from "./vote.service";
import { messageService } from "./message.service";
import { MessageType } from "../types/type";

export class GameService {
  public createGame(options: CreateGameOptions) {
    const gameId = nanoid();

    if (this.hasActiveGame(options.channel_id)) {
      throw new ActiveGameExistsError();
    }

    const result = db
      .query(
        `
        INSERT INTO games (
          id,
          guild_id,
          channel_id,
          host_id,
          status,
          discussion_duration,
          voting_duration,
          created_at
        )
        VALUES (
          ?, ?, ?, ?,
          'LOBBY',
          ?, ?, ?
        )
      `,
      )
      .run(
        gameId,
        options.guild_id,
        options.channel_id,
        options.host_id,
        options.discussion_duration,
        options.voting_duration,
        Date.now(),
      );

    if (result.changes !== 1) {
      throw new Error("Failed to create game");
    }

    return {
      gameId,
    };
  }

  public joinGame(options: JoinGameOptions) {
    const game = this.getGame(options.game_id) as {
      id: string;
      status: string;
    } | null;

    if (!game) {
      throw new GameNotFoundError();
    }

    if (game.status !== "LOBBY") {
      throw new LobbyClosedError();
    }

    const existingPlayer = db
      .query(
        `
        SELECT 1
        FROM players
        WHERE game_id = ?
          AND user_id = ?
        LIMIT 1
      `,
      )
      .get(options.game_id, options.user_id);

    if (existingPlayer) {
      throw new AlreadyJoinedError();
    }

    const playerCount = this.playerCount(options.game_id);

    if (playerCount >= options.players_limit) {
      throw new PlayerLimitReachedError();
    }

    const result = db
      .query(
        `
        INSERT INTO players (
          game_id,
          user_id,
          is_host,
          is_afk,
          score,
          messages_sent
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        options.game_id,
        options.user_id,
        options.is_host,
        options.is_afk,
        options.score,
        options.message_sent,
      );

    if (result.changes !== 1) {
      throw new FailedToJoinGameError();
    }

    return {
      playerCount: playerCount + 1,
    };
  }

  // Future Use
  public leaveGame(options: LeaveGameOptions) {
    const game = this.getGame(options.game_id);

    if (!game) {
      throw new GameNotFoundError();
    }

    const result = db
      .query(
        `
        DELETE FROM players
        WHERE game_id = ?
          AND user_id = ?
      `,
      )
      .run(options.game_id, options.user_id);

    if (result.changes !== 1) {
      throw new FailedToLeaveGameError();
    }

    return {
      message: "Game left successfully",
    };
  }

  public async startDiscussionPhase(gameId: string, roundNumber?: number) {
    console.log(`[GAME ${gameId}] DISCUSSION phase started`);

    this.updateStatus(gameId, "DISCUSSION");

    const roundId = round_service.createRound(gameId, roundNumber ?? 1);

    const players = this.getListOfPlayersWithGameId(gameId);

    for (const player of players) {
      aliasService.generateAlias({
        round_id: roundId,
        user_id: player.user_id,
      });
    }

    console.log(`[GAME ${gameId}] Round ${roundNumber ?? 1} created`);

    console.log(`[GAME ${gameId}] Generated ${players.length} aliases`);
  }

  public async endGame(options: EndGameOptions) {
    ActiveGames.delete(options.game_id);

    this.destroy(options.game_id);

    let lobbyMessageInfo = messageService.getMessage(
      options.game_id,
      MessageType.Lobby,
    );
    if (lobbyMessageInfo) {
      await messageService.deleteMessage(
        lobbyMessageInfo.channelId,
        lobbyMessageInfo.messageId,
      );
    }

    console.log(`[GAME ${options.game_id}] Ended`);
  }

  public async startGame(options: StartGameOptions) {
    const game = this.getGame(options.game_id);

    if (!game) {
      throw new GameNotFoundError();
    }

    const playerCount = this.playerCount(options.game_id);

    if (playerCount < MIN_PLAYERS) {
      throw new NotEnoughPlayersError();
    }

    const timer = new GameTimer({
      discussion: game.discussion_duration,
      voting: game.voting_duration,
      reveal: REVEAL_DURATION,
    });

    timer.on("phaseChange", async ({ currentPhase, round }) => {
      console.log(
        `[GAME ${options.game_id}] Phase => ${currentPhase} | Round ${round}`,
      );

      switch (currentPhase) {
        case "DISCUSSION":
          await this.startDiscussionPhase(options.game_id, round);
          break;

        case "VOTING":
          await voteService.startVotingPhase(options.game_id);
          break;

        case "REVEAL":
          await voteService.startRevealPhase(options.game_id);
          break;
      }
    });

    timer.on("tick", ({ phase, remainingSeconds, progress }) => {
      console.log(
        `[GAME ${options.game_id}] ${phase} | ${remainingSeconds}s | ${progress}%`,
      );
    });

    timer.on("ended", async () => {
      await this.endGame({
        game_id: options.game_id,
      });
    });

    ActiveGames.set(options.game_id, {
      timer,
      round: 1,
    });

    timer.start();
  }

  public getGame(gameId: string): GameInfo | undefined {
    return db
      .query(
        `
        SELECT *
        FROM games
        WHERE id = ?
        LIMIT 1
      `,
      )
      .get(gameId) as GameInfo | undefined;
  }

  public getGameByChannel(channelId: string): GameInfo | undefined {
    return db
      .query(
        `
        SELECT *
         FROM games
        WHERE channel_id = ?
          AND status != 'ENDED'
        LIMIT 1
      `,
      )
      .get(channelId) as GameInfo | undefined;
  }

  public hasActiveGame(channelId: string): boolean {
    const game = db
      .query(
        `
        SELECT 1
        FROM games
        WHERE channel_id = ?
          AND status != 'ENDED'
        LIMIT 1
      `,
      )
      .get(channelId) as GameInfo | undefined;

    return Boolean(game);
  }

  public updateStatus(gameId: string, status: GameStatus) {
    return db
      .query(
        `
        UPDATE games
        SET status = ?
        WHERE id = ?
      `,
      )
      .run(status, gameId);
  }

  public destroy(gameId: string) {
    const rounds = db
      .query(
        `
      SELECT id
      FROM rounds
      WHERE game_id = ?
    `,
      )
      .all(gameId) as { id: string }[];

    for (const round of rounds) {
      db.query(`DELETE FROM aliases WHERE round_id = ?`).run(round.id);
      db.query(`DELETE FROM votes WHERE round_id = ?`).run(round.id);
    }

    db.query(`DELETE FROM rounds WHERE game_id = ?`).run(gameId);
    db.query(`DELETE FROM players WHERE game_id = ?`).run(gameId);
    db.query(`DELETE FROM games WHERE id = ?`).run(gameId);
  }

  public playerCount(gameId: string): number {
    const result = db
      .query(
        `
        SELECT COUNT(*) as count
        FROM players
        WHERE game_id = ?
      `,
      )
      .get(gameId) as {
      count: number;
    };

    return result.count;
  }

  public getPlayer(gameId: string, userId: string): PlayerInfo | null {
    return db
      .query(
        `
          SELECT *
          FROM players
          WHERE game_id = ?
            AND user_id = ?
          LIMIT 1
        `,
      )
      .get(gameId, userId) as PlayerInfo | null;
  }

  public getListOfPlayersWithGameId(gameId: string): PlayerInfo[] {
    return db
      .query(
        `
          SELECT *
          FROM players
          WHERE game_id = ?
        `,
      )
      .all(gameId) as PlayerInfo[];
  }

  public getPlayerIds(gameId: string): string[] {
    const rows = db
      .query(
        `
        SELECT user_id
        FROM players
        WHERE game_id = ?
      `,
      )
      .all(gameId) as {
      user_id: string;
    }[];

    return rows.map((row) => row.user_id);
  }

  public getChannelId(gameId: string): string | undefined {
    let channel_id = db
      .query(
        `
        SELECT channel_id
        FROM games
        WHERE id = ?
        LIMIT 1
      `,
      )
      .get(gameId) as {
      channel_id: string;
    };

    return channel_id?.channel_id;
  }

  public async startLobbyPhase(gameId: string, hostId: string) {
    const game = this.getGame(gameId);

    if (!game) {
      throw new GameNotFoundError();
    }

    this.updateStatus(gameId, "LOBBY");

    console.log(`[GAME ${gameId}] LOBBY started`);

    // runtime init
    // lobby timer
    // send lobby embed
  }

  public getCurrentPhase(gameId: string): GameStatus | null {
    const game = this.getGame(gameId);

    return game?.status ?? null;
  }

  private readonly discussionRefreshLocks = new Set<string>();

  public isDiscussionRefreshing(gameId: string) {
    return this.discussionRefreshLocks.has(gameId);
  }

  public lockDiscussion(gameId: string) {
    this.discussionRefreshLocks.add(gameId);
  }

  public unlockDiscussion(gameId: string) {
    this.discussionRefreshLocks.delete(gameId);
  }
}

export const gameService = new GameService();
