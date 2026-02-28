import pino from "pino";
import { env } from "../config/env.js";

// Root logger. All child loggers should be derived from this instance.
export const logger = pino({
    level: env.LOG_LEVEL,
    transport: { target: "pino-pretty", options: { colorize: true } },
});

export const discordLogger = logger.child({}, { msgPrefix: "[Discord] " });
export const osuLogger = logger.child({}, { msgPrefix: "[osu!] " });
export const apiLogger = logger.child({}, { msgPrefix: "[API] " });
export const mmLogger = logger.child({}, { msgPrefix: "[MM] " });
