import { BaseInteraction, EmbedBuilder, Events } from "discord.js";
import Event from "../templates/Event";
import { client } from "..";
import type { SlashCommand } from "../templates/SlashCommand";
import { discordLogger } from "../../shared/logger";
import ComponentEvent from "../templates/ComponentEvent";
import { ColorPalette } from "../utils/ColorPalette";

export default new Event({
    name: Events.InteractionCreate,
    async execute(interaction: BaseInteraction) {
        if (interaction.isChatInputCommand()) {
            if (!client.commands.has(interaction.commandName))
                throw new Error(
                    `Failed to find slash command handler for ${interaction.commandName}`,
                );

            try {
                const command = client.commands.get(
                    interaction.commandName,
                ) as SlashCommand;

                if (!command.execute) {
                    throw new Error(
                        `Failed to find execution handler for ${command.data.name}`,
                    );
                }

                await command.execute(interaction);
            } catch (error) {
                if (!(error instanceof Error)) return;
                discordLogger.error(error);
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Error")
                            .setDescription(error.message)
                            .setColor(ColorPalette.DANGER),
                    ],
                    flags: ["Ephemeral"],
                });
            }
        }

        if (interaction.isMessageComponent() && interaction.isRepliable()) {
            // Support dynamic customIds like "lobbyAccept:123"
            // The handler is registered under the prefix before ":"
            const handlerKey = interaction.customId.split(":")[0]!;

            if (!client.componentHandlers.has(handlerKey)) {
                discordLogger.warn(
                    `Failed to find component handler for "${interaction.customId}"`,
                );
                return;
            }

            try {
                const command = client.componentHandlers.get(
                    handlerKey,
                ) as ComponentEvent;

                if (!command.execute) {
                    throw new Error(
                        `Failed to find execution handler for ${command.name}`,
                    );
                }

                await command.execute(interaction);
            } catch (error) {
                if (!(error instanceof Error)) return;
                discordLogger.error(error);
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Error")
                            .setDescription(error.message)
                            .setColor(ColorPalette.DANGER),
                    ],
                    flags: ["Ephemeral"],
                });
            }
        }
    },
});
