import { prisma } from "../shared/prisma";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
    type BaseMessageOptions,
} from "discord.js";
import { row } from "../discord-bot/utils/row";
import { ColorPalette } from "../discord-bot/utils/ColorPalette";
import type { Lobby, LobbyInvite } from "../../generated/prisma/client";

export type LobbyMode = "1v1" | "2v2";

export type LobbyWithInvites = Lobby & { invites: LobbyInvite[] };

export class LobbyController {
    // ==================== DB OPERATIONS ====================

    /** Get an existing lobby for this host or create a fresh one. */
    static async getOrCreate(hostId: string): Promise<LobbyWithInvites> {
        return prisma.lobby.upsert({
            where: { hostId },
            update: {},
            create: { hostId },
            include: { invites: true },
        });
    }

    /** Fetch lobby by host discord ID, returns null if not found. */
    static async getByHostId(hostId: string): Promise<LobbyWithInvites | null> {
        return prisma.lobby.findUnique({
            where: { hostId },
            include: { invites: true },
        });
    }

    /** Fetch lobby by its numeric ID. */
    static async getById(id: number): Promise<LobbyWithInvites | null> {
        return prisma.lobby.findUnique({
            where: { id },
            include: { invites: true },
        });
    }

    static async updateMode(hostId: string, mode: LobbyMode): Promise<void> {
        await prisma.lobby.update({
            where: { hostId },
            data: {
                mode,
                // Clear guest when switching to 1v1
                guestId: mode === "1v1" ? null : undefined,
            },
        });
    }

    static async updateAutoLeave(
        hostId: string,
        autoLeave: number,
    ): Promise<void> {
        await prisma.lobby.update({ where: { hostId }, data: { autoLeave } });
    }

    /** Send invite from a host lobby to another discord user. */
    static async sendInvite(
        hostId: string,
        toDiscordId: string,
    ): Promise<
        | "ok"
        | "already_invited"
        | "lobby_not_found"
        | "not_2v2"
        | "already_has_guest"
    > {
        const lobby = await LobbyController.getByHostId(hostId);
        if (!lobby) return "lobby_not_found";
        if (lobby.mode !== "2v2") return "not_2v2";
        if (lobby.guestId) return "already_has_guest";

        const existing = lobby.invites.find((i) => i.toId === toDiscordId);
        if (existing) return "already_invited";

        await prisma.lobbyInvite.create({
            data: { lobbyId: lobby.id, toId: toDiscordId },
        });
        return "ok";
    }

    /** Accept an invite. Returns the lobby or null on failure. */
    static async acceptInvite(
        toId: string,
        lobbyId: number,
    ): Promise<LobbyWithInvites | null> {
        const invite = await prisma.lobbyInvite.findUnique({
            where: { lobbyId_toId: { lobbyId, toId } },
        });
        if (!invite) return null;

        // Set as guest + wipe all invites to this user (they picked one)
        const lobby = await prisma.lobby.update({
            where: { id: lobbyId },
            data: {
                guestId: toId,
                invites: { deleteMany: {} }, // remove all invites for this lobby
            },
            include: { invites: true },
        });

        // Also delete any other invites addressed to this user from OTHER lobbies
        await prisma.lobbyInvite.deleteMany({ where: { toId } });

        return lobby;
    }

    /** Decline a single invite. */
    static async declineInvite(toId: string, lobbyId: number): Promise<void> {
        await prisma.lobbyInvite.deleteMany({
            where: { lobbyId, toId },
        });
    }

    /** Remove a guest from a lobby (kick or self-leave). */
    static async removeGuest(lobbyId: number): Promise<void> {
        await prisma.lobby.update({
            where: { id: lobbyId },
            data: { guestId: null },
        });
    }

    /** Delete the lobby entirely (host closes it). */
    static async deleteLobby(hostId: string): Promise<void> {
        await prisma.lobby.deleteMany({ where: { hostId } });
    }

    /** Get all pending invites sent TO a specific discord user. */
    static async getInvitesForUser(toId: string) {
        return prisma.lobbyInvite.findMany({
            where: { toId },
            include: {
                lobby: {
                    include: { host: true },
                },
            },
            orderBy: { createdAt: "asc" },
        });
    }

    // ==================== UI BUILDERS ====================

