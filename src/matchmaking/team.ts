import type { UserWithDiscord } from "../discord-bot/templates/ComponentEvent.js";

export type TeamId = "A" | "B";

export interface Team {
    id: string;
    name: string;
    captainId: string;
    players: UserWithDiscord[];
}

// Creates a Team object from a list of players and a display name.
export function createTeam(players: UserWithDiscord[], name: string): Team {
    if (!players[0]) throw new Error("Team must contain players!");

    return {
        id: crypto.randomUUID(),
        name,
        captainId: players[0]?.discordId,
        players,
    };
}
