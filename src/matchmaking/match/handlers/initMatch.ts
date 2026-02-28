import { fromPromise } from "xstate";
import type { MatchHandlerContext } from "./types";

export function createInitMatchHandler(ctx: MatchHandlerContext) {
    const { controller } = ctx;
    return fromPromise(async () => {
        await controller.init();
    });
}