    /** Build the main lobby panel message. */
    static buildLobbyPanel(
        lobby: LobbyWithInvites & {
            host: { name: string; discordId: string | null };
            guest?: { name: string; discordId: string | null } | null;
        },
        controlsEnabled = true,
    ): BaseMessageOptions {
        const members: string[] = [`👑 ${lobby.host.name}`];
        if (lobby.guest) members.push(`🎮 ${lobby.guest.name}`);

        const embed = new EmbedBuilder()
            .setTitle(`🎮 ${lobby.host.name}'s Lobby`)
            .addFields(
                {
                    name: "Mode",
                    value: lobby.mode ?? "Not selected",
                    inline: true,
                },
                {
                    name: "Auto-leave",
                    value:
                        lobby.autoLeave == null
                            ? "Never"
                            : lobby.autoLeave === 0
                              ? "Never"
                              : `${lobby.autoLeave / 60} min`,
                    inline: true,
                },
                { name: "Members", value: members.join("\n"), inline: false },
            )
            .setColor(ColorPalette.INFO);

        if (!controlsEnabled) {
            return { embeds: [embed], components: [] };
        }

        const modeRow = row(
            new StringSelectMenuBuilder()
                .setCustomId("lobbySelectMode")
                .setPlaceholder("Select queue mode")
                .addOptions([
                    {
                        label: "1v1",
                        value: "1v1",
                        description: "Solo queue",
                        default: lobby.mode === "1v1",
                    },
                    {
                        label: "2v2",
                        value: "2v2",
                        description: "Duo / team queue",
                        default: lobby.mode === "2v2",
                    },
                ]),
        );

        const autoLeaveRow = row(
            new StringSelectMenuBuilder()
                .setCustomId("lobbySelectAutoLeave")
                .setPlaceholder("Select auto-leave timer")
                .addOptions([
                    {
                        label: "Never leave",
                        value: "0",
                        default: lobby.autoLeave === 0,
                    },
                    {
                        label: "5 minutes",
                        value: "300",
                        default: lobby.autoLeave === 300,
                    },
                    {
                        label: "10 minutes",
                        value: "600",
                        default: lobby.autoLeave === 600,
                    },
                    {
                        label: "30 minutes",
                        value: "1800",
                        default: lobby.autoLeave === 1800,
                    },
                    {
                        label: "1 hour",
                        value: "3600",
                        default: lobby.autoLeave === 3600,
                    },
                ]),
        );

        const actionButtons: ButtonBuilder[] = [];

        if (lobby.guestId) {
            actionButtons.push(
                new ButtonBuilder()
                    .setCustomId("lobbyKick")
                    .setLabel("🚫 Kick Guest")
                    .setStyle(ButtonStyle.Danger),
            );
        }

        actionButtons.push(
            new ButtonBuilder()
                .setCustomId("lobbyStartSearch")
                .setLabel("🔍 Start Search")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("lobbyClose")
                .setLabel("✖ Close Lobby")
                .setStyle(ButtonStyle.Secondary),
        );

        const components: (
            | ActionRowBuilder<StringSelectMenuBuilder>
            | ActionRowBuilder<UserSelectMenuBuilder>
            | ActionRowBuilder<ButtonBuilder>
        )[] = [modeRow, autoLeaveRow, row(...actionButtons)];

        // If in 2v2 mode, add invite user select
        if (lobby.mode === "2v2" && !lobby.guestId) {
            components.splice(
                2,
                0,
                row(
                    new UserSelectMenuBuilder()
                        .setCustomId("lobbyInviteUser")
                        .setPlaceholder("Select a player to invite"),
                ),
            );
        }

        return { embeds: [embed], components };
    }

    /** Build a read-only lobby view for a guest player, with a Leave button. */
    static buildGuestPanel(
        lobby: LobbyWithInvites & {
            host: { name: string; discordId: string | null };
            guest?: { name: string; discordId: string | null } | null;
        },
    ): BaseMessageOptions {
        const members: string[] = [`👑 ${lobby.host.name}`];
        if (lobby.guest) members.push(`🎮 ${lobby.guest.name}`);

        const embed = new EmbedBuilder()
            .setTitle(`🎮 ${lobby.host.name}'s Lobby`)
            .setDescription(
                "You are a guest in this lobby. The host controls the settings.",
            )
            .addFields(
                {
                    name: "Mode",
                    value: lobby.mode ?? "Not selected",
                    inline: true,
                },
                {
                    name: "Auto-leave",
                    value:
                        lobby.autoLeave == null || lobby.autoLeave === 0
                            ? "Never"
                            : `${lobby.autoLeave / 60} min`,
                    inline: true,
                },
                { name: "Members", value: members.join("\n"), inline: false },
            )
            .setColor(ColorPalette.SECONDARY);

        return {
            embeds: [embed],
            components: [
                row(
                    new ButtonBuilder()
                        .setCustomId("lobbyLeave")
                        .setLabel("🚪 Leave Lobby")
                        .setStyle(ButtonStyle.Danger),
                ),
            ],
        };
    }

    /** Build the invites panel (as recipient). */
    static buildInvitesPanel(
        invites: Array<{
            id: string;
            lobbyId: number;
            lobby: {
                mode: string | null;
                autoLeave: number | null;
                host: { name: string };
            };
        }>,
    ): BaseMessageOptions {
        if (invites.length === 0) {
            return {
                embeds: [
                    new EmbedBuilder()
                        .setDescription("📭 You have no pending lobby invites.")
                        .setColor(ColorPalette.SECONDARY),
                ],
                components: [],
            };
        }

        const fields = invites.map((inv) => ({
            name: `From **${inv.lobby.host.name}**`,
            value: [
                `Mode: **${inv.lobby.mode ?? "not set"}**`,
                `Auto-leave: **${
                    inv.lobby.autoLeave == null || inv.lobby.autoLeave === 0
                        ? "never"
                        : `${inv.lobby.autoLeave / 60} min`
                }**`,
            ].join("\n"),
            inline: false,
        }));

        const embed = new EmbedBuilder()
            .setTitle("📨 Pending Lobby Invites")
            .setDescription("Choose one to accept or decline.")
            .addFields(fields)
            .setColor(ColorPalette.INFO);

        // Up to 5 invite pairs per action row (Discord: max 5 rows, max 5 buttons each)
        // We render 2 buttons (Accept / Decline) per invite, pair them in one row each.
        const components = invites
            .slice(0, 5)
            .map((inv) =>
                row(
                    new ButtonBuilder()
                        .setCustomId(`lobbyAccept:${inv.lobbyId}`)
                        .setLabel(`✅ Accept — ${inv.lobby.host.name}`)
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`lobbyDecline:${inv.lobbyId}`)
                        .setLabel(`❌ Decline`)
                        .setStyle(ButtonStyle.Danger),
                ),
            );

        return { embeds: [embed], components };
    }
}
