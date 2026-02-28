import {
    ActionRowBuilder,
    ComponentType,
    EmbedBuilder,
    StringSelectMenuBuilder,
    type ButtonInteraction,
} from "discord.js";
import ComponentEvent from "../templates/ComponentEvent";
import path from "path";
import { queue1v1, queue2v2 } from "../..";
import { ColorPalette } from "../utils/ColorPalette";

const filename = path.parse(import.meta.file).name;

export default new ComponentEvent<ButtonInteraction>({
    name: filename,
    access: "linkedOnly",
    async execute(interaction, user) {
        // Check which queues the user is in
        const in1v1 = await queue1v1.isPlayerInQueue(user.id);
        const in2v2 = await queue2v2.isPlayerInQueue(user.id);

        if (!in1v1 && !in2v2) {
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("❌ You are not in any queue.")
                        .setColor(ColorPalette.DANGER),
                ],
                flags: ["Ephemeral"],
            });
            return;
        }

        const options: { label: string; value: string }[] = [];
        if (in1v1) options.push({ label: "1v1 Queue", value: "1v1" });
        if (in2v2) options.push({ label: "2v2 Queue", value: "2v2" });
        if (in1v1 && in2v2)
            options.push({ label: "Both Queues", value: "all" });

        const select = new StringSelectMenuBuilder()
            .setCustomId("leaveQueueSelect")
            .setPlaceholder("Choose which queue to leave")
            .addOptions(options);

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🚪 Leave Queue")
                    .setDescription("Select which queue to leave.")
                    .setColor(ColorPalette.DANGER),
            ],
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    select,
                ),
            ],
            flags: ["Ephemeral"],
        });

        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 30_000,
            max: 1,
        });

        collector.on("collect", async (i) => {
            if (i.user.id !== interaction.user.id) return;

            const value = i.values[0];
            const discordId = interaction.user.id;

            if (value === "1v1" || value === "all") {
                await queue1v1.removeTeamByPlayerDiscordId(discordId);
            }
            if (value === "2v2" || value === "all") {
                await queue2v2.removeTeamByPlayerDiscordId(discordId);
            }

            await i.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            `✅ Left the **${value === "all" ? "1v1 & 2v2" : value}** queue.`,
                        )
                        .setColor(ColorPalette.SUCCESS),
                ],
                components: [],
            });
        });

        collector.on("end", (_, reason) => {
            if (reason === "time") {
                interaction.deleteReply();
            }
        });
    },
});
