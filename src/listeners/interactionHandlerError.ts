import { Events, Listener } from "@sapphire/framework";

export class InteractionHandlerErrorListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: Events.InteractionHandlerError,
    });
  }

  public run(error: Error) {
    console.error(error);
  }
}
