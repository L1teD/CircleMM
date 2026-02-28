import { createActor, type ActorRefFrom } from "xstate";
import { type Guild } from "discord.js";
import type { BanchoClient } from "bancho.js";
import { matchMachine } from "./match.machine";
import { MatchController } from "./MatchController";
import type { Team } from "../team";
import type { MatchHandlerContext, MatchRefs } from "./handlers";
import {
    createInitMatchHandler,
    createRequestChannelCreationHandler,
    createConfirmPlayersHandler,
    createMakeRollsHandler,
    createStartMappoolsBanHandler,
    createShowSelectedPoolHandler,
    createOsuLobbyAndWaitHandler,
    createAllPlayersJoinedHandler,
    createStartMapsBanHandler,
    createStartMapsPickRotationHandler,
    createWaitingForPlayersReady,
    createIngameHandler,
    createFinishedHandler,
    createTBHypeHandler,
} from "./handlers";

export interface MatchData {
    id: string;
    teamA: Team;
    teamB: Team;
    bestOf: number;
}

export class MatchRuntime {
    private controller: MatchController;
    private actor: ActorRefFrom<typeof matchMachine>;

    constructor(
        matchData: MatchData,
        private guild: Guild,
        private osuClient: BanchoClient,
    ) {
        this.controller = new MatchController(matchData);

        const refs: MatchRefs = {
            category: null,
            controlChannel: null,
            lobbyChannel: null,
        };

        const handlerCtx: MatchHandlerContext = {
            matchData,
            guild,
            osuClient,
            controller: this.controller,
            refs,
        };

        const scoreToWin = Math.floor(matchData.bestOf / 2);

        this.actor = createActor(
            matchMachine.provide({
                actors: {
                    initMatch: createInitMatchHandler(handlerCtx),
                    requestChannelCreation:
                        createRequestChannelCreationHandler(handlerCtx),
                    confirmPlayers: createConfirmPlayersHandler(handlerCtx),
                    makeRolls: createMakeRollsHandler(handlerCtx),
                    startMappoolsBan: createStartMappoolsBanHandler(handlerCtx),
                    showSelectedPool: createShowSelectedPoolHandler(handlerCtx),
                    createOsuLobbyAndWait:
                        createOsuLobbyAndWaitHandler(handlerCtx),
                    allPlayersJoined: createAllPlayersJoinedHandler(handlerCtx),
                    startMapsBan: createStartMapsBanHandler(handlerCtx),
                    startMapsPickRotatiton:
                        createStartMapsPickRotationHandler(handlerCtx),
                    waitingForPlayersReady:
                        createWaitingForPlayersReady(handlerCtx),
                    ingame: createIngameHandler(handlerCtx),
                    finished: createFinishedHandler(handlerCtx),
                    tbHype: createTBHypeHandler(handlerCtx),
                },
                actions: {
                    logError: (event) => {
                        console.error("Match runtime error:", event.event);
                    },
                },
                guards: {
                    isTeamWon: () =>
                        this.controller.context.matchScore.A >= scoreToWin ||
                        this.controller.context.matchScore.B >= scoreToWin,
                    isTieBreaker: () =>
                        this.controller.context.matchScore.A ===
                            scoreToWin - 1 &&
                        this.controller.context.matchScore.B === scoreToWin - 1,
                },
            }),
        );
    }

    start() {
        this.actor.subscribe((event) => console.log(event.value));
        this.actor.start();
    }
}
