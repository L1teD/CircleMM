import crypto from "crypto";

export function generateState(discordId: string) {
    const nonce = crypto.randomBytes(8).toString("hex");
    const payload = { discordId, nonce };
    return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function parseState(state: string) {
    const decoded = Buffer.from(state, "base64url").toString();
    return JSON.parse(decoded) as { discordId: string; nonce: string };
}
