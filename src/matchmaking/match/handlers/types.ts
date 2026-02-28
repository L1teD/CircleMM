import type { CategoryChannel, Guild, TextChannel } from "discord.js";
import type { BanchoClient, BanchoMultiplayerChannel } from "bancho.js";
import type { MatchController } from "../MatchController";
import type { MatchData } from "../MatchRuntime";

export interface MatchRefs {
    category: CategoryChannel | null;
    controlChannel: TextChannel | null;
    lobbyChannel: BanchoMultiplayerChannel | null;
}

export interface MatchHandlerContext {
    matchData: MatchData;
    guild: Guild;
    osuClient: BanchoClient;
    controller: MatchController;
    refs: MatchRefs;
}
