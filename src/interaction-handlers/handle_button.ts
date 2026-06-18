import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonStyle, MessageFlags, type ButtonInteraction } from "discord.js";
import { parseCustomId } from "../utils/parseCustomId";
import { gameService } from "../services/game.service";
import {
  AlreadyJoinedError,
  GameNotFoundError,
  LobbyClosedError,
  PlayerLimitReachedError,
} from "../errors/game-error";
import { ActionRowBuilder } from "discord.js";
import { ButtonBuilder } from "discord.js";
import { discussionMessage } from "../builder/discussion-message";
import { buildDiscussionButtons } from "../builder/discussion-button";
import { buildSendMessageModal } from "../builder/send-message-modal";
import { messageService } from "../services/message.service";
import { round_service } from "../services/round.service";
import { PLAYER_LIMIT } from "../config";
import { EMOJIS } from "../constants/EMOJIS";
import { MessageType } from "../types/type";
import { voteService } from "../services/vote.service";
import { buildVoteBreakdownMessage } from "../builder/vote-breakdown";
import { ActiveGames } from "../utils/runtime";

export class LobbyButtonsHandler extends InteractionHandler {
  public constructor(
    context: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(context, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith("nym:")) {
      return this.none();
    }

    return this.some();
  }

  public override async run(interaction: ButtonInteraction) {
    const parsed = parseCustomId(interaction.customId);

    if (!parsed) {
      return;
    }

    const { namespace, action, gameId } = parsed;

    switch (action) {
      case "join":
        return this.handleJoin(interaction, gameId);

      case "start":
        return this.handleStart(interaction, gameId);

      case "stop":
        return this.handleStop(interaction, gameId);

      case "leave":
        return this.handleLeave(interaction, gameId);

      case "message":
        return this.handleMessage(interaction, gameId);

      case "vote_info":
        return this.handleVoteInfo(interaction, gameId);
    }
  }

  private async handleStop(interaction: ButtonInteraction, gameId: string) {
    try {
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      let hostID = gameService.getGame(gameId)?.host_id;

      if (hostID !== interaction.user.id) {
        return interaction.editReply({
          content: `${EMOJIS.WARNING} Only Host can stop the game.`,
        });
      }

      gameService.destroy(gameId);

      return interaction.editReply({
        content: `${EMOJIS.CHECK} Game stopped.`,
      });
    } catch (error) {
      console.error(error);

      return interaction.editReply({
        content: `${EMOJIS.STOP} Something unexpected went wrong.`,
      });
    }
  }

  private async handleJoin(interaction: ButtonInteraction, gameId: string) {
    try {
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      const result = gameService.joinGame({
        game_id: gameId,
        user_id: interaction.user.id,

        players_limit: 15,

        is_host: false,
        is_afk: false,
        score: 0,
        message_sent: 0,
      });

      const lobbyMessage = messageService.getMessage(gameId, MessageType.Lobby);

      if (!lobbyMessage) {
        return interaction.editReply({
          content: `${EMOJIS.STOP} Lobby message not found.`,
        });
      }

      await messageService.updateLobbyPlayerCount(
        lobbyMessage.channelId,
        lobbyMessage.messageId,
        result.playerCount,
        PLAYER_LIMIT,
      );

      return interaction.editReply({
        content: `${EMOJIS.CHECK} Joined successfully. (${result.playerCount}/15)`,
      });
    } catch (error) {
      if (error instanceof AlreadyJoinedError) {
        const leaveButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`nym:leave:${gameId}`)
            .setLabel("Leave Game")
            .setEmoji("🚪")
            .setStyle(ButtonStyle.Danger),
        );

        return interaction.editReply({
          content: `${EMOJIS.WARNING} You have already joined this game.`,
          components: [leaveButton],
        });
      }

      if (error instanceof PlayerLimitReachedError) {
        return interaction.editReply({
          content: `${EMOJIS.STOP} This lobby is already full.`,
        });
      }

