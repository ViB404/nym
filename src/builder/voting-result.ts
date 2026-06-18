import { ButtonStyle, EmbedBuilder } from "discord.js";
import type { RevealResultsData } from "../services/vote.service";
import { EMOJIS } from "../constants/EMOJIS";
import { ButtonBuilder } from "discord.js";
import { ActionRowBuilder } from "discord.js";

export interface VotingResultsMessageOptions extends RevealResultsData {
  round: number;
}

export function buildVotingResultsMessage({
  round,
  totalVotes,
  correctVotes,
  incorrectVotes,
  accuracy,
  leaderboard = [],
  results,
}: VotingResultsMessageOptions) {
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`${EMOJIS.NYM} Round ${round} Results`)
    .setDescription(
      [
        `${EMOJIS.VOTE} **Votes:** \`${totalVotes}\``,
        `${EMOJIS.CHECK} **Correct:** \`${correctVotes}\``,
        `${EMOJIS.STOP} **Incorrect:** \`${incorrectVotes}\``,
        `${EMOJIS.ARROW} **Accuracy:** \`${accuracy}%\``,
      ].join("\n"),
    )
    .setTimestamp();

  if (leaderboard.length > 0) {
    embed.addFields({
      name: "🏆 Leaderboard",
      value: leaderboard
        .slice(0, 5)
        .map((player, index) => {
          const medal =
            index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🔹";

          return `${medal} <@${player.user_id}> • \`${player.score}\``;
        })
        .join("\n"),
      inline: false,
    });
  }

  const sortedResults = [...results].sort(
    (a, b) => b.votesReceived - a.votesReceived,
  );

  embed.addFields(
    ...sortedResults.map((result) => ({
      name: `${EMOJIS.NYM} ${result.alias}`,
      value: [
        `${EMOJIS.MEMBER} <@${result.ownerId}>`,
        `${EMOJIS.VOTE} \`${result.votesReceived}\` votes`,
        `${EMOJIS.ROUND} \`${result.accuracy}%\``,
      ].join("\n"),
      inline: true,
    })),
  );

  return {
    embeds: [embed],
  };
}
