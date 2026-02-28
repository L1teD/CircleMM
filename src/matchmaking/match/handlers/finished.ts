import { fromPromise } from "xstate";
import type { MatchHandlerContext } from "./types";
import { EmbedBuilder } from "@discordjs/builders";

export function createFinishedHandler(ctx: MatchHandlerContext) {
    const { refs, controller, matchData } = ctx;
    return fromPromise(async () => {
        if (!refs.lobbyChannel) throw new Error("Lobby channel was not found!");
        if (!refs.controlChannel)
            throw new Error("Control channel was not found!");

        const scoreA = controller.context.matchScore.A;
        const scoreB = controller.context.matchScore.B;

        const winner = scoreA > scoreB ? matchData.teamA : matchData.teamB;

        controller.setWinner(winner);

        await refs.lobbyChannel.sendMessage(
            `Match winner is ${winner.name}! GGs!`,
        );
        await refs.lobbyChannel.sendMessage(`Lobby will close in 30 seconds`);

        const osuLobbyTimeout = setTimeout(async () => {
            await refs.lobbyChannel?.lobby.closeLobby();
        }, 30_000);

        refs.lobbyChannel?.lobby.on("playerLeft", async () => {
            const isEmpty = refs.lobbyChannel?.lobby.slots.some(
                (slot) => slot === null,
            );

            clearTimeout(osuLobbyTimeout);
            if (isEmpty) await refs.lobbyChannel?.lobby.closeLobby();
        });

        refs.controlChannel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Match finshed")
                    .setDescription(
                        [
                            `Match winner is ${winner.name}! GGs!`,
                            "Channel will be removed in 30 seconds",
                        ].join("\n"),
                    ),
            ],
        });

        setTimeout(async () => {
            if (!refs.category) return;

            for (const [, channel] of refs.category.children.cache) {
                await channel.delete().catch(console.error);
            }

            await refs.category.delete().catch(console.error);
        }, 30_000);

        await controller.init();
    });
}
