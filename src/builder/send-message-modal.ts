import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

export function buildSendMessageModal(gameId: string, roundId: string) {
  const messageInput = new TextInputBuilder()
    .setCustomId(`message`)
    .setLabel("Anonymous Message")
    .setPlaceholder("Type your anonymous message...")
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(500)
    .setStyle(TextInputStyle.Paragraph);

  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
    messageInput,
  );

  return new ModalBuilder()
    .setCustomId(`nym:message:${gameId}:${roundId}`)
    .setTitle("Send Anonymous Message")
    .addComponents(row);
}
