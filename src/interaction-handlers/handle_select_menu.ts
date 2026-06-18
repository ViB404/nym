import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, type StringSelectMenuInteraction } from "discord.js";

import { parseVoteCustomId } from "../utils/parseCustomId";
import { gameService } from "../services/game.service";
import { buildGuessMessage } from "../builder/buildGuessMessage";
import { aliasService } from "../services/alias.service";

export class VoteSelectHandler extends InteractionHandler {
  public constructor(
    context: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(context, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.SelectMenu,
    });
  }

  public override parse(interaction: StringSelectMenuInteraction) {
    if (!interaction.customId.startsWith("nym:vote:")) {
      return this.none();
    }

    return this.some();
  }

  public override async run(interaction: StringSelectMenuInteraction) {
    const parsed = parseVoteCustomId(interaction.customId);

    if (!parsed) {
      return interaction.reply({
        content: "❌ Invalid vote interaction.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const game = gameService.getGame(parsed.gameId);

    if (!game) {
      return interaction.reply({
        content: "❌ Game not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const aliasName = interaction.values[0];

    if (!aliasName) {
      return interaction.reply({
        content: "❌ No alias selected.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const aliasOwnerId = aliasService.getUserIdByAlias(
      parsed.roundId,
      aliasName,
    );

    if (!aliasOwnerId) {
      return interaction.reply({
        content: "❌ Alias not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (aliasOwnerId === interaction.user.id) {
      return interaction.reply({
        content: "❌ You cannot vote for your own alias.",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      const playerIds = gameService
        .getPlayerIds(parsed.gameId)
        .filter((id) => id !== interaction.user.id);

      const players = await Promise.all(
        playerIds.map(async (id) => {
          try {
            const member = await interaction.guild?.members.fetch(id);

            return {
              userId: id,
              username:
                member?.displayName ?? member?.user.username ?? "Unknown",
            };
          } catch {
            return {
              userId: id,
              username: "Unknown",
            };
          }
        }),
      );

      return interaction.reply({
        ...buildGuessMessage(parsed.gameId, parsed.roundId, aliasName, players),
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("[VoteSelectHandler]", error);

      return interaction.reply({
        content:
          error instanceof Error
            ? error.message
            : "❌ Failed to open guess menu.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
