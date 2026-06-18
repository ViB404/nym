import { EmbedBuilder } from "discord.js";
import { EMOJIS } from "../constants/EMOJIS";

export interface VoteDetail {
  voterId: string;
  aliasName: string;
  actualOwnerId: string;
  guessedUserId: string;
  correct: boolean;
}

export interface VoteBreakdownMessageOptions {
  round: number;
  votes: VoteDetail[];
}

export function buildVoteBreakdownMessage({
  round,
  votes,
}: VoteBreakdownMessageOptions) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${EMOJIS.NYM} Vote Breakdown • Round ${round}`)
    .setDescription(
      `Complete voting history for this round.\n\nTotal Votes: \`${votes.length}\``,
    )
    .setTimestamp();

  if (votes.length === 0) {
    embed.addFields({
      name: "No Votes",
      value: "Nobody voted this round.",
    });

    return {
      embeds: [embed],
    };
  }

  embed.addFields(
    ...votes.slice(0, 25).map((vote) => ({
      name: `${vote.correct ? "✅" : "❌"} <@${vote.voterId}>`,
      value: [
        `${EMOJIS.ARROW} Alias: **${vote.aliasName}**`,
        `${EMOJIS.ROUND} Guessed: <@${vote.guessedUserId}>`,
        `${EMOJIS.MEMBER} Actual: <@${vote.actualOwnerId}>`,
      ].join("\n"),
      inline: true,
    })),
  );

  embed.setFooter({
    text: `Round ${round} • Vote Audit`,
  });

  return {
    embeds: [embed],
  };
}
