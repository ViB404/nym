import { EmbedBuilder } from "discord.js";

export function betweenDiscussionMessage() {
  return new EmbedBuilder()
    .setTitle(`Discussion is going on!`)
    .setDescription("Click **Send Message** to Chat.")
    .setTimestamp();
}
