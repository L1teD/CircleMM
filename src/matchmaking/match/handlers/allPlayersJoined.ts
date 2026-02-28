import { fromPromise } from "xstate";
import type { MatchHandlerContext } from "./types";
import { sortPlayersInLobby } from "./utils";

export function createAllPlayersJoinedHandler(ctx: MatchHandlerContext) {
    const { refs, controller } = ctx;
    return fromPromise(async () => {
        if (!refs.lobbyChannel) throw new Error("Lobby channel was not found!");
        if (!refs.controlChannel)
            throw new Error("Control channel was not found!");

        await sortPlayersInLobby(refs.lobbyChannel, controller);
    });
}
