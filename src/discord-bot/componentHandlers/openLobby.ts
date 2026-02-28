import type { ButtonInteraction } from "discord.js";
import ComponentEvent from "../templates/ComponentEvent";
import { LobbyController } from "../../matchmaking/LobbyController";
import { prisma } from "../../shared/prisma";
import path from "path";

const filename = path.parse(import.meta.file).name;

export default new ComponentEvent<ButtonInteraction>({
    name: filename,
    access: "linkedOnly",
    execute: async (interaction, user) => {
        // Check if this user is already a guest in someone else's lobby
        const guestLobby = await prisma.lobby.findUnique({
            where: { guestId: user.discordId },
            include: { host: true, guest: true, invites: true },
        });

        if (guestLobby) {
            // Show host's lobby in read-only mode with a Leave button
            await interaction.reply({
                ...LobbyController.buildGuestPanel(guestLobby),
                flags: ["Ephemeral"],
            });
            return;
        }

        // Otherwise open (or create) own lobby
        await LobbyController.getOrCreate(user.discordId);

        const lobby = await prisma.lobby.findUnique({
            where: { hostId: user.discordId },
            include: { host: true, guest: true, invites: true },
        });
        if (!lobby) throw new Error("Lobby not found after creation");

        await interaction.reply({
            ...LobbyController.buildLobbyPanel(lobby),
            flags: ["Ephemeral"],
        });
    },
});
