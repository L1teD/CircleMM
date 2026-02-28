import type { ButtonInteraction } from "discord.js";
import ComponentEvent from "../templates/ComponentEvent";
import { LobbyController } from "../../matchmaking/LobbyController";
import path from "path";

const filename = path.parse(import.meta.file).name;

export default new ComponentEvent<ButtonInteraction>({
    name: filename,
    access: "linkedOnly",
    execute: async (interaction, user) => {
        const invites = await LobbyController.getInvitesForUser(user.discordId);

        await interaction.reply({
            ...LobbyController.buildInvitesPanel(invites),
            flags: ["Ephemeral"],
        });
    },
});
