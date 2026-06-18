import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { EMOJIS } from "../constants/EMOJIS";

export interface VoteMessageOptions {
  gameId: string;
  roundId: string;

  aliases: {
    userId: string;
    alias: string;
  }[];

  players: {
    userId: string;
    username: string;
  }[];
}

export function buildVoteMessage({
  gameId,
  roundId,
  aliases,
  players,
}: VoteMessageOptions) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${EMOJIS.VOTE} Voting Phase`)
    .setDescription(
      [
        "Vote for the alias you believe belongs to a specific player.",
        "",
        "### Round Information",
        `• Round: \`${roundId}\``,
        `• Active Aliases: \`${aliases.length}\``,
        `• Players: \`${players.length}\``,
      ].join("\n"),
    )
    .addFields({
      name: `${EMOJIS.NYM} Current Aliases`,
      value:
        aliases.length > 0
          ? aliases
              .map((alias, index) => `\`${index + 1}.\` **${alias.alias}**`)
              .join("\n")
          : "*No aliases available*",
    })
    .setTimestamp();

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`nym:vote:${gameId}:${roundId}`)
    .setPlaceholder("Select an alias")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      aliases.map((alias) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(alias.alias)
          .setValue(alias.alias)
          .setDescription(`Vote for ${alias.alias}`),
      ),
    );

  const selectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  return {
    embeds: [embed],
    components: [selectRow],
  };
}
