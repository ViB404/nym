import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { EMOJIS } from "../constants/EMOJIS";

export function buildLobbyButtons(gameId: string) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`nym:join:${gameId}`)
        .setLabel("Join")
        .setEmoji(EMOJIS.JOIN)
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`nym:start:${gameId}`)
        .setLabel("Force Start")
        .setEmoji(EMOJIS.AUTO_START)
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`nym:stop:${gameId}`)
        .setLabel("Stop")
        .setEmoji(EMOJIS.STOP)
        .setStyle(ButtonStyle.Danger),
    ),
  ];
}
