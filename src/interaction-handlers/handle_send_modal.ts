import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import {
  ChannelType,
  MessageFlags,
  type ModalSubmitInteraction,
} from "discord.js";

import { parseMessageCustomId } from "../utils/parseCustomId";
import { aliasService } from "../services/alias.service";
import { messageService } from "../services/message.service";
import { gameService } from "../services/game.service";
import { round_service } from "../services/round.service";
import { betweenDiscussionMessage } from "../builder/between-discussion-message";
import { buildDiscussionButtons } from "../builder/discussion-button";
import { MessageType } from "../types/type";

export class MessageModalHandler extends InteractionHandler {
  public constructor(
    context: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(context, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
    });
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (!interaction.customId.startsWith("nym:message:")) {
      return this.none();
    }

    return this.some();
  }

  public override async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    try {
      let channelId = interaction.channelId;

      if (!channelId) {
        return interaction.editReply({
          content: "❌ Channel not found.",
        });
      }

      if (interaction.channel?.type !== ChannelType.GuildText) {
        return interaction.editReply({
          content: "❌ This command can only be used in a server text channel.",
        });
      }

      const parsed = parseMessageCustomId(interaction.customId);

      if (!parsed) {
        return interaction.editReply({
          content: "❌ Invalid message data.",
        });
      }

      const game = gameService.getGame(parsed.gameId);

      if (!game) {
        return interaction.editReply({
          content: "❌ Game not found.",
        });
      }

      if (game.status !== "DISCUSSION") {
        return interaction.editReply({
          content: "❌ Messages can only be sent during the discussion phase.",
        });
      }

      const currentRoundId = round_service.getCurrentRoundId(parsed.gameId);

      if (!currentRoundId || currentRoundId !== parsed.roundId) {
        return interaction.editReply({
          content: "❌ This discussion round has already ended.",
        });
      }

      const content = interaction.fields.getTextInputValue("message").trim();

      if (!content.length) {
        return interaction.editReply({
          content: "❌ Message cannot be empty.",
        });
      }

      const alias = aliasService.getAliasForRound(
        parsed.roundId,
        interaction.user.id,
      );

      if (!alias) {
        return interaction.editReply({
          content: "❌ You do not have an active alias for this round.",
        });
      }

      await messageService.sendAnonymousMessage(
        channelId,
        content,
        alias.alias_name,
        alias.avatar_url,
      );

      await interaction.deleteReply();

      const discussionMessageInfo = messageService.getMessage(
        parsed.gameId,
        MessageType.Discussion,
      );

      if (!discussionMessageInfo) {
        return interaction.editReply({
          content: "❌ Discussion panel not found.",
        });
      }

      gameService.lockDiscussion(parsed.gameId);

      try {
        const newMessage = await interaction.channel.send({
          embeds: [betweenDiscussionMessage()],
          components: buildDiscussionButtons(parsed.gameId),
        });

        messageService.setMessage(
          parsed.gameId,
          MessageType.Discussion,
          newMessage.id,
          newMessage.channelId,
        );

        try {
          await messageService.deleteMessage(
            discussionMessageInfo.channelId,
            discussionMessageInfo.messageId,
          );
        } catch {
          console.warn("[DISCUSSION REFRESH] Old panel already removed.");
        }
      } catch (error) {
        console.error("[DISCUSSION REFRESH]", error);
      } finally {
        gameService.unlockDiscussion(parsed.gameId);
      }
    } catch (error) {
      console.error("[MessageModalHandler]", error);

      return interaction.editReply({
        content: "❌ Failed to send anonymous message.",
      });
    }
  }
}
