import { ButtonInteraction, EmbedBuilder, hyperlink } from "discord.js";
import { env } from "process";
import ComponentEvent from "../templates/ComponentEvent";
import { ColorPalette } from "../utils/ColorPalette";
import path from "path";
import { subscribeEvent } from "../../shared/redis";

const filename = path.parse(import.meta.file).name;

export default new ComponentEvent<ButtonInteraction>({
    name: filename,
    access: "unlinkedOnly",
    execute: async (interaction) => {
        const res = await fetch(`${env.FASTIFY_HOST}/auth/osu/link`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ discordId: interaction.user.id }),
        });

        const data = (await res.json()) as { url: string };

        void subscribeEvent("USER_LINKED", async (payload) => {
            if (payload.discordId === interaction.user.id) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("✅ Success!")
                            .setDescription(
                                `Your account is now linked with **${payload.username}**`,
                            )
                            .setColor(ColorPalette.SUCCESS),
                    ],
                });
            }
        });

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🔗 Account linking")
                    .setDescription(
                        `${hyperlink("**Click here**", data.url)} to login with osu!`,
                    )
                    .setColor(ColorPalette.INFO),
            ],
            flags: ["Ephemeral"],
        });
    },
});
