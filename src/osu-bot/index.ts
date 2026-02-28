import { BanchoClient } from "bancho.js";
import { API } from "osu-api-v2-js";
import { env } from "../config/env.js";
import { osuLogger } from "../shared/logger.js";

export const clientV2 = new API(
    env.OSU_BOT_CLIENT_ID,
    env.OSU_BOT_CLIENT_SECRET,
);

export const client = new BanchoClient({
    username: env.OSU_BOT_USERNAME.replaceAll(" ", "_"),
    password: env.OSU_IRC_PASSWORD,
    apiKey: env.OSU_IRC_API_KEY,
});

client.once("connected", () => {
    osuLogger.info("osu! IRC connected");
});

client.on("error", (err: Error) => {
    osuLogger.error({ err }, "osu! IRC error");
});

// Comma-separated list of osu! user IDs to add as lobby referees.
// Configured via OSU_BOT_REFS in .env.
export const refIds: number[] = env.OSU_BOT_REFS
    ? env.OSU_BOT_REFS.split(",")
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n))
    : [];

export async function init() {
    await client.connect();
}
