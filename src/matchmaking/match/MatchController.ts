import type { Mappool } from "../../../generated/prisma/client";
import type {
    MappoolGetPayload,
    PoolEntryGetPayload,
} from "../../../generated/prisma/models";
import { env } from "../../config/env";
import { mmLogger } from "../../shared/logger";
import { prisma } from "../../shared/prisma";
import type { Team, TeamId } from "../team";
import type { MatchData } from "./MatchRuntime";

const log = mmLogger.child({}, { msgPrefix: "[Controller] " });

export interface MatchControllerContext {
    id: string;

    teamA: Team;
    teamB: Team;

    rollResults: Record<TeamId, number>;
    rollWinnerTeam: Team | null;

    currentTurnTeam: Team;

    availableMappools: Mappool[];
    currentMappool: MappoolGetPayload<{
        include: { entries: { include: { map: true } } };
    }> | null;

    availableMaps: PoolEntryGetPayload<{ include: { map: true } }>[];
    bannedMaps: {
        bannedBy: Team;
        entry: PoolEntryGetPayload<{ include: { map: true } }>;
    }[];
    pickedMaps: {
        pickedBy: Team;
        entry: PoolEntryGetPayload<{ include: { map: true } }>;
    }[];
    currentPick: PoolEntryGetPayload<{ include: { map: true } }> | null;

    matchScore: Record<TeamId, number>;

    playedMaps: {
        scoreA: number;
        scoreB: number;
        entry: PoolEntryGetPayload<{ include: { map: true } }>;
    }[];

    matchWinner: Team | null;
}

export class MatchController {
    private controllerContext: MatchControllerContext;

    constructor(private matchData: MatchData) {
        this.controllerContext = {
            id: matchData.id,
            teamA: matchData.teamA,
            teamB: matchData.teamB,
            rollResults: { A: -1, B: -1 },
            rollWinnerTeam: null,
            currentTurnTeam: matchData.teamA,
            availableMappools: [],
            currentMappool: null,
            availableMaps: [],
            bannedMaps: [],
            pickedMaps: [],
            currentPick: null,
            matchScore: {
                A: 0,
                B: 0,
            },
            playedMaps: [],
            matchWinner: null,
        };
    }

    public async init() {
        // FIXME: Make proper mappool finder
        this.controllerContext.availableMappools = (
            await prisma.mappool.findMany()
        ).slice(0, env.MATCH_MAP_POOLS);
    }

    public makeRolls() {
        const rollA = Math.round(Math.random() * 100);
        const rollB = Math.round(Math.random() * 100);

        this.controllerContext.rollWinnerTeam =
            rollA > rollB ? this.matchData.teamA : this.matchData.teamB;

        this.controllerContext.rollResults = {
            A: rollA,
            B: rollB,
        };
    }

    public banPool(captainId: string, id: number) {
        const expectedId =
            this.controllerContext.currentTurnTeam.players[0]?.discordId;

        if (captainId !== expectedId) {
            throw new Error(
                `You are not captain of team **${this.controllerContext.currentTurnTeam.name}**`,
            );
        }

        this.controllerContext.availableMappools =
            this.controllerContext.availableMappools.filter(
                (pool) => pool.id !== id,
            );
        this.switchTurn();
    }

    public setPool(
        mappool: MappoolGetPayload<{
            include: { entries: { include: { map: true } } };
        }>,
    ) {
        this.controllerContext.currentMappool = mappool;
        this.controllerContext.availableMaps = this.sortMods(
            mappool.entries.filter((entry) => entry.mod !== "TB"),
        );
    }

