import { SapphireClient } from "@sapphire/framework";
import { GatewayIntentBits } from "discord.js";

let DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

const client = new SapphireClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("error", (error) => {
  console.error("[DISCORD CLIENT ERROR]", error);
});

client.rest.on("rateLimited", (info) => {
  console.warn("[RATE LIMITED]", info);
});

process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED REJECTION]", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[UNCAUGHT EXCEPTION]", error);
});

client.login(DISCORD_BOT_TOKEN);
