/*
 * API key rules, from Deepgram's public docs: keys have a role (Owner, Admin,
 * Member) or explicit scopes; the secret is shown once; minting temporary
 * tokens needs a key with Member role or higher (changelog, Sep 18 2026);
 * only Owners can write billing; tags can't be edited after creation.
 *
 * The design goal: say what a key can and can't do *before* it's created, so
 * nobody finds out from a FORBIDDEN error in production.
 */

export type Role = "owner" | "admin" | "member" | "custom";
export type Capability = "transcribe" | "speak" | "agent" | "tempTokens" | "usage" | "keys" | "billing";

export const ROLE_LABEL: Record<Role, string> = { owner: "Owner", admin: "Admin", member: "Member", custom: "Custom scopes" };

export const CAPABILITY_LABEL: Record<Capability, string> = {
  transcribe: "Transcribe audio (speech-to-text)",
  speak: "Generate speech (text-to-speech)",
  agent: "Run voice agents",
  tempTokens: "Mint temporary tokens for browsers",
  usage: "Read usage and logs",
  keys: "Create and delete API keys",
  billing: "Change billing",
};

export const CUSTOM_SCOPES = ["usage:read"] as const;

export function capabilities(role: Role): Record<Capability, boolean> {
  const member = role === "member" || role === "admin" || role === "owner";
  const admin = role === "admin" || role === "owner";
  return {
    transcribe: member,
    speak: member,
    agent: member,
    tempTokens: member,
    usage: true,
    keys: admin,
    billing: role === "owner",
  };
}

export type UseCase = "server" | "browser" | "dashboard" | "automation";

export const USE_CASES: Record<UseCase, { label: string; detail: string; needs: Capability[]; role: Role; expiryDays: number | null }> = {
  server: { label: "Server app", detail: "Backend calls to STT, TTS or agents.", needs: ["transcribe", "speak", "agent"], role: "member", expiryDays: 365 },
  browser: { label: "Browser or mobile app", detail: "Mint short-lived tokens for clients.", needs: ["tempTokens"], role: "member", expiryDays: 90 },
  dashboard: { label: "Usage dashboard", detail: "Read-only usage and logs.", needs: ["usage"], role: "custom", expiryDays: 365 },
  automation: { label: "Admin automation", detail: "Scripts that rotate keys.", needs: ["keys", "usage"], role: "admin", expiryDays: 30 },
};

/** Capabilities the use case needs that the chosen role doesn't grant. */
export function missing(useCase: UseCase, role: Role): Capability[] {
  const caps = capabilities(role);
  return USE_CASES[useCase].needs.filter((c) => !caps[c]);
}

/** Powerful capabilities (key management, billing) granted but not needed: a least-privilege warning. */
export function excess(useCase: UseCase, role: Role): Capability[] {
  const caps = capabilities(role);
  const need = new Set(USE_CASES[useCase].needs);
  return (["keys", "billing"] as Capability[]).filter((c) => caps[c] && !need.has(c));
}

export function maskKey(secret: string): string {
  return secret.length <= 8 ? "••••" : `${secret.slice(0, 4)}${"•".repeat(Math.max(4, secret.length - 8))}${secret.slice(-4)}`;
}
