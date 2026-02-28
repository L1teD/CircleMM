import { EmbedBuilder, type RepliableInteraction } from "discord.js";
import { prisma } from "../../shared/prisma";
import { ColorPalette } from "../utils/ColorPalette";
import { type User } from "../../../generated/prisma/client";

type RequireField<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

export type UserWithDiscord = RequireField<User, "discordId">;

function hasDiscordId(user: User): user is UserWithDiscord {
    return user.discordId !== null;
}

export default class ComponentEvent<
    TInteraction extends RepliableInteraction = RepliableInteraction,
> {
    name: string;
    execute: (interaction: TInteraction) => Promise<void> | void;

    constructor(
        options:
            | {
                  name: string;
                  access?: "public";
                  execute: (interaction: TInteraction) => Promise<void> | void;
              }
            | {
                  name: string;
                  access: "linkedOnly";
                  execute: (
                      interaction: TInteraction,
                      user: UserWithDiscord,
                  ) => Promise<void> | void;
              }
            | {
                  name: string;
                  access: "unlinkedOnly";
                  execute: (interaction: TInteraction) => Promise<void> | void;
              },
    ) {
        this.name = options.name;

        this.execute = async (interaction: TInteraction) => {
            if (options.access === "public" || !options.access) {
                return options.execute(interaction);
            }

            const discordId = interaction.user.id;

            const user = await prisma.user.findUnique({
                where: { discordId },
            });

            const isLinked = user && hasDiscordId(user);

            if (options.access === "linkedOnly") {
                if (!isLinked) {
                    await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription(
                                    "You have to link your account first!",
                                )
                                .setColor(ColorPalette.DANGER),
                        ],
                        flags: ["Ephemeral"],
                    });
                    return;
                }

                return options.execute(interaction, user);
            }

            if (options.access === "unlinkedOnly") {
                if (isLinked) {
                    await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription(
                                    "Your account is already linked.",
                                )
                                .setColor(ColorPalette.DANGER),
                        ],
                        flags: ["Ephemeral"],
                    });
                    return;
                }

                return options.execute(interaction);
            }
        };
    }
}
