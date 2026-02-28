import { fromPromise } from "xstate";
import type { MatchHandlerContext } from "./types";
import {
    EmbedBuilder,
    StringSelectMenuBuilder,
    userMention,
    ActionRowBuilder,
} from "discord.js";
import { ColorPalette } from "../../../discord-bot/utils/ColorPalette";
import { env } from "../../../config/env";

export function createStartMappoolsBanHandler(ctx: MatchHandlerContext) {
    const { controller, refs } = ctx;
    return fromPromise(async () => {
        if (!refs.controlChannel)
            throw new Error("Control channel was not found!");

        let context = controller.context;
        let phaseFinished = false;

        const buildEmbed = () => {
            return new EmbedBuilder()
                .setTitle("Available Mappools")
                .setDescription(
                    context.availableMappools
                        .map((pool, i) =>
                            [
                                `\`${i + 1}.\` **${pool.tournament}** (**${pool.stage}**)`,
                                `Average: **${pool.avgStars.toFixed(2)}**★ | ELO: **${pool.elo}**`,
                            ].join("\n"),
                        )
                        .join("\n\n"),
                )
                .setColor(ColorPalette.INFO);
        };

        const poolsMessage = await refs.controlChannel.send({
            embeds: [buildEmbed()],
        });

        return new Promise<void>((resolve, reject) => {
            const banRotation = async (): Promise<void> => {
                context = controller.context;

                const captain = context.currentTurnTeam.players[0];

                if (!captain)
                    return reject(
                        new Error(
                            `Team ${context.currentTurnTeam.name} is empty!`,
                        ),
                    );

                const stringSelectMenu = new StringSelectMenuBuilder()
                    .setCustomId("mappoolBan")
                    .addOptions(
                        context.availableMappools.map((pool, i) => ({
                            label: `${i + 1} | ${pool.tournament} (${pool.stage})`,
                            value: pool.id.toString(),
                        })),
                    );

                const timeoutMs = env.MATCH_PHASE_TIMEOUT_MS;
                const expiresAt = Math.floor((Date.now() + timeoutMs) / 1000);

                const message = await refs.controlChannel!.send({
                    content: userMention(captain.discordId),
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Select a mappool to ban")
                            .setDescription(`Expires: <t:${expiresAt}:R>`)
                            .setColor(ColorPalette.DANGER),
                    ],
                    components: [
                        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                            stringSelectMenu,
                        ),
                    ],
                });

                const collector = message.createMessageComponentCollector();

                if (context.availableMappools.length === 1) {
                    phaseFinished = true;

                    collector.stop("finished");
                    await poolsMessage.delete().catch(() => {});
                    resolve();
                    return;
                }

                const timeout = setTimeout(async () => {
                    controller.banPool(
                        context.currentTurnTeam.players[0]!.discordId,
                        Number(stringSelectMenu.options[0]!.data.value),
                    );
                    collector.stop();

                    await Promise.all([
                        poolsMessage.edit({
                            embeds: [buildEmbed()],
                        }),
                        message.delete(),
                    ]);
                }, env.MATCH_PHASE_TIMEOUT_MS);

                collector.on("collect", async (interaction) => {
                    if (!interaction.isStringSelectMenu()) return;

                    try {
                        controller.banPool(
                            interaction.user.id,
                            Number(interaction.values[0]),
                        );
                    } catch (error) {
                        if (error instanceof Error)
                            return interaction.reply({
                                content: error.message,
                                flags: ["Ephemeral"],
                            });
                        return interaction.deferUpdate();
                    }

                    clearTimeout(timeout);

                    collector.stop();

                    await Promise.all([
                        poolsMessage.edit({
                            embeds: [buildEmbed()],
                        }),
                        interaction.deferUpdate(),
                        message.delete(),
                    ]);
                });

                collector.on("end", (_, reason) => {
                    if (phaseFinished || reason === "finished") return;

                    banRotation().catch(reject);
                });
            };
            banRotation().catch(reject);
        });
    });
}
