import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

export function buildGuessMessage(
  gameId: string,
  roundId: string,
  aliasName: string,
  players: {
    userId: string;
    username: string;
  }[],
) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(
      `nym:guess:${gameId}:${roundId}:${encodeURIComponent(aliasName)}`,
    )
    .setPlaceholder(`Who is "${aliasName}"?`)
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      players
        .slice(0, 25)
        .map((player) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(player.username)
            .setValue(player.userId),
        ),
    );

  return {
    content: `🤔 Who do you think is behind **${aliasName}**?`,
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
    ],
  };
}
