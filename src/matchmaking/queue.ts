import { mmLogger } from "../shared/logger.js";
import { redisPublisher, subscribeToChannel } from "../shared/redis.js";
import type { Team } from "./team.js";

export interface QueueEntry extends Team {
    joinedAt: Date;
    // Unix timestamp (seconds) when this entry auto-expires, or 0 for never.
    autoLeaveAt: number;
}

export type QueueMode = "1v1" | "2v2";

type QueueChangeCallback = (queue: QueueEntry[]) => void;
type QueueNotifyCallback = (
    event: "join" | "leave",
    entry: QueueEntry,
) => Promise<void> | void;

export class Queue {
    private readonly listKey: string;
    private readonly playersKey: string;
    private readonly eventsChannel: string;

    public readonly mode: QueueMode;

    private onChange?: QueueChangeCallback;
    private onNotify?: QueueNotifyCallback;
    private autoLeaveTimer?: ReturnType<typeof setInterval>;

    constructor(mode: QueueMode) {
        this.mode = mode;
        this.listKey = `matchmaking:queue:${mode}:list`;
        this.playersKey = `matchmaking:queue:${mode}:players`;
        this.eventsChannel = `matchmaking:queue:${mode}:events`;

        this.initSubscriber().catch((err) =>
            mmLogger.error({ err, mode }, "Queue subscriber init failed"),
        );
        this.startAutoLeaveTimer();
    }

    public setOnChange(onChange: QueueChangeCallback): void {
        this.onChange = onChange;
    }

    public setOnNotify(onNotify: QueueNotifyCallback): void {
        this.onNotify = onNotify;
    }

    // ─── Internal ──────────────────────────────────────────────────────────────

    private async initSubscriber(): Promise<void> {
        await subscribeToChannel(this.eventsChannel, async () => {
            try {
                const queue = await this.getRawQueue();
                this.onChange?.(queue);
            } catch (err) {
                mmLogger.error(
                    { err, mode: this.mode },
                    "Queue onChange callback failed",
                );
            }
        });
    }

    private async publishChange(): Promise<void> {
        await redisPublisher
            .publish(this.eventsChannel, "update")
            .catch((err) => {
                mmLogger.error(
                    { err, mode: this.mode },
                    "Queue publishChange failed",
                );
                throw err;
            });
    }

    private teamKey(teamId: string): string {
        return `matchmaking:queue:team:${teamId}`;
    }

    private serialize(entry: QueueEntry): string {
        return JSON.stringify(entry);
    }

    private deserialize(raw: string): QueueEntry {
        const parsed = JSON.parse(raw) as QueueEntry;
        parsed.joinedAt = new Date(parsed.joinedAt);
        return parsed;
    }

    private startAutoLeaveTimer(): void {
        this.autoLeaveTimer = setInterval(async () => {
            try {
                const queue = await this.getRawQueue();
                const now = Math.floor(Date.now() / 1000);
                for (const entry of queue) {
                    if (entry.autoLeaveAt > 0 && now >= entry.autoLeaveAt) {
                        mmLogger.info(
                            { teamId: entry.id, mode: this.mode },
                            "Auto-leaving queue entry",
                        );
                        await this.removeTeam(entry.id);
                    }
                }
            } catch (err) {
                mmLogger.error(
                    { err, mode: this.mode },
                    "Auto-leave timer error",
                );
            }
        }, 10_000);
    }

    // ─── Public API ──────────────────────────────────────────────────────────────

    // Adds a team to the queue. Throws if any player is already queued or in a match.
    async addTeam(team: Team, autoLeaveMinutes: number): Promise<void> {
        // Guard: no player may queue while already queued.
        for (const player of team.players) {
            const inQueue = await this.isPlayerInQueue(player.discordId);
            if (inQueue) {
                throw new Error(
                    `Player ${player.discordId} is already in the ${this.mode} queue`,
                );
            }
        }

        const autoLeaveAt =
            autoLeaveMinutes > 0
                ? Math.floor(Date.now() / 1000) + autoLeaveMinutes * 60
                : 0;

        const entry: QueueEntry = {
            ...team,
            joinedAt: new Date(),
            autoLeaveAt,
        };

        const pipeline = redisPublisher.pipeline();
        pipeline.rpush(this.listKey, entry.id);
        pipeline.set(this.teamKey(entry.id), this.serialize(entry));
        pipeline.sadd(this.playersKey, ...team.players.map((p) => p.discordId));
        await pipeline.exec().catch((err) => {
            mmLogger.error(
                { err, teamId: entry.id },
                "addTeam pipeline failed",
            );
            throw err;
        });

        await this.publishChange();
        this.onNotify?.("join", entry)?.catch?.((err) =>
            mmLogger.error({ err }, "onNotify(join) failed"),
        );

        mmLogger.info(
            { teamId: entry.id, mode: this.mode },
            "Team added to queue",
        );
    }

    async removeTeam(teamId: string): Promise<void> {
        const raw = await redisPublisher
            .get(this.teamKey(teamId))
            .catch((err) => {
                mmLogger.error({ err, teamId }, "removeTeam GET failed");
                throw err;
            });

        if (!raw) {
            mmLogger.warn({ teamId }, "removeTeam: entry not found");
            return;
        }

        const entry = this.deserialize(raw);

        const pipeline = redisPublisher.pipeline();
        pipeline.lrem(this.listKey, 0, teamId);
        pipeline.del(this.teamKey(teamId));
        pipeline.srem(
            this.playersKey,
            ...entry.players.map((p) => p.discordId),
        );
        await pipeline.exec().catch((err) => {
            mmLogger.error({ err, teamId }, "removeTeam pipeline failed");
            throw err;
        });

        await this.publishChange();
        this.onNotify?.("leave", entry)?.catch?.((err) =>
            mmLogger.error({ err }, "onNotify(leave) failed"),
        );

        mmLogger.info({ teamId, mode: this.mode }, "Team removed from queue");
    }

    async removeTeamByPlayerDiscordId(discordId: string): Promise<void> {
        const queue = await this.getRawQueue();
        const entry = queue.find((e) =>
            e.players.some((p) => p.discordId === discordId),
        );
        if (entry) await this.removeTeam(entry.id);
    }

    async isPlayerInQueue(discordId: string): Promise<boolean> {
        const result = await redisPublisher
            .sismember(this.playersKey, discordId)
            .catch((err) => {
                mmLogger.error(
                    { err, discordId },
                    "isPlayerInQueue SISMEMBER failed",
                );
                throw err;
            });
        return result === 1;
    }

    async getRawQueue(): Promise<QueueEntry[]> {
        const ids = await redisPublisher
            .lrange(this.listKey, 0, -1)
            .catch((err) => {
                mmLogger.error({ err }, "getRawQueue LRANGE failed");
                throw err;
            });

        if (ids.length === 0) return [];

        const raws = await redisPublisher
            .mget(...ids.map((id) => this.teamKey(id)))
            .catch((err) => {
                mmLogger.error({ err }, "getRawQueue MGET failed");
                throw err;
            });

        return raws
            .filter((r): r is string => r !== null)
            .map((r) => this.deserialize(r));
    }

    destroy(): void {
        if (this.autoLeaveTimer) {
            clearInterval(this.autoLeaveTimer);
            this.autoLeaveTimer = undefined;
        }
    }
}
