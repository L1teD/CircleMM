import type {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
} from "discord.js";

export class SlashCommand {
    public data: SlashCommandBuilder;
    public execute: (interaction: ChatInputCommandInteraction) => Promise<void>;

    constructor({
        data,
        execute,
    }: {
        data: SlashCommandBuilder;
        execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    }) {
        this.data = data;
        this.execute = execute;
    }
}
