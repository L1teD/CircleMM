import { SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../templates/SlashCommand";
import path from "node:path";

const filename = path.parse(import.meta.file).name;

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName(filename)
        .setDescription("Replies with Pong!"),
    execute: async (interaction) => {
        await interaction.editReply({
            content: "Pong!",
        });
    },
});
