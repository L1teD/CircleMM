import { BanchoLobbyTeams, type BanchoMultiplayerChannel } from "bancho.js";
import type { MatchController } from "../MatchController";

export async function sortPlayersInLobby(
    lobbyChannel: BanchoMultiplayerChannel,
    controller: MatchController,
) {
    if (!lobbyChannel) throw new Error("Lobby channel was not found!");

    const lobby = lobbyChannel.lobby;

    const matchPlayers = [
        ...controller.context.teamA.players,
        ...controller.context.teamB.players,
    ];

    // Create buffer slots
    await lobby.setSize(matchPlayers.length * 2);

    // Move all players to buffer slots
    for (let i = 0; i < matchPlayers.length; i++) {
        const id = matchPlayers[i]?.id;
        if (!id) throw new Error("Player was not found");
        const player = await lobby.getPlayerById(id);
        await lobby.movePlayer(player, matchPlayers.length + i);
    }

    // Move players back to their respective team slots
    let slotIndex = 0;

    // Fill Team A slots
    for (const player of controller.context.teamA.players) {
        const lobbyPlayer = await lobby.getPlayerById(player.id);
        await lobby.movePlayer(lobbyPlayer, slotIndex);
        await lobby.changeTeam(lobbyPlayer, BanchoLobbyTeams.Blue);
        slotIndex++;
    }

    // Fill Team B slots
    for (const player of controller.context.teamB.players) {
        const lobbyPlayer = await lobby.getPlayerById(player.id);
        await lobby.movePlayer(lobbyPlayer, slotIndex);
        await lobby.changeTeam(lobbyPlayer, BanchoLobbyTeams.Red);
        slotIndex++;
    }

    lobby.setSize(matchPlayers.length);
}

export function getCurrentState(controller: MatchController) {
    return [
        `Team ${controller.context.teamA.name} | ${controller.context.matchScore.A}:${controller.context.matchScore.B} | Team ${controller.context.teamB.name}`,
        `Banned maps: ${controller.context.bannedMaps.map(({ entry }) => `${entry.mod}${entry.modIndex}`).join(", ")}`,
        `Available maps: ${controller.context.availableMaps.map((entry) => `${entry.mod}${entry.modIndex}`).join(", ")}`,
    ];
}
