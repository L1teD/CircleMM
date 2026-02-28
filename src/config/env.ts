import { type Level } from "pino";
import { z } from "zod";

// All tunable runtime parameters live here.
// Every value must be documented and have a sensible default where applicable.
const envSchema = z.object({
    // ── Discord ───────────────────────────────────────────────────────────────
    DISCORD_BOT_TOKEN: z.string().min(1).readonly(),
    DISCORD_BOT_CLIENT_ID: z.string().min(1).readonly(),
    DISCORD_BOT_OWNER_ID: z.string().min(1).readonly(),
    DISCORD_GUILD_ID: z.string().min(1).readonly(),

    // Channel where the "open lobby" panel lives.
    DISCORD_CHANNEL_MATCH_SETUP: z.string().min(1).readonly(),
    // Channel where match-found announcements are posted.
    DISCORD_CHANNEL_SEARCH_OUTPUT: z.string().min(1).readonly(),
    // Voice channel used as a 1v1 queue counter.
    DISCORD_CHANNEL_QUEUE_1v1: z.string().min(1).readonly(),
    // Voice channel used as a 2v2 queue counter.
    DISCORD_CHANNEL_QUEUE_2v2: z.string().min(1).readonly(),
    // Spam channel for join/leave queue notifications.
    DISCORD_CHANNEL_QUEUE_SPAM: z.string().min(1).readonly(),
    // Channel where osu! lobby invite accept/decline messages are posted.
    DISCORD_CHANNEL_INVITES: z.string().min(1).readonly(),

    DISCORD_BOT_REGISTER_ON_START: z.stringbool().default(false).readonly(),

    // ── osu! ─────────────────────────────────────────────────────────────────
    OSU_BOT_USERNAME: z.string().min(1).readonly(),
    OSU_IRC_PASSWORD: z.string().min(1).readonly(),
    OSU_IRC_API_KEY: z.string().min(1).readonly(),
    OSU_BOT_CLIENT_ID: z.coerce.number().readonly(),
    OSU_BOT_CLIENT_SECRET: z.string().min(1).readonly(),
    OSU_BOT_PREFIX: z.string().min(1).readonly(),
    OSU_STATE_SECRET: z.string().min(1),

    // Comma-separated osu! user IDs added as lobby referees via !mp addref.
    // Example: "12345,67890"
    OSU_BOT_REFS: z.string().default("").readonly(),

    // ── Match settings ────────────────────────────────────────────────────────
    // Best-of format for 1v1 matches (e.g. 7 → first to 4 wins).
    MATCH_BEST_OF_1v1: z.coerce.number().int().positive().default(7),
    // Best-of format for 2v2 matches.
    MATCH_BEST_OF_2v2: z.coerce.number().int().positive().default(9),
    // Time in ms before a ready-check expires and the match is cancelled.
    MATCH_READY_CHECK_TIMEOUT_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(90_000),
    // Time in ms allowed per ban/pick action before auto-forfeit.
    MATCH_PHASE_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000),
    // Time in ms between re-invite attempts for players not yet in the lobby.
    MATCH_LOBBY_INVITE_INTERVAL_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(30_000),
    // Time in ms before a closing lobby is force-closed.
    MATCH_LOBBY_CLOSE_TIMEOUT_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(180_000),
    // Maximum match lifetime in ms. Match is auto-cancelled after this.
    MATCH_MAX_LIFETIME_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(7_200_000),
    // Time in ms to wait for a reconnect when an entire team leaves the lobby.
    MATCH_TEAM_REJOIN_TIMEOUT_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(30_000),
    // Time in ms players have to abort a map after it starts.
    MATCH_ABORT_WINDOW_MS: z.coerce.number().int().positive().default(30_000),
    // Time in ms for TB decision (play for fun or skip) after match ends.
    MATCH_TB_DECISION_TIMEOUT_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(30_000),
    // Time in ms before the Discord category is deleted after match end.
    MATCH_CLEANUP_DELAY_MS: z.coerce.number().int().positive().default(30_000),
    // Time in ms players have before map starts.
    MATCH_WAITING_FOR_PLAYERS_READY_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(120_000),
    // Number of map bans each team gets.
    MATCH_MAP_BANS: z.coerce.number().int().positive().default(4),
    /** Number of mappools for players to ban. */
    MATCH_MAP_POOLS: z.coerce.number().int().positive().default(8),

    // ── Matchmaking settings ──────────────────────────────────────────────────
    // Base Elo tolerance window when two entries first enter the queue.
    MM_BASE_TOLERANCE: z.coerce.number().int().positive().default(100),
    // Maximum Elo tolerance window after prolonged wait.
    MM_MAX_TOLERANCE: z.coerce.number().int().positive().default(300),
    // How much the tolerance grows every 10 seconds of waiting.
    MM_TOLERANCE_GROWTH_PER_10S: z.coerce.number().int().positive().default(50),
    // How often the matchmaker scans the queue (ms).
    MM_SCAN_INTERVAL_MS: z.coerce.number().int().positive().default(1_000),

    // ── Elo settings ──────────────────────────────────────────────────────────
    // Starting Elo for new players.
    ELO_DEFAULT: z.coerce.number().int().positive().default(1000),
    // K-factor used during calibration (first N matches).
    ELO_K_FACTOR_CALIBRATION: z.coerce.number().int().positive().default(40),
    // K-factor for players below ELO_THRESHOLD_HIGH.
    ELO_K_FACTOR_NORMAL: z.coerce.number().int().positive().default(20),
    // K-factor for high-rated players (above ELO_THRESHOLD_HIGH).
    ELO_K_FACTOR_HIGH: z.coerce.number().int().positive().default(10),
    // How many matches count as "calibration" for K=40.
    ELO_CALIBRATION_MATCHES: z.coerce.number().int().positive().default(10),
    // Elo above which K-factor drops to ELO_K_FACTOR_HIGH.
    ELO_THRESHOLD_HIGH: z.coerce.number().int().positive().default(2000),

    // ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_HOST: z.string().default("127.0.0.1"),
    REDIS_PORT: z.coerce.number().int().positive().default(6379),
    REDIS_PASSWORD: z.string().optional(),

    // ── API ───────────────────────────────────────────────────────────────────
    FASTIFY_PORT: z.coerce.number().default(3000).readonly(),
    FASTIFY_HOST: z.url().readonly(),

    // ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: z.url().readonly(),

    // ── Logging ───────────────────────────────────────────────────────────────
    LOG_LEVEL: z.custom<Level>(),
});

export const env = envSchema.parse(process.env);
