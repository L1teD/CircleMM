/// <reference types="./index.d.ts" />

import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import { discordLogger } from "../shared/logger";
import { env } from "../config/env";
import fs from "node:fs";
import path from "node:path";
import { registerCommands } from "./utils/registerCommands";
import type Event from "./templates/Event";
import type { SlashCommand } from "./templates/SlashCommand";
import type ComponentEvent from "./templates/ComponentEvent";

export const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
client.componentHandlers = new Collection();

client.once(Events.ClientReady, (ready) => {
    discordLogger.info(`Connected! Logged in as ${ready.user.tag}`);
});

await Promise.all([
    loadCommands("commands"),
    loadEvents(),
    loadHandlers("componentHandlers"),
]);
if (env.DISCORD_BOT_REGISTER_ON_START) registerCommands();

export async function init() {
    await client.login(env.DISCORD_BOT_TOKEN);
}

async function loadCommands(name: "commands") {
    const filesPath = path.join(import.meta.dirname, name);
    const files = fs.readdirSync(filesPath);

    for (const file of files) {
        const commandPath = path.join(filesPath, file);
        const command = (await import(commandPath)).default as SlashCommand;
        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
        } else {
            discordLogger.error(
                `The command at ${commandPath} is missing a required "data" or "execute" property.`,
            );
        }
    }

    discordLogger.info(
        `Loaded ${client.commands.size}/${files.length} commands (${name})`,
    );
}

async function loadHandlers(name: "componentHandlers") {
    const filesPath = path.join(import.meta.dirname, name);
    const files = fs.readdirSync(filesPath);

    for (const file of files) {
        const commandPath = path.join(filesPath, file);
        const command = (await import(commandPath)).default as ComponentEvent;
        if ("name" in command && "execute" in command) {
            client.componentHandlers.set(command.name, command);
        } else {
            discordLogger.error(
                `The handler at ${commandPath} is missing a required "name" or "execute" property.`,
            );
        }
    }

    discordLogger.info(
        `Loaded ${client.commands.size}/${files.length} handlers (${name})`,
    );
}

async function loadEvents() {
    const filesPath = path.join(import.meta.dirname, "events");
    const files = fs.readdirSync(filesPath);

    for (const file of files) {
        const eventsPath = path.join(filesPath, file);
        const event: Event = (await import(eventsPath)).default;
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }

    discordLogger.info(`Loaded ${files.length} events`);
}
