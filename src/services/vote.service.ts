import { gameService } from "./game.service";
import { ActiveGames } from "../utils/runtime";
import { round_service } from "./round.service";
import { aliasService } from "./alias.service";
import { db } from "../database/db";
import { buildVoteMessage } from "../builder/voting-message";
import { messageService } from "./message.service";
import { buildVotingResultsMessage } from "../builder/voting-result";
import { MessageType } from "../types/type";

export interface VoteDetail {
  voterId: string;
  aliasName: string;
  actualOwnerId: string;
  guessedUserId: string;
  correct: boolean;
}

export interface VoteBreakdown {
  totalVotes: number;
  correctVotes: number;
  incorrectVotes: number;
  votes: VoteDetail[];
}

export interface RevealResult {
  alias: string;
  ownerId: string;
  votesReceived: number;
  correctGuessers: string[];
  incorrectGuessers: string[];
  accuracy: number;
}

export interface RevealLeaderboardEntry {
  user_id: string;
  score: number;
}

export interface RevealResultsData {
  totalVotes: number;
  correctVotes: number;
  incorrectVotes: number;
  accuracy: number;
  hardestAlias: RevealResult | null;
  leaderboard: RevealLeaderboardEntry[];
  results: RevealResult[];
}

class VoteService {
  public async startVotingPhase(gameId: string) {
    console.log(`[GAME ${gameId}] VOTING phase started`);

    gameService.updateStatus(gameId, "VOTING");

    const runtime = ActiveGames.get(gameId);

    if (!runtime) {
      return;
    }

    console.log(`[GAME ${gameId}] Round ${runtime.timer.round}`);

    const channelId = gameService.getChannelId(gameId);

    if (!channelId) {
      return;
    }

    const roundId = round_service.getCurrentRoundId(gameId);

    if (!roundId) {
      console.error(`[GAME ${gameId}] No round found`);

      return;
    }

    const aliases = aliasService.getAliasesForRound(roundId).map((alias) => ({
      userId: alias.user_id,
      alias: alias.alias_name,
    }));

    const players = gameService.getPlayerIds(gameId).map((id) => ({
      userId: id,
      username: id,
    }));

    if (aliases.length === 0) {
      console.error(`[GAME ${gameId}] No aliases found`);

      return;
    }

    const votingMessage = buildVoteMessage({
      gameId,
      roundId,
      aliases,
      players,
    });

    const messageInfo = await messageService.sendMessage(
      channelId,
      votingMessage,
    );

    const discussionMessageInfo = messageService.getMessage(
      gameId,
      MessageType.Discussion,
    );

    if (messageInfo) {
      messageService.setMessage(gameId, "voting", messageInfo.id, channelId);
    }

    if (discussionMessageInfo) {
      await messageService.deleteMessage(
        discussionMessageInfo.channelId,
        discussionMessageInfo.messageId,
      );
    }
  }

