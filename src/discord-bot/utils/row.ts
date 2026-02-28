import { ActionRowBuilder, type AnyComponentBuilder } from "discord.js";

export function row<T extends AnyComponentBuilder>(...components: T[]) {
    return new ActionRowBuilder<T>().addComponents(...components);
}
