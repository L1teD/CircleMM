import { Collection } from "discord.js";
import { SlashCommand } from "./events/templates/SlashCommand";
import type ComponentEvent from "./events/templates/ComponentEvent";

declare module "discord.js" {
    interface Client {
        commands: Collection<string, SlashCommand>;
        componentHandlers: Collection<string, ComponentEvent>;
    }
}
