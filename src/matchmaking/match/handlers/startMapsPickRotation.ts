import { fromPromise } from "xstate";
import {
    ActionRowBuilder,
    EmbedBuilder,
    Message,
    StringSelectMenuBuilder,
    userMention,
} from "discord.js";
import { env } from "../../../config/env";
import { ColorPalette } from "../../../discord-bot/utils/ColorPalette";
import type { MatchHandlerContext } from "./types";
import type { BanchoMessage } from "bancho.js";
import { getCurrentState } from "./utils";

export function createStartMapsPickRotationHandler(ctx: MatchHandlerContext) {
    return fromPromise(async () => {
        const { refs, controller } = ctx;

        if (!refs.lobbyChannel) throw new Error("Lobby channel was not found!");
        if (!refs.controlChannel)
            throw new Error("Control channel was not found!");

        const lobbyChannel = refs.lobbyChannel;

        const buildEmbed = () =>
            new EmbedBuilder()
                .setTitle("Current maps")
                .setDescription(getCurrentState(controller).join("\n"));

        const sendOsuStatus = async () => {
            await Promise.all(
                getCurrentState(controller).map((msg) =>
                    lobbyChannel.sendMessage(msg),
                ),
            );
        };

        await sendOsuStatus();
        const mapsMessage = await refs.controlChannel.send({
            embeds: [buildEmbed()],
        });

        return new Promise<void>((resolve, reject) => {
            let currentDiscordMessage: Message | null = null;
            let currentTimeout: ReturnType<typeof setTimeout> | null = null;

            const cleanup = () => {
                if (currentTimeout) {
                    clearTimeout(currentTimeout);
                }
                lobbyChannel.removeListener("message", osuMessageHandler);
            };

            const osuMessageHandler = async (osuMsg: BanchoMessage) => {
                if (osuMsg.self) return;
                if (!osuMsg.user.id) return;

                if (!/^[a-zA-Z]{2}\d+$/.test(osuMsg.content)) return;

                try {
                    controller.pickMap(
                        osuMsg.user.id.toString(),
                        osuMsg.content.toUpperCase(),
                        true,
                    );
                } catch (error) {
                    if (error instanceof Error)
                        lobbyChannel.sendMessage(error.message);
                    return;
                }

                if (currentTimeout) {
                    clearTimeout(currentTimeout);
                }

                await Promise.all([
                    setupMap(),
                    mapsMessage.edit({ embeds: [buildEmbed()] }),
                    currentDiscordMessage?.delete().catch(() => {}),
                ]);

                cleanup();
                resolve();
            };

            const setupMap = async () => {
                if (controller.context.currentPick?.mod) {
                    if (
                        ["NM", "HD", "HR", "DT"].includes(
                            controller.context.currentPick.mod,
                        )
                    ) {
                        await lobbyChannel.lobby.setMods(
                            ["NF", controller.context.currentPick.mod].join(
                                " ",
                            ),
                        );
                    } else {
                        await lobbyChannel.lobby.setMods("NF", true);
                    }
                    await lobbyChannel.lobby.setMap(
                        controller.context.currentPick.map.id,
                    );
                } else {
                    await lobbyChannel.lobby.setMods("NF");
                }
            };

            lobbyChannel.on("message", osuMessageHandler);

            const pickMap = async () => {
                const context = controller.context;

                lobbyChannel.lobby.startTimer(
                    env.MATCH_PHASE_TIMEOUT_MS / 1000,
                );

                const captain = context.currentTurnTeam.players[0];
                if (!captain)
                    return reject(
                        new Error(
                            `Team ${context.currentTurnTeam.name} is empty!`,
                        ),
                    );

                lobbyChannel.sendMessage(`Waiting for ${captain.name}'s pick`);

                const stringSelectMenu = new StringSelectMenuBuilder()
                    .setCustomId("mapsPick")
                    .addOptions(
                        context.availableMaps.map((entry) => ({
                            label: `${entry.mod}${entry.modIndex} | ${entry.map.artist} - ${entry.map.title}`,
                            value: `${entry.mod}${entry.modIndex}`,
                        })),
                    );

                const timeoutMs = env.MATCH_PHASE_TIMEOUT_MS;
                const expiresAt = Math.floor((Date.now() + timeoutMs) / 1000);

                const message = await refs.controlChannel!.send({
                    content: userMention(captain.discordId),
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Select a map to pick")
                            .setDescription(`Expires: <t:${expiresAt}:R>`)
                            .setColor(ColorPalette.SUCCESS),
                    ],
                    components: [
                        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                            stringSelectMenu,
                        ),
                    ],
                });

                currentDiscordMessage = message;

                const collector = message.createMessageComponentCollector();

                currentTimeout = setTimeout(async () => {
                    try {
                        controller.pickMap(
                            captain.discordId,
                            `${context.availableMaps[0]!.mod}${context.availableMaps[0]!.modIndex}`,
                        );
                    } catch {
                        // ignore
                    }

                    collector.stop("timeout");

                    await Promise.all([
                        setupMap(),
                        mapsMessage.edit({ embeds: [buildEmbed()] }),
                        message.delete().catch(() => {}),
                        sendOsuStatus(),
                    ]);

                    cleanup();
                    resolve();
                }, timeoutMs);

                collector.on("collect", async (interaction) => {
                    if (!interaction.isStringSelectMenu()) return;
                    if (!interaction.values[0]) return;

                    try {
                        controller.pickMap(
                            interaction.user.id,
                            interaction.values[0],
                        );
                    } catch (error) {
                        if (error instanceof Error)
                            return interaction.reply({
                                content: error.message,
                                flags: ["Ephemeral"],
                            });
                        return interaction.deferUpdate();
                    }

                    collector.stop("selected");

                    await Promise.all([
                        setupMap(),
                        mapsMessage.edit({ embeds: [buildEmbed()] }),
                        interaction.deferUpdate(),
                        message.delete().catch(() => {}),
                        sendOsuStatus(),
                    ]);

                    cleanup();
                    resolve();
                });

                collector.on("end", async () => {
                    await setupMap();
                    await lobbyChannel.lobby.abortTimer();
                });
            };

            pickMap().catch(reject);
        });
    });
}
