import { fromPromise } from "xstate";
import type { MatchHandlerContext } from "./types";
import { env } from "../../../config/env";

export function createWaitingForPlayersReady(ctx: MatchHandlerContext) {
    const { refs, controller } = ctx;
    return fromPromise(async () => {
        return new Promise<void>((resolve) => {
            if (!refs.lobbyChannel)
                throw new Error("Lobby channel was not found!");
            refs.lobbyChannel.lobby.startTimer(
                env.MATCH_WAITING_FOR_PLAYERS_READY_MS / 1000,
            );

            const currentMod = controller.context.currentPick?.mod;

            const sendFreemodMessage = () => {
                if (refs.lobbyChannel?.lobby.freemod) {
                    refs.lobbyChannel!.sendMessage(
                        "This is Freemod, don't forget to enable NF",
                    );
                    refs.lobbyChannel!.sendMessage(
                        `EZ: 1.75x | HD: 1.06x | HR: 1.06x | HDHR: 1.12x | ${
                            currentMod === "TB" ? "NM: 1.0x" : "NM: 0.5x"
                        }`,
                    );
                }
            };

            sendFreemodMessage();
            const interval = setInterval(() => {
                sendFreemodMessage();
            }, 30_000);

            const startMatch = () => {
                clearInterval(interval);
                refs.lobbyChannel!.lobby.abortTimer();
                refs.lobbyChannel!.lobby.startMatch(5);
                resolve();
            };

            refs.lobbyChannel!.lobby.once("allPlayersReady", startMatch);

            setTimeout(() => {
                startMatch();
            }, env.MATCH_WAITING_FOR_PLAYERS_READY_MS);
        });
    });
}
