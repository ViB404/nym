import { EmbedBuilder } from "discord.js";
import type { DiscussionOptions } from "../types/discussion";
import ms from "ms";
import { EMOJIS } from "../constants/EMOJIS";

export function discussionMessage(options: DiscussionOptions) {
  return new EmbedBuilder()
    .setTitle(`Discussion has started!`)
    .setDescription("Click **Send Message** to Chat.")
    .setColor("DarkAqua")
    .addFields(
      {
        name: `${EMOJIS.MEMBER} Players`,
        value: `${options.currentPlayers}`,
        inline: true,
      },
      {
        name: `${EMOJIS.ROUND} Round`,
        value: `${options.round}`,
        inline: true,
      },
      {
        name: `${EMOJIS.STATUS} Status`,
        value: "Discussion",
        inline: true,
      },
      {
        name: `${EMOJIS.TIMER} Discussion`,
        value: ms(options.discussionDuration),
        inline: true,
      },
      {
        name: `${EMOJIS.VOTE} Voting`,
        value: ms(options.votingDuration),
        inline: true,
      },
      {
        name: `${EMOJIS.MEMBER} Joined Players`,
        value:
          options.joinedPlayers.length > 0
            ? options.joinedPlayers
                .map((id) => `${EMOJIS.ARROW} <@${id}>`)
                .join("\n")
            : "No players joined yet.",
      },
    )
    .setTimestamp();
}
