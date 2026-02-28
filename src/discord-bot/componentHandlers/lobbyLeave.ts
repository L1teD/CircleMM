import { EmbedBuilder, type ButtonInteraction } from "discord.js";
import ComponentEvent from "../templates/ComponentEvent";
import { LobbyController } from "../../matchmaking/LobbyController";
import { prisma } from "../../shared/prisma";
import { ColorPalette } from "../utils/ColorPalette";
import path from "path";

const filename = path.parse(import.meta.file).name;

export default new ComponentEvent<ButtonInteraction>({
    name: filename,
    access: "linkedOnly",
    execute: async (interaction, user) => {
        const lobby = await prisma.lobby.findUnique({
            where: { guestId: user.discordId },
        });

        if (!lobby) {
            await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("❌ You are not in anyone's lobby.")
                        .setColor(ColorPalette.DANGER),
                ],
                components: [],
            });
            return;
        }

        await LobbyController.removeGuest(lobby.id);

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setDescription("✅ You left the lobby.")
                    .setColor(ColorPalette.SUCCESS),
            ],
            components: [],
        });
    },
});
