import { fromPromise } from "xstate";
import type { MatchHandlerContext } from "./types";

export function createIngameHandler(ctx: MatchHandlerContext) {
    const { refs, matchData, controller } = ctx;
    return fromPromise(async () => {
        return new Promise<void>((resolve, reject) => {
            if (!refs.lobbyChannel)
                throw new Error("Lobby channel was not found!");

            refs.lobbyChannel.lobby.on("matchFinished", () => {
                let scoreA = 0;
                let scoreB = 0;

                refs.lobbyChannel!.lobby.scores.forEach((score) => {
                    if (
                        matchData.teamA.players
                            .map((player) => player.id)
                            .some((id) => id === score.player.user.id)
                    ) {
                        // NOTE: Checking for mods is useless as i see since score.player.mods is just an empty array
                        scoreA += score.score;
                    }

                    if (
                        matchData.teamB.players
                            .map((player) => player.id)
                            .some((id) => id === score.player.user.id)
                    ) {
                        // NOTE: Checking for mods is useless as i see since score.player.mods is just an empty array
                        scoreB += score.score;
                    }
                });

                const winner = controller.getMapWinner(scoreA, scoreB);

                refs.lobbyChannel!.sendMessage(
                    `Team ${winner.name} won map by ${Math.abs(scoreA - scoreB)}`,
                );

                refs.lobbyChannel!.lobby.removeAllListeners("matchFinished");
                refs.lobbyChannel!.lobby.removeAllListeners("message");
                resolve();
            });

            refs.lobbyChannel.once("message", async (message) => {
                if (message.self) return;
                if (!message.user.id) return;
                if (!refs.lobbyChannel?.lobby.playing) return;

                if (message.content === "!abort") {
                    await refs.lobbyChannel!.lobby.abortMatch();
                    refs.lobbyChannel!.lobby.removeAllListeners(
                        "matchFinished",
                    );
                    refs.lobbyChannel!.lobby.removeAllListeners("message");
                    reject();
                }
            });
        });
    });
}
