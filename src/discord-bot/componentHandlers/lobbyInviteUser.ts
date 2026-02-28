import { EmbedBuilder, type UserSelectMenuInteraction } from "discord.js";
import ComponentEvent from "../templates/ComponentEvent";
import { LobbyController } from "../../matchmaking/LobbyController";
import { prisma } from "../../shared/prisma";
import { ColorPalette } from "../utils/ColorPalette";
import path from "path";

const filename = path.parse(import.meta.file).name;

export default new ComponentEvent<UserSelectMenuInteraction>({
    name: filename,
    access: "linkedOnly",
    execute: async (interaction, user) => {
        const targetDiscordId = interaction.values[0];

        if (!targetDiscordId) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("❌ No user selected.")
                        .setColor(ColorPalette.DANGER),
                ],
                flags: ["Ephemeral"],
            });
            return;
        }

        if (targetDiscordId === user.discordId) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("❌ You can't invite yourself.")
                        .setColor(ColorPalette.DANGER),
                ],
                flags: ["Ephemeral"],
            });
            return;
        }

        // Make sure target is a linked osu! user
        const targetUser = await prisma.user.findUnique({
            where: { discordId: targetDiscordId },
        });

        if (!targetUser) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            `❌ <@${targetDiscordId}> hasn't linked their osu! account yet.`,
                        )
                        .setColor(ColorPalette.DANGER),
                ],
                flags: ["Ephemeral"],
            });
            return;
        }

        const result = await LobbyController.sendInvite(
            user.discordId,
            targetDiscordId,
        );

        const errorMessages: Record<string, string> = {
            lobby_not_found: "❌ Your lobby was not found.",
            not_2v2: "❌ Invites are only available in 2v2 mode.",
            already_has_guest: "❌ Your lobby already has a player.",
            already_invited: `❌ You already sent an invite to <@${targetDiscordId}>.`,
        };

        if (result !== "ok") {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            errorMessages[result] ?? "❌ Unknown error.",
                        )
                        .setColor(ColorPalette.DANGER),
                ],
                flags: ["Ephemeral"],
            });
            return;
        }

        // Refresh lobby panel
        const lobby = await prisma.lobby.findUnique({
            where: { hostId: user.discordId },
            include: { host: true, guest: true, invites: true },
        });
        if (!lobby) throw new Error("Lobby not found");

        await interaction.update({
            ...LobbyController.buildLobbyPanel(lobby),
        });

        // Notify the invited user via a follow-up (they'll see it if they check invites)
        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setDescription(
                        `✅ Invite sent to <@${targetDiscordId}>!\nThey can check their invites with the **View Invites** button.`,
                    )
                    .setColor(ColorPalette.SUCCESS),
            ],
            flags: ["Ephemeral"],
        });
    },
});
