import { fromPromise } from "xstate";
import type { MatchHandlerContext } from "./types";
import { EmbedBuilder } from "discord.js";
import { ColorPalette } from "../../../discord-bot/utils/ColorPalette";

export function createMakeRollsHandler(ctx: MatchHandlerContext) {
    const { controller, refs } = ctx;
    return fromPromise(async () => {
        if (!refs.controlChannel)
            throw new Error("Control channel was not found!");

        controller.makeRolls();

        const context = controller.context;

        await refs.controlChannel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🎲 Roll results")
                    .setDescription(
                        [
                            `Team **${context.teamA.name}** rolled: **${context.rollResults.A}**`,
                            `Team **${context.teamB.name}** rolled: **${context.rollResults.B}**`,
                            "",
                            `Roll winner is team **${context.rollWinnerTeam?.name}**`,
                            "",
                            "TODO: Show instructions on who and where bans/picks first",
                        ].join("\n"),
                    )
                    .setColor(ColorPalette.SUCCESS),
            ],
        });
    });
}
