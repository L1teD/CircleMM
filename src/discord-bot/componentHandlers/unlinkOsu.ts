import { EmbedBuilder } from "@discordjs/builders";
import { discordLogger } from "../../shared/logger";
import { prisma } from "../../shared/prisma";
import ComponentEvent from "../templates/ComponentEvent";
import { ColorPalette } from "../utils/ColorPalette";
import type { ButtonInteraction } from "discord.js";
import path from "path";

const filename = path.parse(import.meta.file).name;

export default new ComponentEvent<ButtonInteraction>({
    name: filename,
    access: "linkedOnly",
    execute: async (interaction, user) => {
        try {
            // Clean up lobby data and pending invites before unlinking
            await prisma.lobby.deleteMany({
                where: { hostId: user.discordId },
            });
            await prisma.lobbyInvite.deleteMany({
                where: { toId: user.discordId },
            });

            await prisma.user.update({
                where: user,
                data: {
                    discordId: null,
                },
            });

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("✅ Success!")
                        .setDescription(`Your account is now unlinked`)
                        .setColor(ColorPalette.SUCCESS),
                ],
                flags: ["Ephemeral"],
            });
        } catch (error) {
            discordLogger.error(error);
        }
    },
});