  public async submitVote({
    roundId,
    voterId,
    aliasName,
    guessedUserId,
  }: {
    roundId: string;
    voterId: string;
    aliasName: string;
    guessedUserId: string;
  }) {
    db.query(
      `
      INSERT OR REPLACE INTO votes (
        round_id,
        voter_id,
        alias_name,
        guessed_user_id,
        created_at
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    ).run(roundId, voterId, aliasName, guessedUserId, Date.now());
  }

  public async revealResults(
    gameId: string,
  ): Promise<RevealResultsData | null> {
    const roundId = round_service.getCurrentRoundId(gameId);

    if (!roundId) {
      return null;
    }

    const votes = db
      .query(
        `
        SELECT
          voter_id,
          alias_name,
          guessed_user_id
        FROM votes
        WHERE round_id = ?
      `,
      )
      .all(roundId) as {
      voter_id: string;
      alias_name: string;
      guessed_user_id: string;
    }[];

    const aliases = db
      .query(
        `
        SELECT
          alias_name,
          user_id
        FROM aliases
        WHERE round_id = ?
      `,
      )
      .all(roundId) as {
      alias_name: string;
      user_id: string;
    }[];

    const resultsMap = new Map<string, RevealResult>();

    for (const alias of aliases) {
      resultsMap.set(alias.alias_name, {
        alias: alias.alias_name,
        ownerId: alias.user_id,

        votesReceived: 0,

        correctGuessers: [],
        incorrectGuessers: [],

        accuracy: 0,
      });
    }

    let correctVotes = 0;

    for (const vote of votes) {
      const result = resultsMap.get(vote.alias_name);

      if (!result) {
        continue;
      }

      result.votesReceived++;

      const correct = result.ownerId === vote.guessed_user_id;

      if (correct) {
        correctVotes++;

        result.correctGuessers.push(vote.voter_id);

        db.query(
          `
          UPDATE players
          SET score = score + 1
          WHERE game_id = ?
            AND user_id = ?
        `,
        ).run(gameId, vote.voter_id);
      } else {
        result.incorrectGuessers.push(vote.voter_id);
      }
    }

    const results: RevealResult[] = Array.from(resultsMap.values()).map(
      (result) => ({
        ...result,

        accuracy:
          result.votesReceived === 0
            ? 0
            : Math.round(
                (result.correctGuessers.length / result.votesReceived) * 100,
              ),
      }),
    );

    const accuracy =
      votes.length === 0 ? 0 : Math.round((correctVotes / votes.length) * 100);

    const leaderboard = db
      .query(
        `
        SELECT
          user_id,
          score
        FROM players
        WHERE game_id = ?
        ORDER BY score DESC
        LIMIT 5
      `,
      )
      .all(gameId) as RevealLeaderboardEntry[];

    const hardestAlias =
      results.length === 0
        ? null
        : results.reduce((hardest, current) =>
            current.correctGuessers.length < hardest.correctGuessers.length
              ? current
              : hardest,
          );

    console.log(
      `[GAME ${gameId}] ${correctVotes}/${votes.length} correct (${accuracy}%)`,
    );

    return {
      totalVotes: votes.length,
      correctVotes,
      incorrectVotes: votes.length - correctVotes,
      accuracy,
      hardestAlias,
      leaderboard,
      results,
    };
  }

  public getVoteBreakdown(gameId: string): VoteBreakdown | null {
    const roundId = round_service.getCurrentRoundId(gameId);

    if (!roundId) {
      return null;
    }

    const votes = db
      .query(
        `
        SELECT
          voter_id,
          alias_name,
          guessed_user_id
        FROM votes
        WHERE round_id = ?
      `,
      )
      .all(roundId) as {
      voter_id: string;
      alias_name: string;
      guessed_user_id: string;
    }[];

    const aliases = db
      .query(
        `
        SELECT
          alias_name,
          user_id
        FROM aliases
        WHERE round_id = ?
      `,
      )
      .all(roundId) as {
      alias_name: string;
      user_id: string;
    }[];

    const aliasMap = new Map(
      aliases.map((alias) => [alias.alias_name, alias.user_id]),
    );

    let correctVotes = 0;

    const results: VoteDetail[] = [];

    for (const vote of votes) {
      const actualOwnerId = aliasMap.get(vote.alias_name);

      if (!actualOwnerId) {
        continue;
      }

      const correct = actualOwnerId === vote.guessed_user_id;

      if (correct) {
        correctVotes++;
      }

      results.push({
        voterId: vote.voter_id,

        aliasName: vote.alias_name,

        actualOwnerId,
        guessedUserId: vote.guessed_user_id,

        correct,
      });
    }

    return {
      totalVotes: results.length,

      correctVotes,

      incorrectVotes: results.length - correctVotes,

      votes: results,
    };
  }

  public async startRevealPhase(gameId: string) {
    console.log(`[GAME ${gameId}] REVEAL phase started`);

    gameService.updateStatus(gameId, "REVEAL");

    const revealData = await this.revealResults(gameId);

    if (!revealData) {
      return;
    }

    const channelId = gameService.getChannelId(gameId);

    if (channelId) {
      await messageService.sendMessage(
        channelId,
        buildVotingResultsMessage({
          round: ActiveGames.get(gameId)?.timer.round ?? 1,
          totalVotes: revealData.totalVotes,
          correctVotes: revealData.correctVotes,
          incorrectVotes: revealData.incorrectVotes,
          accuracy: revealData.accuracy,
          hardestAlias: revealData.hardestAlias,
          leaderboard: revealData.leaderboard,
          results: revealData.results,
        }),
      );
    }

    let votingMessageInfo = messageService.getMessage(gameId, MessageType.Vote);
    if (votingMessageInfo) {
      await messageService.deleteMessage(
        votingMessageInfo.channelId,
        votingMessageInfo.messageId,
      );
    }

    const runtime = ActiveGames.get(gameId);

    if (!runtime) {
      return;
    }

    runtime.timer.round++;

    const nextRoundId = round_service.createRound(gameId, runtime.timer.round);

    const players = gameService.getListOfPlayersWithGameId(gameId);

    for (const player of players) {
      aliasService.generateAlias({
        round_id: nextRoundId,
        user_id: player.user_id,
      });
    }
  }
}

export const voteService = new VoteService();
