import { env } from "../config/env.js";

// Elo rating system with variable K-factor.
//
// K-factor rules (from env):
//  - K = ELO_K_FACTOR_CALIBRATION  when matchCount <= ELO_CALIBRATION_MATCHES
//  - K = ELO_K_FACTOR_HIGH         when elo > ELO_THRESHOLD_HIGH
//  - K = ELO_K_FACTOR_NORMAL       otherwise

export interface EloPlayer {
    elo: number;
    matchCount: number;
}

export interface EloResult {
    newElo: number;
    delta: number;
}

// Returns the K-factor for a player based on their current Elo and match count.
export function getKFactor(player: EloPlayer): number {
    if (player.matchCount <= env.ELO_CALIBRATION_MATCHES) {
        return env.ELO_K_FACTOR_CALIBRATION;
    }
    if (player.elo > env.ELO_THRESHOLD_HIGH) {
        return env.ELO_K_FACTOR_HIGH;
    }
    return env.ELO_K_FACTOR_NORMAL;
}

// Expected score (probability of winning) for player A against player B.
function expectedScore(eloA: number, eloB: number): number {
    return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

// Calculates the new Elo and the raw delta for a single player.
// actualScore: 1 for win, 0.5 for draw, 0 for loss.
export function calculateElo(
    player: EloPlayer,
    opponentElo: number,
    actualScore: number,
): EloResult {
    const k = getKFactor(player);
    const expected = expectedScore(player.elo, opponentElo);
    const delta = k * (actualScore - expected);
    const newElo = Math.max(0, player.elo + delta);
    return { newElo, delta };
}

// Calculates Elo changes for both sides of a match and returns rounded results.
// winner: "A" | "B" | "draw"
export function calculateMatchElo(
    teamAPlayers: EloPlayer[],
    teamBPlayers: EloPlayer[],
    winner: "A" | "B" | "draw",
): { teamA: EloResult[]; teamB: EloResult[] } {
    const avgA = average(teamAPlayers.map((p) => p.elo));
    const avgB = average(teamBPlayers.map((p) => p.elo));

    const scoreA = winner === "A" ? 1 : winner === "B" ? 0 : 0.5;
    const scoreB = 1 - scoreA;

    const teamA = teamAPlayers.map((p) => calculateElo(p, avgB, scoreA));
    const teamB = teamBPlayers.map((p) => calculateElo(p, avgA, scoreB));

    return { teamA, teamB };
}

function average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((s, v) => s + v, 0) / values.length;
}
