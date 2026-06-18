import { type Interaction, ChannelType, type Webhook } from "discord.js";
import { db } from "../database/db";

class WebhookService {
  public async createWebhook(interaction: Interaction) {
    let CreatedWebhook: Webhook | null = null;
    const channel = interaction.channel;

    if (!channel || channel.type !== ChannelType.GuildText) {
      return null;
    }
    let existingWebhook = await this.getWebhook(channel.id);

    if (existingWebhook) {
      return existingWebhook;
    }

    CreatedWebhook = await channel.createWebhook({
      name: "Nym",
    });

    if (CreatedWebhook) {
      this.saveWebhook(CreatedWebhook);
    }

    return CreatedWebhook;
  }

  public async getWebhook(channelId: string) {
    const result = await db
      .query(`SELECT * FROM webhooks WHERE channel_id = ?`)
      .get(channelId);
    return result;
  }

  private saveWebhook(webhook: Webhook) {
    db.query(
      `INSERT INTO webhooks (channel_id, webhook_id, webhook_token) VALUES (?, ?, ?)`,
    ).run(webhook.channelId, webhook.id, webhook.token);
  }
}

export default WebhookService;
