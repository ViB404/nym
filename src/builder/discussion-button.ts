import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { EMOJIS } from "../constants/EMOJIS";

export function buildDiscussionButtons(gameId: string) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`nym:message:${gameId}`)
        .setLabel("Send Message")
        .setEmoji(EMOJIS.CHAT)
        .setStyle(ButtonStyle.Success),
    ),
  ];
}
