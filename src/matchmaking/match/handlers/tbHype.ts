import { fromPromise } from "xstate";
import type { MatchHandlerContext } from "./types";

export function createTBHypeHandler(ctx: MatchHandlerContext) {
    const { controller, refs } = ctx;
    return fromPromise(async () => {
        if (!controller.context.currentMappool)
            throw new Error("Mappool not found!");

        if (!refs.lobbyChannel) throw new Error("Lobby channel was not found!");

        const TBMaps = controller.context.currentMappool.entries.filter(
            (entry) => entry.mod === "TB",
        );

        const randomTB = TBMaps[Math.floor(Math.random() * TBMaps.length)];

        if (!randomTB) throw new Error("Tie Breaker map was not found!");

        await refs.lobbyChannel.lobby.setMods("NF", true);
        await refs.lobbyChannel.lobby.setMap(randomTB.map.id);
    });
}
