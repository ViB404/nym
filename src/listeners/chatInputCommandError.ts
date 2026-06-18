import {
  Events,
  Listener,
  type ChatInputCommandErrorPayload,
} from "@sapphire/framework";
import { Message, MessageFlags } from "discord.js";

export class ChatInputCommandErrorListener extends Listener<
  typeof Events.ChatInputCommandError
> {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: Events.ChatInputCommandError,
    });

    this.container.logger.info("ChatInputCommandError listener loaded");
  }

  public async run(
    error: Error,
    { interaction }: ChatInputCommandErrorPayload,
  ) {
    this.container.logger.error(error);

    const message =
      process.env.NODE_ENV === "development"
        ? `❌ ${error.message}`
        : "❌ Something went wrong.";

    if (interaction.deferred || interaction.replied) {
      await interaction
        .followUp({
          content: message,
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => null);

      return;
    }

    await interaction
      .reply({
        content: message,
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => null);
  }
}
