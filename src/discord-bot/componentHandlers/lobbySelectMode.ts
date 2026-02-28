import type { StringSelectMenuInteraction } from "discord.js";
import ComponentEvent from "../templates/ComponentEvent";
import { LobbyController } from "../../matchmaking/LobbyController";
import { prisma } from "../../shared/prisma";
import path from "path";

const filename = path.parse(import.meta.file).name;

export default new ComponentEvent<StringSelectMenuInteraction>({
    name: filename,
    access: "linkedOnly",
    execute: async (interaction, user) => {
        const mode = interaction.values[0] as "1v1" | "2v2";
        await LobbyController.updateMode(user.discordId, mode);

        const lobby = await prisma.lobby.findUnique({
            where: { hostId: user.discordId },
            include: { host: true, guest: true, invites: true },
        });
        if (!lobby) throw new Error("Lobby not found");

        await interaction.update(LobbyController.buildLobbyPanel(lobby));
    },
});
