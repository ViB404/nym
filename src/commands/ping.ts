import { isMessageInstance } from "@sapphire/discord.js-utilities";
import { Command } from "@sapphire/framework";
import { EmbedBuilder, MessageFlags } from "discord.js";
import { DEV_GUILD_ID } from "../config";
import { EMOJIS } from "../constants/EMOJIS";

export class PingCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName("ping")
          .setDescription("Ping bot to see if it is alive"),
      {
        ...(process.env.PROD ? { guildIds: [DEV_GUILD_ID] } : ""),
      },
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const callbackResponse = await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription(`${EMOJIS.AUTO_START} Pinging...`)
          .setColor("Yellow"),
      ],
      withResponse: true,
      flags: MessageFlags.Ephemeral,
    });

    const msg = callbackResponse.resource?.message;

    if (msg && isMessageInstance(msg)) {
      const diff = msg.createdTimestamp - interaction.createdTimestamp;

      const ping = Math.round(this.container.client.ws.ping);

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.ARROW} Pong`)
        .addFields(
          {
            name: "Round Trip",
            value: `\`${diff}ms\``,
            inline: true,
          },
          {
            name: "Heartbeat",
            value: `\`${ping}ms\``,
            inline: true,
          },
        )
        .setColor(ping < 100 ? "Green" : ping < 200 ? "Yellow" : "Red")
        .setTimestamp();

      return interaction.editReply({
        embeds: [embed],
      });
    }

    const failedEmbed = new EmbedBuilder()
      .setTitle(`${EMOJIS.STOP} Failed`)
      .setDescription("Failed to retrieve ping.")
      .setColor("Red");

    return interaction.editReply({
      embeds: [failedEmbed],
    });
  }
}
