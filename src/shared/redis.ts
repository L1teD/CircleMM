import Redis from "ioredis";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

// ─────────────────────────────────────────────────────────────────────────────
//  Connection options
// ─────────────────────────────────────────────────────────────────────────────

const redisOptions = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    lazyConnect: false,
    retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2_000);
        logger.warn({ times, delay }, "[Redis] Reconnecting");
        return delay;
    },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
//  Instances — two separate connections are required because a Redis connection
//  that has called SUBSCRIBE cannot issue regular commands.
// ─────────────────────────────────────────────────────────────────────────────

export const redisPublisher = new Redis(redisOptions);
export const redisSubscriber = new Redis(redisOptions);

redisPublisher.on("connect", () => logger.info("[Redis] Publisher connected"));
redisPublisher.on("error", (err: Error) =>
    logger.error({ err }, "[Redis] Publisher error"),
);

redisSubscriber.on("connect", () =>
    logger.info("[Redis] Subscriber connected"),
);
redisSubscriber.on("error", (err: Error) =>
    logger.error({ err }, "[Redis] Subscriber error"),
);

// ─────────────────────────────────────────────────────────────────────────────
//  Internal routing
// ─────────────────────────────────────────────────────────────────────────────

type MessageHandler = (message: string) => void | Promise<void>;
type PatternHandler = (
    channel: string,
    message: string,
) => void | Promise<void>;

const channelHandlers = new Map<string, Set<MessageHandler>>();
const patternHandlers = new Map<string, Set<PatternHandler>>();

const subscribedChannels = new Set<string>();
const subscribedPatterns = new Set<string>();

redisSubscriber.on("message", (channel: string, message: string) => {
    const handlers = channelHandlers.get(channel);
    if (!handlers) return;
    for (const h of handlers) {
        Promise.resolve(h(message)).catch((err) =>
            logger.error({ err, channel }, "[Redis] message handler threw"),
        );
    }
});

redisSubscriber.on(
    "pmessage",
    (pattern: string, channel: string, message: string) => {
        const handlers = patternHandlers.get(pattern);
        if (!handlers) return;
        for (const h of handlers) {
            Promise.resolve(h(channel, message)).catch((err) =>
                logger.error(
                    { err, pattern, channel },
                    "[Redis] pmessage handler threw",
                ),
            );
        }
    },
);

// ─────────────────────────────────────────────────────────────────────────────
//  Subscribe helpers
// ─────────────────────────────────────────────────────────────────────────────

// Subscribes to an exact Redis channel. Multiple calls for the same channel
// share a single SUBSCRIBE command. Returns an unsubscribe function.
export async function subscribeToChannel(
    channel: string,
    handler: MessageHandler,
): Promise<() => void> {
    if (!channelHandlers.has(channel)) channelHandlers.set(channel, new Set());
    channelHandlers.get(channel)!.add(handler);

    if (!subscribedChannels.has(channel)) {
        await redisSubscriber.subscribe(channel).catch((err) => {
            logger.error({ err, channel }, "[Redis] SUBSCRIBE failed");
            throw err;
        });
        subscribedChannels.add(channel);
    }

    return () => channelHandlers.get(channel)?.delete(handler);
}

// Pattern-subscribes (PSUBSCRIBE). Returns an unsubscribe function.
export async function subscribeToPattern(
    pattern: string,
    handler: PatternHandler,
): Promise<() => void> {
    if (!patternHandlers.has(pattern)) patternHandlers.set(pattern, new Set());
    patternHandlers.get(pattern)!.add(handler);

    if (!subscribedPatterns.has(pattern)) {
        await redisSubscriber.psubscribe(pattern).catch((err) => {
            logger.error({ err, pattern }, "[Redis] PSUBSCRIBE failed");
            throw err;
        });
        subscribedPatterns.add(pattern);
    }

    return () => patternHandlers.get(pattern)?.delete(handler);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Typed general event bus (channel: "events")
// ─────────────────────────────────────────────────────────────────────────────

export type EventsMap = {
    USER_LINKED: { discordId: string; username: string };
    LOBBY_CREATED: { lobbyId: string; creatorId: string };
    MATCH_READY: { matchId: string; playerIds: string[] };
};

export type EventType = keyof EventsMap;

export interface EventMessage<T extends EventType = EventType> {
    type: T;
    payload: EventsMap[T];
}

const EVENTS_CHANNEL = "events";

// Publishes a typed event on the general "events" channel.
export async function publishEvent<T extends EventType>(
    event: EventMessage<T>,
): Promise<void> {
    await redisPublisher
        .publish(EVENTS_CHANNEL, JSON.stringify(event))
        .catch((err) => {
            logger.error({ err, event }, "[Redis] publishEvent failed");
            throw err;
        });
}

// Subscribes to a specific typed event on the general "events" channel.
export async function subscribeEvent<T extends EventType>(
    type: T,
    handler: (payload: EventsMap[T]) => void | Promise<void>,
): Promise<() => void> {
    return subscribeToChannel(EVENTS_CHANNEL, (raw) => {
        let event: EventMessage;
        try {
            event = JSON.parse(raw) as EventMessage;
        } catch (err) {
            logger.error({ err, raw }, "[Redis] Failed to parse event message");
            return;
        }
        if (event.type !== type) return;
        return handler(event.payload as EventsMap[T]);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Typed match-channel helpers (channel: "match:{matchId}")
// ─────────────────────────────────────────────────────────────────────────────

// Subscribes to all events for a specific match. Returns an unsubscribe function.
export async function subscribeMatchChannel<TEvent>(
    matchId: string,
    handler: (event: TEvent) => void | Promise<void>,
): Promise<() => void> {
    return subscribeToChannel(`match:${matchId}`, (raw) => {
        let event: TEvent;
        try {
            event = JSON.parse(raw) as TEvent;
        } catch (err) {
            logger.error(
                { err, raw, matchId },
                "[Redis] Failed to parse match event",
            );
            return;
        }
        return handler(event);
    });
}

// Pattern-subscribes to all match channels ("match:*").
// Used by services that need events from every active match (bots, WS API).
export async function subscribeAllMatchChannels<TEvent>(
    handler: (matchId: string, event: TEvent) => void | Promise<void>,
): Promise<() => void> {
    return subscribeToPattern("match:*", (channel, raw) => {
        const matchId = channel.slice("match:".length);
        let event: TEvent;
        try {
            event = JSON.parse(raw) as TEvent;
        } catch (err) {
            logger.error(
                { err, raw, channel },
                "[Redis] Failed to parse match event (pattern)",
            );
            return;
        }
        return handler(matchId, event);
    });
}
