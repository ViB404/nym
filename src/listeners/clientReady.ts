import { Listener } from "@sapphire/framework";
import type { Client } from "discord.js";
import { intializeDb } from "../database/db";

export class ReadyListener extends Listener {
  public run(client: Client) {
    const { username, id } = client.user!;
    this.container.logger.info(`Successfully logged in as ${username} (${id})`);

    intializeDb();
  }
}
