import { fromPromise } from "xstate";
import type { MatchHandlerContext } from "./types";
import { BanchoLobbyTeamModes, BanchoLobbyWinConditions } from "bancho.js";
import { EmbedBuilder } from "discord.js";
import { ColorPalette } from "../../../discord-bot/utils/ColorPalette";
import { osuClient } from "../test";

export function createOsuLobbyAndWaitHandler(ctx: MatchHandlerContext) {
    const { controller, refs } = ctx;
    return fromPromise(async () => {
        if (!refs.controlChannel)
            throw new Error("Control channel was not found!");

        const context = controller.context;

        const message = await refs.controlChannel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle("osu! Lobby")
                    .setDescription("Creating osu! lobby..."),
            ],
        });

        refs.lobbyChannel = await osuClient.createLobby(
            `CMM: (${context.teamA.name}) vs (${context.teamB.name})`,
        );

        // @ts-expect-error: temporary solution
        // FIXME: Make re-attaching listeners instead of this workaround
        refs.lobbyChannel.banchojs.client.setTimeout(0);

        const lobby = refs.lobbyChannel.lobby;
        const players = [...context.teamA.players, ...context.teamB.players];

        await lobby.setSettings(
            BanchoLobbyTeamModes.TeamVs,
            BanchoLobbyWinConditions.ScoreV2,
            players.length * 2,
        );

        await lobby.lockSlots();

        const invitePlayers = () => {
            const playersInLobby = lobby.slots
                .filter((slot) => slot !== null)
                .map((slot) => slot.user);

            players.forEach((player) => {
                const isInLobby = playersInLobby.some(
                    (user) => user.id === player.id,
                );

                if (!isInLobby) lobby.invitePlayer(player.name);
            });
        };

        invitePlayers();
        const inviteInterval = setInterval(() => {
            invitePlayers();
        }, 30000);

        await message.edit({
            embeds: [
                new EmbedBuilder()
                    .setTitle("osu! Lobby")
                    .setDescription(
                        [
                            "Lobby created!",
                            "Invites are sent every 30 seconds",
                            "",
                            "TODO: Click to join",
                        ].join("\n"),
                    )
                    .setColor(ColorPalette.SUCCESS),
            ],
        });

        const joinedPlayers = new Set<string>();

        lobby.on("playerJoined", (obj) => {
            joinedPlayers.add(obj.player.user.username);

            message.edit({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("osu! Lobby")
                        .setDescription(
                            [
                                "Lobby created!",
                                "Invites are sent every 30 seconds",
                                "",
                                `Players joined: **${joinedPlayers.size}/${players.length}**`,
                            ].join("\n"),
                        )
                        .setColor(
                            joinedPlayers.size === players.length
                                ? ColorPalette.SUCCESS
                                : ColorPalette.INFO,
                        ),
                ],
            });
        });

        await new Promise<void>((resolve) => {
            lobby.on("playerJoined", () => {
                if (joinedPlayers.size === players.length) {
                    clearInterval(inviteInterval);
                    lobby.removeAllListeners("playerJoined");
                    resolve();
                }
            });
        });
    });
}
