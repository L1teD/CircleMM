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

export function createStartMapsBanHandler(ctx: MatchHandlerContext) {
    return fromPromise(async () => {
        const { refs, controller } = ctx;

        if (!refs.lobbyChannel) throw new Error("Lobby channel was not found!");
        if (!refs.controlChannel)
            throw new Error("Control channel was not found!");

        const lobbyChannel = refs.lobbyChannel;
        let bansAmount = 0;
        const isBanPhaseOver = () => bansAmount >= env.MATCH_MAP_BANS;

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
            // Single osu message listener for the entire ban phase.
            // Attached once here — never re-attached per rotation to avoid accumulation.
            let currentDiscordMessage: Message | null = null;
            let currentTimeout: ReturnType<typeof setTimeout> | null = null;
            let osuBanInProgress = false;

            const osuMessageHandler = async (osuMsg: BanchoMessage) => {
                if (osuMsg.self) return;
                if (osuBanInProgress) return;
                if (!osuMsg.user.id) return;

                // Check if message is [two letters][number] pattern
                if (!/^[a-zA-Z]{2}\d+$/.test(osuMsg.content)) return;

                try {
                    controller.banMap(
                        osuMsg.user.id.toString(),
                        osuMsg.content.toUpperCase(),
                        true,
                    );
                } catch (error) {
                    if (error instanceof Error)
                        lobbyChannel.sendMessage(error.message);
                    return;
                }

                // Ban was accepted
                osuBanInProgress = true;

                if (currentTimeout) {
                    clearTimeout(currentTimeout);
                    currentTimeout = null;
                }

                bansAmount++;

                await Promise.all([
                    mapsMessage.edit({ embeds: [buildEmbed()] }),
                    // Delete the Discord ban-select message if it's still up
                    currentDiscordMessage
                        ?.delete()
                        .catch(() => {})
                        .then(() => {
                            currentDiscordMessage = null;
                        }),
                ]);

                osuBanInProgress = false;

                if (isBanPhaseOver()) {
                    lobbyChannel.removeListener("message", osuMessageHandler);
                    await mapsMessage.delete().catch(() => {});
                    resolve();
                } else {
                    // Kick off next Discord rotation
                    banRotation().catch(reject);
                }
            };

            lobbyChannel.on("message", osuMessageHandler);

            const banRotation = async (): Promise<void> => {
                const context = controller.context;

                if (isBanPhaseOver()) {
                    lobbyChannel.removeListener("message", osuMessageHandler);
                    await mapsMessage.delete().catch(() => {});
                    resolve();
                    return;
                }

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

                lobbyChannel.sendMessage(`Waiting for ${captain.name}'s ban`);

                const stringSelectMenu = new StringSelectMenuBuilder()
                    .setCustomId("mapsBan")
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
                            .setTitle("Select a map to ban")
                            .setDescription(`Expires: <t:${expiresAt}:R>`)
                            .setColor(ColorPalette.DANGER),
                    ],
                    components: [
                        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                            stringSelectMenu,
                        ),
                    ],
                });

                // Track current Discord message so osu handler can delete it
                currentDiscordMessage = message;

                const collector = message.createMessageComponentCollector();

                currentTimeout = setTimeout(async () => {
                    // Auto-ban first available map on timeout
                    try {
                        controller.banMap(
                            captain.discordId,
                            `${context.availableMaps[0]!.mod}${context.availableMaps[0]!.modIndex}`,
                        );
                    } catch {
                        // ignore
                    }

                    bansAmount++;
                    collector.stop("timeout");

                    await Promise.all([
                        mapsMessage.edit({ embeds: [buildEmbed()] }),
                        message.delete().catch(() => {}),
                        sendOsuStatus(),
                    ]);

                    currentDiscordMessage = null;
                    currentTimeout = null;
                }, timeoutMs);

                collector.on("collect", async (interaction) => {
                    if (!interaction.isStringSelectMenu()) return;
                    if (!interaction.values[0]) return;

                    try {
                        controller.banMap(
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

                    if (currentTimeout) {
                        clearTimeout(currentTimeout);
                        currentTimeout = null;
                    }

                    bansAmount++;
                    collector.stop("selected");

                    currentDiscordMessage = null;

                    await Promise.all([
                        mapsMessage.edit({ embeds: [buildEmbed()] }),
                        interaction.deferUpdate(),
                        message.delete().catch(() => {}),
                        sendOsuStatus(),
                    ]);
                });

                collector.on("end", async (_, reason) => {
                    // osuMessageHandler drives its own rotation; only proceed here for
                    // Discord-initiated ends (selected / timeout)
                    if (reason === "selected" || reason === "timeout") {
                        if (isBanPhaseOver()) {
                            lobbyChannel.removeListener(
                                "message",
                                osuMessageHandler,
                            );
                            await mapsMessage.delete().catch(() => {});
                            resolve();
                        } else {
                            await lobbyChannel.lobby.abortTimer();
                            banRotation().catch(reject);
                        }
                    }
                    // If reason is something else (e.g. the osu handler stopped it),
                    // osuMessageHandler already drives the next step.
                });
            };

            banRotation().catch(reject);
        });
    });
}
