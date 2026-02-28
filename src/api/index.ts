import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fastifyOauth2 from "@fastify/oauth2";
import { env } from "../config/env.js";
import { generateState, parseState } from "./authState.js";
import type { User } from "osu-api-v2-js";
import { prisma } from "../shared/prisma.js";
import { publishEvent } from "../shared/redis.js";
import { apiLogger } from "../shared/logger.js";

const fastify = Fastify({
    logger: {
        level: env.LOG_LEVEL,
        transport: { target: "pino-pretty", options: { colorize: true } },
    },
});

await fastify.register(fastifyWebsocket);

// @ts-expect-error — @fastify/oauth2 types do not align exactly with Fastify v5
fastify.register(fastifyOauth2, {
    name: "osuOAuth2",
    credentials: {
        client: {
            id: env.OSU_BOT_CLIENT_ID.toString(),
            secret: env.OSU_BOT_CLIENT_SECRET,
        },
        auth: {
            authorizeHost: "https://osu.ppy.sh",
            authorizePath: "/oauth/authorize",
            tokenHost: "https://osu.ppy.sh",
            tokenPath: "/oauth/token",
        },
    },
    callbackUri: `${env.FASTIFY_HOST}/auth/callback/osu`,
    scope: ["identify"],
    startRedirectPath: "/login/osu",
    generateStateFunction: (request: { body?: { discordId?: string } }) => {
        const discordId = request.body?.discordId ?? "unknown";
        return generateState(discordId);
    },
    checkStateFunction: (_request: unknown, callback: () => void) => {
        callback();
    },
});

// ─────────────────────────────────────────────────────────────────────────────
//  osu! OAuth
// ─────────────────────────────────────────────────────────────────────────────

fastify.post("/auth/osu/link", async (request, reply) => {
    const discordId = (request.body as { discordId?: string }).discordId;
    if (!discordId) {
        return reply.status(400).send({ error: "Missing discordId" });
    }

    const loginUrl = await fastify.oauth2OsuOAuth2?.generateAuthorizationUri(
        request,
        reply,
    );
    return { url: loginUrl };
});

fastify.get("/auth/callback/osu", async (request, reply) => {
    try {
        const { state } = request.query as { state: string };
        const { discordId } = parseState(state);

        const token =
            await fastify.oauth2OsuOAuth2?.getAccessTokenFromAuthorizationCodeFlow(
                request,
            );
        if (!token) throw new Error("Token exchange failed");

        const osuUser = (await fetch("https://osu.ppy.sh/api/v2/me", {
            headers: { Authorization: `Bearer ${token.token.access_token}` },
        }).then((r) => r.json())) as User;

        await prisma.$transaction(async (tx) => {
            const existing = await tx.user.findUnique({
                where: { id: osuUser.id },
            });

            if (!existing) {
                return tx.user.create({
                    data: { id: osuUser.id, discordId, name: osuUser.username },
                });
            }
            if (existing.discordId === null) {
                return tx.user.update({
                    where: { id: osuUser.id },
                    data: { discordId },
                });
            }
            return existing;
        });

        await publishEvent({
            type: "USER_LINKED",
            payload: { discordId, username: osuUser.username },
        });

        return reply.type("text/html").send(`
            <html><body>
                <h1>✅ Your Discord account is now linked to osu!</h1>
                <p>You can close this window.</p>
                <script>window.close();</script>
            </body></html>
        `);
    } catch (err) {
        apiLogger.error({ err }, "osu! OAuth callback failed");
        return reply.status(500).send({ error: "Internal error" });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
//  Health check
// ─────────────────────────────────────────────────────────────────────────────

fastify.get("/", (_request, reply) => {
    return reply.send({ status: "ok" });
});

export async function init() {
    await fastify.listen({ port: env.FASTIFY_PORT, host: "0.0.0.0" });
    apiLogger.info({ port: env.FASTIFY_PORT }, "API server started");
}
