import { env } from "../config/env.js";
import { mmLogger } from "../shared/logger.js";
import type { Queue, QueueEntry } from "./queue.js";
import type { UserWithDiscord } from "../discord-bot/templates/ComponentEvent.js";

export interface VirtualTeam {
    sourceEntries: QueueEntry[];
    players: UserWithDiscord[];
    avgElo: number;
    joinedAt: Date;
}

export type OnMatchFound = (
    teamA: QueueEntry,
    teamB: QueueEntry,
) => Promise<void> | void;

export class Matchmaker {
    private readonly queue: Queue;
    private working = false;
    private scanTimer?: ReturnType<typeof setInterval>;
    private onFound?: OnMatchFound;

    private readonly baseTolerance: number;
    private readonly maxTolerance: number;
    private readonly growthPer10s: number;

    constructor(queue: Queue, onFound?: OnMatchFound) {
        this.queue = queue;
        this.onFound = onFound;
        this.baseTolerance = env.MM_BASE_TOLERANCE;
        this.maxTolerance = env.MM_MAX_TOLERANCE;
        this.growthPer10s = env.MM_TOLERANCE_GROWTH_PER_10S;
    }

    public setOnFound(onFound: OnMatchFound): void {
        this.onFound = onFound;
    }

    public startMatchmaking(): void {
        if (this.working) return;
        this.working = true;
        mmLogger.info({ mode: this.queue.mode }, "Matchmaking scan started");

        this.scanTimer = setInterval(() => {
            this.findMatches().catch((err) =>
                mmLogger.error({ err }, "Matchmaking scan error"),
            );
        }, env.MM_SCAN_INTERVAL_MS);
    }

    public stopMatchmaking(): void {
        if (this.scanTimer) {
            clearInterval(this.scanTimer);
            this.scanTimer = undefined;
        }
        this.working = false;
    }

    // ─── Core logic ──────────────────────────────────────────────────────────────

    private async findMatches(): Promise<void> {
        const rawQueue = await this.queue.getRawQueue();
        const sorted = rawQueue.sort(
            (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime(),
        );

        if (this.queue.mode === "1v1") {
            await this.pair1v1(sorted);
        } else {
            await this.pair2v2(sorted);
        }
    }

    private async pair1v1(entries: QueueEntry[]): Promise<void> {
        const matched = new Set<string>();

        for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            if (!e || matched.has(e.id)) continue;

            for (let j = i + 1; j < entries.length; j++) {
                const e2 = entries[j];
                if (!e2 || matched.has(e2.id)) continue;

                if (this.areEntriesCompatible(e, e2)) {
                    matched.add(e.id);
                    matched.add(e2.id);
                    await this.queue.removeTeam(e.id);
                    await this.queue.removeTeam(e2.id);
                    await this.onFound?.(e, e2);
                    break;
                }
            }
        }
    }

    // Builds all valid virtual teams from solo-queued entries (for 2v2).
    // A virtual team in 2v2 is exactly 2 players: one 2-player entry OR
    // two separate 1-player entries.
    private buildVirtualTeams(entries: QueueEntry[]): VirtualTeam[] {
        const teams: VirtualTeam[] = [];

        for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            if (!e) continue;

            if (e.players.length === 2) {
                teams.push({
                    sourceEntries: [e],
                    players: e.players,
                    avgElo: Matchmaker.getAverageTeamElo(e),
                    joinedAt: e.joinedAt,
                });
            } else if (e.players.length === 1) {
                for (let j = i + 1; j < entries.length; j++) {
                    const e2 = entries[j];
                    if (!e2 || e2.players.length !== 1) continue;
                    const combined = [...e.players, ...e2.players];
                    teams.push({
                        sourceEntries: [e, e2],
                        players: combined,
                        avgElo:
                            combined.reduce((s, p) => s + p.elo, 0) /
                            combined.length,
                        joinedAt: new Date(
                            Math.min(
                                e.joinedAt.getTime(),
                                e2.joinedAt.getTime(),
                            ),
                        ),
                    });
                }
            }
        }

        return teams;
    }

    private async pair2v2(entries: QueueEntry[]): Promise<void> {
        const virtualTeams = this.buildVirtualTeams(entries);
        const usedEntryIds = new Set<string>();

        for (let i = 0; i < virtualTeams.length; i++) {
            const vtA = virtualTeams[i];
            if (!vtA || vtA.sourceEntries.some((e) => usedEntryIds.has(e.id)))
                continue;

            for (let j = i + 1; j < virtualTeams.length; j++) {
                const vtB = virtualTeams[j];
                if (!vtB) continue;
                const overlap =
                    vtB.sourceEntries.some((e) => usedEntryIds.has(e.id)) ||
                    vtB.sourceEntries.some((e) =>
                        vtA.sourceEntries.some((ea) => ea.id === e.id),
                    );
                if (overlap) continue;

                if (this.areVirtualTeamsCompatible(vtA, vtB)) {
                    for (const e of [
                        ...vtA.sourceEntries,
                        ...vtB.sourceEntries,
                    ]) {
                        usedEntryIds.add(e.id);
                    }

                    const queueEntryA = this.virtualTeamToQueueEntry(vtA);
                    const queueEntryB = this.virtualTeamToQueueEntry(vtB);

                    for (const e of [
                        ...vtA.sourceEntries,
                        ...vtB.sourceEntries,
                    ]) {
                        await this.queue.removeTeam(e.id);
                    }

                    await this.onFound?.(queueEntryA, queueEntryB);
                    break;
                }
            }
        }
    }

    private virtualTeamToQueueEntry(vt: VirtualTeam): QueueEntry {
        return {
            id: crypto.randomUUID(),
            name: vt.players.map((p) => p.name).join(" & "),
            players: vt.players,
            joinedAt: vt.joinedAt,
            autoLeaveAt: 0,
        };
    }

    // ─── Compatibility ────────────────────────────────────────────────────────────

    private areEntriesCompatible(a: QueueEntry, b: QueueEntry): boolean {
        const eloA = Matchmaker.getAverageTeamElo(a);
        const eloB = Matchmaker.getAverageTeamElo(b);
        const avgWaitMs = (this.getWaitTime(a) + this.getWaitTime(b)) / 2;
        return Math.abs(eloA - eloB) <= this.getTolerance(avgWaitMs);
    }

    private areVirtualTeamsCompatible(a: VirtualTeam, b: VirtualTeam): boolean {
        const avgWaitMs =
            (Date.now() -
                a.joinedAt.getTime() +
                (Date.now() - b.joinedAt.getTime())) /
            2;
        return Math.abs(a.avgElo - b.avgElo) <= this.getTolerance(avgWaitMs);
    }

    private getWaitTime(entry: QueueEntry): number {
        return Date.now() - entry.joinedAt.getTime();
    }

    private getTolerance(waitMs: number): number {
        const extra = Math.floor(waitMs / 10_000) * this.growthPer10s;
        return Math.min(this.maxTolerance, this.baseTolerance + extra);
    }

    // ─── Static helpers ───────────────────────────────────────────────────────────

    public static getAverageTeamElo(team: QueueEntry): number {
        if (team.players.length === 0) return 0;
        return (
            team.players.reduce((s, p) => s + p.elo, 0) / team.players.length
        );
    }
}