    /**
     *
     * @param mod Mod with index (e.g. "HD2")
     */
    public banMap(captainId: string, mod: string, isOsu?: boolean) {
        const expectedId = isOsu
            ? this.controllerContext.currentTurnTeam.players[0]?.id.toString()
            : this.controllerContext.currentTurnTeam.players[0]?.discordId;

        if (captainId !== expectedId) {
            throw new Error(
                `You are not captain of team **${this.controllerContext.currentTurnTeam.name}**`,
            );
        }

        const mapToBan = this.controllerContext.availableMaps.find(
            (entry) => `${entry.mod}${entry.modIndex}` === mod,
        );

        if (!mapToBan) throw new Error("Map was not found");

        this.controllerContext.availableMaps =
            this.controllerContext.availableMaps.filter(
                (entry) => entry.id !== mapToBan.id,
            );
        this.controllerContext.bannedMaps.push({
            bannedBy: this.controllerContext.currentTurnTeam,
            entry: mapToBan,
        });
        this.switchTurn();
    }

    /**
     *
     * @param mod Mod with index (e.g. "HD2")
     */
    public pickMap(captainId: string, mod: string, isOsu?: boolean) {
        const expectedId = isOsu
            ? this.controllerContext.currentTurnTeam.players[0]?.id.toString()
            : this.controllerContext.currentTurnTeam.players[0]?.discordId;

        if (captainId !== expectedId) {
            throw new Error(
                `You are not captain of team **${this.controllerContext.currentTurnTeam.name}**`,
            );
        }

        const mapToPick = this.controllerContext.availableMaps.find(
            (entry) => `${entry.mod}${entry.modIndex}` === mod,
        );

        if (!mapToPick) throw new Error("Map was not found");

        this.controllerContext.availableMaps =
            this.controllerContext.availableMaps.filter(
                (entry) => entry.id !== mapToPick.id,
            );
        this.controllerContext.pickedMaps.push({
            pickedBy: this.controllerContext.currentTurnTeam,
            entry: mapToPick,
        });
        this.controllerContext.currentPick = mapToPick;
        this.switchTurn();
    }

    public setTurn(teamId: TeamId) {
        if (teamId === "A")
            this.controllerContext.currentTurnTeam = this.matchData.teamA;
        else this.controllerContext.currentTurnTeam = this.matchData.teamB;
    }

    public getMapWinner(scoreA: number, scoreB: number) {
        if (!this.controllerContext.currentPick)
            throw new Error("Map not found!");

        this.controllerContext.matchScore[scoreA > scoreB ? "A" : "B"]++;

        this.controllerContext.playedMaps.push({
            scoreA,
            scoreB,
            entry: this.controllerContext.currentPick,
        });

        return scoreA > scoreB ? this.matchData.teamA : this.matchData.teamB;
    }

    private switchTurn() {
        if (
            this.controllerContext.currentTurnTeam.id ===
            this.matchData.teamA.id
        ) {
            this.controllerContext.currentTurnTeam = this.matchData.teamB;
        } else {
            this.controllerContext.currentTurnTeam = this.matchData.teamA;
        }
    }

    setWinner(team: Team) {
        this.controllerContext.matchWinner = team;
    }

    public async start() {
        log.info("STARTING MATCH");
        return;
    }

    public get context() {
        const context = this.controllerContext;

        const entries = context.currentMappool?.entries;
        if (!entries) return context;

        const sortedEntries = this.sortMods([...entries]);

        return {
            ...context,
            currentMappool: {
                ...context.currentMappool,
                entries: sortedEntries,
            },
        };
    }

    private sortMods(arr: PoolEntryGetPayload<{ include: { map: true } }>[]) {
        const modOrder = ["NM", "HD", "HR", "DT", "FM"];
        return arr.sort((a, b) => {
            if (a.mod === "TB" && b.mod !== "TB") return 1;
            if (b.mod === "TB" && a.mod !== "TB") return -1;

            const aIndex = modOrder.indexOf(a.mod);
            const bIndex = modOrder.indexOf(b.mod);

            const aKnown = aIndex !== -1;
            const bKnown = bIndex !== -1;

            if (aKnown && bKnown && aIndex !== bIndex) {
                return aIndex - bIndex;
            }

            if (aKnown && !bKnown) return -1;
            if (!aKnown && bKnown) return 1;

            return (a.modIndex ?? 0) - (b.modIndex ?? 0);
        });
    }
}
