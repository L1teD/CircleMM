import { EmbedBuilder, StringSelectMenuInteraction } from "discord.js";
import ComponentEvent from "../templates/ComponentEvent";
import path from "path";
import { queue1v1, queue2v2 } from "../..";
import { ColorPalette } from "../utils/ColorPalette";

const filename = path.parse(import.meta.file).name;

export default new ComponentEvent<StringSelectMenuInteraction>({
    name: filename,
    access: "linkedOnly",
    async execute(interaction, user) {
        const value = interaction.values[0];

        if (value === "1v1" || value === "all") {
            await queue1v1.removeTeamByPlayerDiscordId(user.discordId);
        }
        if (value === "2v2" || value === "all") {
            await queue2v2.removeTeamByPlayerDiscordId(user.discordId);
        }

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(
                        `✅ Left the **${value === "all" ? "1v1 & 2v2" : value}** queue.`,
                    )
                    .setColor(ColorPalette.SUCCESS),
            ],
            components: [],
            flags: ["Ephemeral"],
        });
    },
});
