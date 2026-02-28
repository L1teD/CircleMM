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
            where: { hostId: user.discordId },
            include: { host: true, guest: true, invites: true },
        });

        if (!lobby || !lobby.guestId) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("❌ No guest to kick.")
                        .setColor(ColorPalette.DANGER),
                ],
                flags: ["Ephemeral"],
            });
            return;
        }

        await LobbyController.removeGuest(lobby.id);

        const refreshed = await prisma.lobby.findUnique({
            where: { id: lobby.id },
            include: { host: true, guest: true, invites: true },
        });
        if (!refreshed) throw new Error("Lobby not found after kick");

        await interaction.update(LobbyController.buildLobbyPanel(refreshed));
    },
});
