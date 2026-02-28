import { fromPromise } from "xstate";
import type { MatchHandlerContext } from "./types";
import { userMention, ButtonBuilder, ButtonStyle } from "discord.js";
import { env } from "../../../config/env";

export function createConfirmPlayersHandler(ctx: MatchHandlerContext) {
    const { refs, matchData } = ctx;
    return fromPromise(async () => {
        if (!refs.controlChannel)
            throw new Error("Control channel was not found!");

        const readyPlayersMap = new Map(
            [...matchData.teamA.players, ...matchData.teamB.players].map(
                (player) => [player.discordId, false],
            ),
        );

        const timeoutMs = env.MATCH_READY_CHECK_TIMEOUT_MS;
        const expiresAt = Math.floor((Date.now() + timeoutMs) / 1000);

        const buildEmbed = () => {
            return {
                title: "Players Confirmation",
                fields: [
                    ...matchData.teamA.players,
                    ...matchData.teamB.players,
                ].map((player) => ({
                    name: player.name,
                    value: readyPlayersMap.get(player.discordId)
                        ? "✅ Ready"
                        : "⏳ Not Ready",
                    inline: true,
                })),
                description: `Expires <t:${expiresAt}:R>`,
            };
        };

        const message = await refs.controlChannel.send({
            content: [...matchData.teamA.players, ...matchData.teamB.players]
                .map((player) => userMention(player.discordId))
                .join(" "),
            embeds: [buildEmbed()],
            components: [
                {
                    type: 1,
                    components: [
                        new ButtonBuilder()
                            .setCustomId("readyButton")
                            .setLabel("✅ Ready")
                            .setStyle(ButtonStyle.Success),
                    ],
                },
            ],
        });

        const collector = message.createMessageComponentCollector();

        collector.on("collect", async (interaction) => {
            readyPlayersMap.set(interaction.user.id, true);
            interaction.deferUpdate();

            const allReady = Array.from(readyPlayersMap.values()).every(
                (x) => x,
            );

            await message.edit({
                embeds: [buildEmbed()],
            });

            if (allReady) {
                await message.delete();
                collector.stop();
                return;
            }
        });

        await new Promise<void>((resolve, reject) => {
            resolve();
            const timeout = setTimeout(() => reject(), timeoutMs);
            collector.on("end", () => {
                clearTimeout(timeout);
                resolve();
            });
        });
    });
}
