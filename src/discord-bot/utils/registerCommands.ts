import { REST, Routes } from "discord.js";
import { env } from "../../config/env";
import { client } from "..";
import { discordLogger } from "../../shared/logger";

const { DISCORD_BOT_TOKEN, DISCORD_BOT_REGISTER_ON_START } = env;

const rest = new REST().setToken(DISCORD_BOT_TOKEN);

export async function registerCommands() {
    try {
        const commands = [...client.commands.values()].map((command) =>
            command.data.toJSON(),
        );
        discordLogger.info(
            {
                DISCORD_BOT_REGISTER_ON_START,
            },
            `Started refreshing ${commands.length} application (/) commands.`,
        );
        await rest.put(Routes.applicationCommands(env.DISCORD_BOT_CLIENT_ID), {
            body: [],
        });
        await rest.put(
            Routes.applicationCommands(
                env.DISCORD_BOT_CLIENT_ID,
                // env.DISCORD_GUILD_ID,
            ),
            {
                body: [],
            },
        );
        await rest.put(Routes.applicationCommands(env.DISCORD_BOT_CLIENT_ID), {
            body: commands,
        });
        discordLogger.info(`Successfully reloaded application (/) commands.`);
    } catch (error) {
        discordLogger.error(error);
    }
}
