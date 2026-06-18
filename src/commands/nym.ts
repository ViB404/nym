import { Subcommand } from "@sapphire/plugin-subcommands";
import type { ApplicationCommandRegistry } from "@sapphire/framework";
import { DEV_GUILD_ID, IS_DEV, PLAYER_LIMIT } from "../config";
import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { CreateGameSchema } from "../validators/validator";
import { gameService } from "../services/game.service";
import ms, { type StringValue } from "ms";
import type { ChatInputCommandInteraction } from "discord.js";
import { buildLobbyEmbed } from "../builder/lobby-message";
import { buildLobbyButtons } from "../builder/lobby-button";
import { messageService } from "../services/message.service";
import { EMOJIS } from "../constants/EMOJIS";
export class NymCommand extends Subcommand {
  public constructor(
    context: Subcommand.LoaderContext,
    options: Subcommand.Options,
  ) {
    super(context, {
      ...options,
      name: "nym",
      subcommands: [
        { name: "start", chatInputRun: "startNym" },
        { name: "stop", chatInputRun: "stopNym" },
      ],
    });
  }
  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry,
  ) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName("nym")
          .setDescription("Anonymous Alias game")
          .addSubcommand((command) =>
            command
              .setName("start")
              .setDescription("Start a new game")
              .addStringOption((option) =>
                option
                  .setName("discussion_duration")
                  .setDescription("Discussion duration"),
              )
              .addStringOption((option) =>
                option
                  .setName("voting_duration")
                  .setDescription("Voting duration"),
              ),
          )
          .addSubcommand((command) =>
            command.setName("stop").setDescription("Stop the current game"),
          ),
      { guildIds: IS_DEV ? [DEV_GUILD_ID] : undefined },
    );
  }
  public async startNym(interaction: ChatInputCommandInteraction) {
    const result = CreateGameSchema.safeParse({
      players: interaction.options.getInteger("players") ?? 15,
      rounds: interaction.options.getInteger("rounds") ?? 3,
      discussion_duration:
        interaction.options.getString("discussion_duration") ?? "2m",
      voting_duration:
        interaction.options.getString("voting_duration") ?? "30s",
    });
    if (!result.success) {
      return interaction.reply({
        content: result.error.issues
          .map((issue) => `• ${issue.message}`)
          .join("\n"),
        flags: MessageFlags.Ephemeral,
      });
    }
    const { players, rounds, discussion_duration, voting_duration } =
      result.data;
    const discussionDurationMs = ms(discussion_duration as StringValue);
    const votingDurationMs = ms(voting_duration as StringValue);
    let gameId: string;
    try {
      const game = gameService.createGame({
        guild_id: interaction.guildId!,
        channel_id: interaction.channelId,
        host_id: interaction.user.id,
        rounds,
        discussion_duration: discussionDurationMs,
        voting_duration: votingDurationMs,
      });
      gameId = game.gameId;

      await gameService.startLobbyPhase(gameId, interaction.user.id);
    } catch (error) {
      return interaction.reply({
        content: "Failed to create game: " + String(error),
        flags: MessageFlags.Ephemeral,
      });
    }
    let reply = await interaction.reply({
      embeds: [
        buildLobbyEmbed({
          hostId: interaction.user.id,
          currentPlayers: 0,
          maxPlayers: PLAYER_LIMIT,
          rounds,
          discussion_duration: discussionDurationMs,
          voting_duration: votingDurationMs,
          joinedPlayers: [],
        }),
      ],
      components: buildLobbyButtons(gameId),
    });

    const msg = await interaction.fetchReply();

    messageService.setMessage(gameId, "lobby", msg.id, interaction.channelId);
  }

  public async stopNym(interaction: ChatInputCommandInteraction) {
    const game = gameService.getGameByChannel(interaction.channelId);
    if (!game) {
      return interaction.reply({
        content: "No active game found in this channel.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: `${EMOJIS.CHECK} Game Forcefully Stopped by **${interaction.user.username}**`,
      });
    }

    if (game.host_id !== interaction.user.id) {
      return interaction.reply({
        content: "Only the game host can stop this game.",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await gameService.endGame({ game_id: game.id });
      await interaction.reply({
        content: "🛑 Game stopped successfully.",
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      await interaction.reply({
        content: "Failed to stop game: " + String(error),
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
