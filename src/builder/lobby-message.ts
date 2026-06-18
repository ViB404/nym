import { EmbedBuilder } from "discord.js";
import type { LobbyEmbedOptions } from "../types/lobby";
import ms from "ms";
import { EMOJIS } from "../constants/EMOJIS";

export function buildLobbyEmbed(options: LobbyEmbedOptions) {
  return new EmbedBuilder()
    .setTitle(`${EMOJIS.NYM} Nym Lobby`)
    .setDescription(
      ["Click **Join** to participate.", "", `Host: <@${options.hostId}>`].join(
        "\n",
      ),
    )
    .setColor("Blurple")
    .addFields(
      {
        name: `${EMOJIS.MEMBER} Players`,
        value: `${options.currentPlayers}/${options.maxPlayers}`,
        inline: true,
      },
      {
        name: `${EMOJIS.ROUND} Rounds`,
        value: `${options.rounds}`,
        inline: true,
      },
      {
        name: `${EMOJIS.STATUS} Status`,
        value: "Waiting",
        inline: true,
      },
      {
        name: `${EMOJIS.CHAT} Discussion`,
        value: ms(options.discussion_duration),
        inline: true,
      },
      {
        name: `${EMOJIS.VOTE} Voting`,
        value: ms(options.voting_duration),
        inline: true,
      },
      {
        name: `${EMOJIS.TIMER} Auto Start`,
        value: "60s",
        inline: true,
      },
    )
    .setTimestamp();
}
