import * as discord from "./discord-bot/index.js";
import * as osu from "./osu-bot/index.js";
import * as api from "./api/index.js";

import { logger } from "./shared/logger.js";
import { Queue, type QueueEntry } from "./matchmaking/queue.js";
import { Matchmaker } from "./matchmaking/matchmaker.js";
import { TextChannel } from "discord.js";
import { env } from "./config/env.js";
import { ColorPalette } from "./discord-bot/utils/ColorPalette.js";
import { MatchRuntime } from "./matchmaking/match/MatchRuntime.js";
import { osuClient } from "./matchmaking/match/test.js";

// ── Queue singletons ───────────────────────────────────────────────────────────
export const queue1v1 = new Queue("1v1");
export const queue2v2 = new Queue("2v2");

// ── Matchmaker singletons ─────────────────────────────────────────────────────
export const matchmaker1v1 = new Matchmaker(queue1v1);
export const matchmaker2v2 = new Matchmaker(queue2v2);

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
    // Initialise all three services in parallel.
    await Promise.all([discord.init(), osu.init(), api.init()]);
    logger.info("All services ready");

    const guild = discord.client.guilds.cache.get(env.DISCORD_GUILD_ID);
    if (!guild)
        throw new Error(`Discord guild ${env.DISCORD_GUILD_ID} not found`);

    const queueSpam = guild.channels.cache.get(
        env.DISCORD_CHANNEL_QUEUE_SPAM,
    ) as TextChannel | undefined;

    // ── Queue spam notifications ───────────────────────────────────────────────

    function makeQueueNotifier(mode: "1v1" | "2v2") {
        return async (event: "join" | "leave", entry: QueueEntry) => {
            if (!queueSpam?.isSendable()) return;
            const mentions = entry.players
                .map((p) => `<@${p.discordId}>`)
                .join(", ");
            await queueSpam
                .send({
                    embeds: [
                        {
                            description:
                                event === "join"
                                    ? `✅ ${mentions} joined the **${mode}** queue`
                                    : `❌ ${mentions} left the **${mode}** queue`,
                            color:
                                event === "join"
                                    ? ColorPalette.SUCCESS
                                    : ColorPalette.DANGER,
                            timestamp: new Date().toISOString(),
                        },
                    ],
                })
                .catch((err) =>
                    logger.error({ err }, "Failed to send queue notification"),
                );
        };
    }

    queue1v1.setOnNotify(makeQueueNotifier("1v1"));
    queue2v2.setOnNotify(makeQueueNotifier("2v2"));

    // ── Queue voice channel counters ───────────────────────────────────────────

    function makeQueueChangeHandler(mode: "1v1" | "2v2", channelId: string) {
        return (queue: QueueEntry[]) => {
            const channel = discord.client.channels.cache.get(channelId);
            if (channel?.isVoiceBased()) {
                const playerCount = queue.reduce(
                    (s, e) => s + e.players.length,
                    0,
                );
                channel
                    .setName(`[${mode}] Players: ${playerCount}`)
                    .catch((err) =>
                        logger.error(
                            { err, mode },
                            "Failed to update queue channel name",
                        ),
                    );
            }
        };
    }

    queue1v1.setOnChange(
        makeQueueChangeHandler("1v1", env.DISCORD_CHANNEL_QUEUE_1v1),
    );
    queue2v2.setOnChange(
        makeQueueChangeHandler("2v2", env.DISCORD_CHANNEL_QUEUE_2v2),
    );

    // ── Wire matchmakers ───────────────────────────────────────────────────────

    matchmaker1v1.setOnFound((teamA, teamB) => {
        const match = new MatchRuntime(
            {
                id: crypto.randomUUID(),
                teamA,
                teamB,
                bestOf: env.MATCH_BEST_OF_1v1,
            },
            guild,
            osuClient,
        );

        match.start();
    });

    matchmaker2v2.setOnFound((teamA, teamB) => {
        const match = new MatchRuntime(
            {
                id: crypto.randomUUID(),
                teamA,
                teamB,
                bestOf: env.MATCH_BEST_OF_1v1,
            },
            guild,
            osuClient,
        );

        match.start();
    });

    matchmaker1v1.startMatchmaking();
    matchmaker2v2.startMatchmaking();
}

await main().catch((err) => {
    logger.fatal({ err }, "Fatal error in main()");
    process.exit(1);
});