      if (error instanceof LobbyClosedError) {
        return interaction.editReply({
          content: `${EMOJIS.STOP} The lobby has already closed.`,
        });
      }

      if (error instanceof GameNotFoundError) {
        return interaction.editReply({
          content: `${EMOJIS.STOP} Game not found.`,
        });
      }

      console.error(error);

      return interaction.editReply({
        content: `${EMOJIS.STOP} Something unexpected went wrong.`,
      });
    }
  }

  private async handleLeave(interaction: ButtonInteraction, gameId: string) {
    try {
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      gameService.leaveGame({
        game_id: gameId,
        user_id: interaction.user.id,
      });

      return interaction.editReply({
        content: `${EMOJIS.CHECK} You have left the game.`,
      });
    } catch (error) {
      console.error(error);

      return interaction.editReply({
        content: `${EMOJIS.STOP} Something unexpected went wrong.`,
      });
    }
  }

  private async handleStart(interaction: ButtonInteraction, gameId: string) {
    try {
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });
      await gameService.startGame({ game_id: gameId });

      let game = gameService.getGame(gameId);
      if (!game) {
        return interaction.editReply({
          content: `${EMOJIS.STOP} Game not found.`,
        });
      }

      let host_id = game.host_id;
      let player_id = interaction.user.id;

      if (host_id !== player_id) {
        return interaction.editReply({
          content: `${EMOJIS.STOP} You are not the host of this game.`,
        });
      }

      let DiscussionOption = {
        currentPlayers: gameService.playerCount(gameId),
        round: 1,
        discussionDuration: game.discussion_duration,
        votingDuration: game.voting_duration,
        joinedPlayers: gameService.getPlayerIds(gameId),
      };

      await interaction.editReply({
        content: `${EMOJIS.CHECK} Game started!`,
      });

      const lobbyMessage = messageService.getMessage(gameId, MessageType.Lobby);
      if (lobbyMessage) {
        await messageService.deleteMessage(
          lobbyMessage.channelId,
          lobbyMessage.messageId,
        );
      }

      let discussionMessageInfo = await interaction.followUp({
        embeds: [discussionMessage(DiscussionOption)],
        components: buildDiscussionButtons(gameId),
      });

      messageService.setMessage(
        gameId,
        MessageType.Discussion,
        discussionMessageInfo.id,
        interaction.channelId,
      );

      await interaction.deleteReply();
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        return interaction.editReply({
          content: `${EMOJIS.STOP} ${error.message}`,
        });
      }

      return interaction.editReply({
        content: `${EMOJIS.STOP} Something unexpected went wrong.`,
      });
    }
  }

  // Under progress
  private async handleMessage(interaction: ButtonInteraction, game_id: string) {
    const gameInfo = gameService.getGame(game_id);
    if (!gameInfo) {
      interaction.editReply({
        content: `${EMOJIS.STOP} **Game not found!**`,
      });
      return;
    }

    const playerInfo = gameService.getPlayer(game_id, interaction.user.id);
    if (!playerInfo) {
      interaction.editReply({
        content: `${EMOJIS.STOP} This is not your game!`,
      });
      return;
    }

    let round_id = round_service.getCurrentRoundId(game_id);
    await interaction.showModal(buildSendMessageModal(game_id, round_id));
  }

  private async handleVoteInfo(interaction: ButtonInteraction, gameId: string) {
    const gameInfo = voteService.getVoteBreakdown(gameId);

    if (!gameInfo) {
      return interaction.editReply({
        content: `${EMOJIS.STOP} **No vote breakdown available!**`,
        embeds: [],
        components: [],
      });
    }

    const round = ActiveGames.get(gameId)?.timer.round ?? 1;

    return interaction.followUp({
      ...buildVoteBreakdownMessage({
        round,
        votes: gameInfo.votes,
      }),
    });
  }
}
