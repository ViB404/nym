import {
  Events,
  Listener,
  UserError,
  type ChatInputCommandDeniedPayload,
} from "@sapphire/framework";

export class ChatInputCommandDeniedListener extends Listener<
  typeof Events.ChatInputCommandDenied
> {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: Events.ChatInputCommandDenied,
    });

    this.container.logger.info("ChatInputCommandDenied listener loaded");
  }

  public async run(
    error: UserError,
    { interaction }: ChatInputCommandDeniedPayload,
  ) {
    await interaction
      .reply({
        content: error.message,
        ephemeral: true,
      })
      .catch(() => null);
  }
}
