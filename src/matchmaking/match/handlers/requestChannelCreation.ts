import { fromPromise } from "xstate";
import type { MatchHandlerContext } from "./types";
import { ChannelType, GuildMember, PermissionFlagsBits } from "discord.js";

export function createRequestChannelCreationHandler(ctx: MatchHandlerContext) {
    const { refs, controller, matchData, guild } = ctx;
    return fromPromise(async () => {
        await controller.init();
        refs.category = await guild.channels.create({
            name: `match-${matchData.id}`,
            type: ChannelType.GuildCategory,
        });

        const members: GuildMember[] = [];

        await Promise.allSettled(
            [...matchData.teamA.players, ...matchData.teamB.players].map(
                (player) => guild.members.fetch(player.discordId),
            ),
        ).then((results) =>
            results.forEach((result) => {
                if (result.status === "fulfilled") {
                    members.push(result.value);
                } else {
                    throw new Error(result.reason);
                }
            }),
        );

        refs.controlChannel = await refs.category.children.create({
            name: "match-control",
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: PermissionFlagsBits.ViewChannel,
                },
                ...members.map((member) => {
                    return {
                        id: member.id,
                        allow: PermissionFlagsBits.ViewChannel,
                    };
                }),
            ],
        });
    });
}
