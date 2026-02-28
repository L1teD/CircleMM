import { ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../templates/SlashCommand";
import path from "node:path";
import { row } from "../utils/row";

const filename = path.parse(import.meta.file).name;

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName(filename)
        .setDescription("Generates buttons"),
    execute: async (interaction) => {
        if (interaction.channel?.isSendable()) {
            interaction.channel.send({
                components: [
                    row(
                        new ButtonBuilder()
                            .setCustomId("openLobby")
                            .setLabel("🎮 Open Lobby")
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId("lobbyInvites")
                            .setLabel("📨 View Invites")
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId("leaveQueue")
                            .setLabel("Leave Queue")
                            .setStyle(ButtonStyle.Danger),
                    ),
                    row(
                        new ButtonBuilder()
                            .setCustomId("linkOsu")
                            .setLabel("Link osu! account")
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId("unlinkOsu")
                            .setLabel("Unlink osu! account")
                            .setStyle(ButtonStyle.Danger),
                    ),
                ],
            });
        }
    },
});
