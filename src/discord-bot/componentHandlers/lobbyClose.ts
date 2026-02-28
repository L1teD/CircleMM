import { EmbedBuilder, type ButtonInteraction } from "discord.js";
import ComponentEvent from "../templates/ComponentEvent";
import { LobbyController } from "../../matchmaking/LobbyController";
import { ColorPalette } from "../utils/ColorPalette";
import path from "path";

const filename = path.parse(import.meta.file).name;

export default new ComponentEvent<ButtonInteraction>({
    name: filename,
    access: "linkedOnly",
    execute: async (interaction, user) => {
        await LobbyController.deleteLobby(user.discordId);

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setDescription("✅ Lobby closed.")
                    .setColor(ColorPalette.SECONDARY),
            ],
            components: [],
        });
    },
});
