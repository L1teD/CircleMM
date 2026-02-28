import { type ButtonInteraction } from "discord.js";
import ComponentEvent from "../templates/ComponentEvent";
import { LobbyController } from "../../matchmaking/LobbyController";
import path from "path";

const filename = path.parse(import.meta.file).name;

export default new ComponentEvent<ButtonInteraction>({
    name: filename,
    access: "linkedOnly",
    execute: async (interaction, user) => {
        // customId format: "lobbyDecline:LOBBY_ID"
        const lobbyId = Number(interaction.customId.split(":")[1]);

        if (!lobbyId || isNaN(lobbyId)) {
            throw new Error("Invalid lobby ID in customId");
        }

        await LobbyController.declineInvite(user.discordId, lobbyId);

        // Re-fetch remaining invites and update the panel
        const remaining = await LobbyController.getInvitesForUser(
            user.discordId,
        );

        await interaction.update(LobbyController.buildInvitesPanel(remaining));
    },
});
