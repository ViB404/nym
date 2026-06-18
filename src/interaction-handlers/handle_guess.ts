import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, type StringSelectMenuInteraction } from "discord.js";

import { voteService } from "../services/vote.service";
import { EMOJIS } from "../constants/EMOJIS";

export class GuessSelectHandler extends InteractionHandler {
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
    if (!interaction.customId.startsWith("nym:guess:")) {
      return this.none();
    }

    return this.some();
  }

  public override async run(interaction: StringSelectMenuInteraction) {
    const parts = interaction.customId.split(":");

    if (parts.length < 5) {
      return interaction.update({
        content: `${EMOJIS.STOP} Invalid guess interaction.`,
        components: [],
      });
    }

    const gameId = parts[2];
    const roundId = parts[3];

    if (!roundId) {
      return interaction.update({
        content: `${EMOJIS.STOP} Invalid guess interaction.`,
        components: [],
      });
    }

    const aliasName = decodeURIComponent(parts[4] ?? "");

    const guessedUserId = interaction.values[0];

    if (!guessedUserId) {
      return interaction.update({
        content: `${EMOJIS.STOP} No player selected.`,
        components: [],
      });
    }

    await voteService.submitVote({
      roundId,
      voterId: interaction.user.id,
      aliasName,
      guessedUserId,
    });

    return interaction.update({
      content: `${EMOJIS.CHECK} Vote submitted for **${aliasName}**.`,
      components: [],
    });
  }
}
