import {
  WebhookClient,
  TextChannel,
  type MessageCreateOptions,
  type MessageEditOptions,
} from "discord.js";
import { container } from "@sapphire/framework";
import { db } from "../database/db";
import { EmbedBuilder } from "discord.js";
import type { MessageType } from "../types/type";
import { ActionRowBuilder } from "discord.js";

interface StoredMessage {
  messageId: string;
  channelId: string;
}

export class MessageService {
  private async getOrCreateWebhook(
    channel: TextChannel,
  ): Promise<WebhookClient | null> {
    const existing = db
      .query(
        `
        SELECT webhook_id, webhook_token
        FROM webhooks
        WHERE channel_id = ?
      `,
      )
      .get(channel.id) as
      | {
          webhook_id: string;
          webhook_token: string;
        }
      | undefined;

    if (existing) {
      return new WebhookClient({
        id: existing.webhook_id,
        token: existing.webhook_token,
      });
    }

    const webhook = await channel.createWebhook({
      name: "Nym",
    });

    db.query(
      `
      INSERT INTO webhooks (
        channel_id,
        webhook_id,
        webhook_token
      )
      VALUES (?, ?, ?)
    `,
    ).run(channel.id, webhook.id, webhook.token);

    return new WebhookClient({
      id: webhook.id,
      token: webhook.token!,
    });
  }

  public async sendAnonymousMessage(
    channelId: string,
    message: string,
    aliasName: string,
    avatarURL?: string,
  ) {
    const channel = await container.client.channels.fetch(channelId);

    if (!channel || !(channel instanceof TextChannel)) {
      return null;
    }

    const webhook = await this.getOrCreateWebhook(channel);

    if (!webhook) {
      return null;
    }

    try {
      return await webhook.send({
        username: aliasName,
        content: message,
        avatarURL,

        allowedMentions: {
          parse: [],
        },
      });
    } catch (error: any) {
      if (error.code === 10015) {
        db.query(
          `
          DELETE FROM webhooks
          WHERE channel_id = ?
        `,
        ).run(channelId);

        const recreated = await this.getOrCreateWebhook(channel);

        return recreated?.send({
          username: aliasName,
          content: message,
          avatarURL,
        });
      }

      throw error;
    }
  }

  public async sendMessage(channelId: string, payload: MessageCreateOptions) {
    const channel = await container.client.channels.fetch(channelId);

    if (!channel || !(channel instanceof TextChannel)) {
      return null;
    }

    return channel.send(payload);
  }

  public async sendEmbed(
    channelId: string,
    embeds: MessageCreateOptions["embeds"],
  ) {
    return this.sendMessage(channelId, { embeds });
  }

  public async sendText(channelId: string, content: string) {
    return this.sendMessage(channelId, { content });
  }

  public async updateLobbyPlayerCount(
    channelId: string,
    messageId: string,
    playerCount: number,
    maxPlayers: number,
  ) {
    const channel = await container.client.channels.fetch(channelId);

    if (!channel?.isTextBased()) {
      throw new Error(`Channel ${channelId} is not text based`);
    }

    const message = await channel.messages.fetch(messageId);

    const existingEmbed = message.embeds.at(0);

    if (!existingEmbed) {
      throw new Error(`Lobby message ${messageId} does not contain an embed`);
    }

    const embed = EmbedBuilder.from(existingEmbed);

    const fields = [...(embed.data.fields ?? [])];

    const playerFieldIndex = fields.findIndex((field) =>
      field.name.includes("Players"),
    );

    if (playerFieldIndex === -1) {
      throw new Error("Players field not found in lobby embed");
    }

    embed.spliceFields(playerFieldIndex, 1, {
      name: "👥 Players",
      value: `${playerCount}/${maxPlayers}`,
      inline: true,
    });

    return message.edit({
      embeds: [embed],
    });
  }

  public async editMessage(
    channelId: string,
    messageId: string,
    payload: MessageEditOptions,
  ) {
    const channel = await container.client.channels.fetch(channelId);

    if (!channel || !(channel instanceof TextChannel)) {
      return null;
    }

    const message = await channel.messages.fetch(messageId);

    return message.edit(payload);
  }

  public async deleteMessage(channelId: string, messageId: string) {
    const channel = await container.client.channels.fetch(channelId);

    if (!channel || !(channel instanceof TextChannel)) {
      return null;
    }

    const message = await channel.messages.fetch(messageId);

    return message.delete();
  }

  private messages: Record<string, Record<string, StoredMessage>> = {};
  public setMessage(
    gameId: string,
    key: string,
    messageId: string,
    channelId: string,
  ): void {
    if (!this.messages[gameId]) {
      this.messages[gameId] = {};
    }

    this.messages[gameId][key] = {
      messageId,
      channelId,
    };
  }

  public getMessage(
    gameId: string,
    key: MessageType,
  ): StoredMessage | undefined {
    return this.messages[gameId]?.[key];
  }
}

export const messageService = new MessageService();
