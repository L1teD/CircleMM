import { EmbedBuilder, type ButtonInteraction } from "discord.js";
import ComponentEvent, {
    type UserWithDiscord,
} from "../templates/ComponentEvent.js";
import { queue1v1, queue2v2 } from "../../index.js";
import { createTeam } from "../../matchmaking/team.js";
import { prisma } from "../../shared/prisma.js";
import { ColorPalette } from "../utils/ColorPalette.js";
import path from "path";

const filename = path.parse(import.meta.file).name;

// Handles "Start Search" button from the lobby panel.
// Validates lobby state and adds the team to the appropriate queue.
export default new ComponentEvent<ButtonInteraction>({
    name: filename,
    access: "linkedOnly",
    execute: async (interaction, user) => {
        await interaction.deferUpdate();

        const lobby = await prisma.lobby.findUnique({
            where: { hostId: user.discordId },
            include: { guest: true },
        });

        if (!lobby) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("❌ Lobby not found.")
                        .setColor(ColorPalette.DANGER),
                ],
                components: [],
            });
            return;
        }

        if (!lobby.mode) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("❌ Please select a queue mode first.")
                        .setColor(ColorPalette.DANGER),
                ],
            });
            return;
        }

        if (lobby.autoLeave === null) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("❌ Please select an auto-leave time.")
                        .setColor(ColorPalette.DANGER),
                ],
            });
            return;
        }

        // Guard: reject if already in a queue.
        const queue = lobby.mode === "1v1" ? queue1v1 : queue2v2;
        const alreadyQueued = await queue.isPlayerInQueue(user.discordId);
        if (alreadyQueued) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("❌ You are already in the queue.")
                        .setColor(ColorPalette.DANGER),
                ],
            });
            return;
        }

        const players: UserWithDiscord[] = [user];

        if (lobby.mode === "2v2" && lobby.guestId) {
            const guest = await prisma.user.findUnique({
                where: { discordId: lobby.guestId },
            });
            if (!guest?.discordId) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(
                                `❌ Your teammate <@${lobby.guestId}> has no linked osu! account.`,
                            )
                            .setColor(ColorPalette.DANGER),
                    ],
                });
                return;
            }

            // Guard: reject if teammate is already in a queue.
            const guestQueued = await queue.isPlayerInQueue(guest.discordId);
            if (guestQueued) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(
                                `❌ Your teammate is already in the queue.`,
                            )
                            .setColor(ColorPalette.DANGER),
                    ],
                });
                return;
            }

            players.push(guest as UserWithDiscord);
        }

        const team = createTeam(players, user.name);
        await queue.addTeam(team, lobby.autoLeave);

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🔍 Searching for a Match")
                    .setDescription(
                        `Joined the **${lobby.mode}** queue.\nTeam: ${players.map((p) => `**${p.name}**`).join(" & ")}`,
                    )
                    .setColor(ColorPalette.SUCCESS),
            ],
            components: [],
        });
    },
});
