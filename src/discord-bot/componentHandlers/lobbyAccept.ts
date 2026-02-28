import { EmbedBuilder, type ButtonInteraction } from "discord.js";
import ComponentEvent from "../templates/ComponentEvent";
import { LobbyController } from "../../matchmaking/LobbyController";
import { ColorPalette } from "../utils/ColorPalette";
import path from "path";

const filename = path.parse(import.meta.file).name;

export default new ComponentEvent<ButtonInteraction>({
    name: filename,
    access: "linkedOnly",
    execute: async (interaction, user) => {
        // customId format: "lobbyAccept:LOBBY_ID"
        const lobbyId = Number(interaction.customId.split(":")[1]);

        if (!lobbyId || isNaN(lobbyId)) {
            throw new Error("Invalid lobby ID in customId");
        }

        const lobby = await LobbyController.acceptInvite(
            user.discordId,
            lobbyId,
        );

        if (!lobby) {
            await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            "❌ This invite is no longer valid (lobby may have changed).",
                        )
                        .setColor(ColorPalette.DANGER),
                ],
                components: [],
            });
            return;
        }

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle("✅ Joined Lobby!")
                    .setDescription(
                        `You've joined **<@${lobby.hostId}>**'s lobby.\n` +
                            `Mode: **${lobby.mode ?? "not set"}**\n` +
                            `The host will start the search when ready.`,
                    )
                    .setColor(ColorPalette.SUCCESS),
            ],
            components: [],
        });
    },
});
