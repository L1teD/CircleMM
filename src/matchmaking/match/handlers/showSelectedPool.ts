import { fromPromise } from "xstate";
import type { MatchHandlerContext } from "./types";
import { EmbedBuilder } from "discord.js";
import { ColorPalette } from "../../../discord-bot/utils/ColorPalette";
import { prisma } from "../../../shared/prisma";

export function createShowSelectedPoolHandler(ctx: MatchHandlerContext) {
    const { controller, refs } = ctx;
    return fromPromise(async () => {
        if (!refs.controlChannel)
            throw new Error("Control channel was not found!");

        let context = controller.context;

        const mappool = context.availableMappools[0];

        if (!mappool) throw new Error("Mappool not found!");

        const fullMappool = await prisma.mappool.findUnique({
            where: {
                id: mappool.id,
            },
            include: {
                entries: {
                    include: {
                        map: true,
                    },
                },
            },
        });

        if (!fullMappool) throw new Error("Mappool not found!");

        controller.setPool(fullMappool);
        context = controller.context;

        if (!context.currentMappool)
            throw new Error("Current mappool was not set!");

        refs.controlChannel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Selected mappool")
                    .setDescription(
                        [
                            `**${context.currentMappool.tournament}** (**${context.currentMappool.stage}**)`,
                            `Average: **${context.currentMappool.avgStars?.toFixed(2)}**★ | ELO: **${context.currentMappool.elo}**`,
                            "",
                            context.currentMappool.entries
                                .map((entry) => {
                                    return [
                                        `**${entry.mod}${entry.modIndex}** | [${entry.map.artist} - ${entry.map.title} [${entry.map.version}]](https://osu.ppy.sh/b/${entry.map.id})`,
                                        `CS: **${entry.map.cs}** | AR: **${entry.map.ar}** | OD: **${entry.map.od}** | BPM: **${entry.map.bpm}** | Length: **${secondsToFormatted(entry.map.length)}**`,
                                        "",
                                    ].join("\n");
                                })
                                .join("\n"),
                        ].join("\n"),
                    )
                    .setColor(ColorPalette.INFO),
            ],
        });
    });
}

function secondsToFormatted(totalSeconds: number) {
    // Multiply by 1000 because Date() requires milliseconds
    const date = new Date(totalSeconds * 1000);

    // Get UTC minutes and seconds to ignore the browser's local timezone
    const minutes = date.getUTCMinutes();
    const seconds = date.getUTCSeconds();

    // Optional: Pad with leading zeros
    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = String(seconds).padStart(2, "0");

    return `${formattedMinutes}:${formattedSeconds}`;
}
