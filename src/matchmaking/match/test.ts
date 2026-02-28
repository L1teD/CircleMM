import { CategoryChannel, Client, Events, GatewayIntentBits } from "discord.js";
import { env } from "../../config/env";
import type { UserWithDiscord } from "../../discord-bot/templates/ComponentEvent";
import { prisma } from "../../shared/prisma";
import { createTeam } from "../team";
import { MatchRuntime } from "./MatchRuntime";
import { discordLogger, osuLogger } from "../../shared/logger";
import { BanchoClient } from "bancho.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (ready) => {
    discordLogger.info(`Connected! Logged in as ${ready.user.tag}`);
});

export const osuClient = new BanchoClient({
    username: env.OSU_BOT_USERNAME.replaceAll(" ", "_"),
    password: env.OSU_IRC_PASSWORD,
    apiKey: env.OSU_IRC_API_KEY,
    botAccount: true,
});

osuClient.once("connected", () => {
    osuLogger.info("osu! IRC connected");
});

osuClient.on("error", (err: Error) => {
    osuLogger.error(
        { err, connected: osuClient.isConnected() },
        "osu! IRC error",
    );
    if (osuClient.isDisconnected()) osuClient.connect();
});

await Promise.all([osuClient.connect(), client.login(env.DISCORD_BOT_TOKEN)]);

const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID);

const worst_player_fr = (await prisma.user.findUnique({
    where: {
        id: 16160448,
    },
})) as UserWithDiscord;

const evlopmiy = (await prisma.user.findUnique({
    where: {
        id: 12885735,
    },
})) as UserWithDiscord;

if (!worst_player_fr || !evlopmiy || !guild) throw new Error("lol");

guild.channels.cache.forEach(async (ch) => {
    const match = ch.name.match(
        /^match-[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/,
    );

    if (!match) return;
    const category = ch as CategoryChannel;

    await Promise.all(
        guild.channels.cache
            .filter((ch) => ch.parentId === category.id)
            .map((ch) => ch.delete()),
    );
    await category.delete();
});

const teamA = createTeam([worst_player_fr], worst_player_fr.name);
const teamB = createTeam([evlopmiy], evlopmiy.name);

const match = new MatchRuntime(
    {
        teamA,
        teamB,
        bestOf: 7,
        id: crypto.randomUUID(),
    },
    guild,
    osuClient,
);
match.start();
