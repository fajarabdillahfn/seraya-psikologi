import { randomUUID } from "node:crypto";
import type { PersistenceAdapter } from "../persistence/adapter";
import { DomainError } from "../domain/types";

const SESSION_TTL_SECONDS = 14 * 24 * 60 * 60;
const OAUTH_STATE_TTL_SECONDS = 10 * 60;

export interface ClientSession {
  id: string;
  clientId: string;
  returnTo: string;
  expiresAt: string;
}

export function safeReturnTo(value: string | null | undefined, fallback = "/book"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const parsed = new URL(value, "https://seraya.invalid");
    if (parsed.origin !== "https://seraya.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function sessionCookie(token: string, maxAge = SESSION_TTL_SECONDS): string {
  return `seraya_session=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie(): string {
  return "seraya_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax";
}

export class ClientAuthModule {
  constructor(private readonly db: PersistenceAdapter) {}

  async createOAuthState(returnTo: string, now = new Date()): Promise<string> {
    const state = randomUUID();
    const expiresAt = new Date(now.getTime() + OAUTH_STATE_TTL_SECONDS * 1000).toISOString();
    await this.db.batch([{ sql: `INSERT INTO oauth_state (state, return_to, expires_at) VALUES (?, ?, ?)`, params: [state, safeReturnTo(returnTo), expiresAt] }]);
    return state;
  }

  async consumeOAuthState(state: string, now = new Date()): Promise<string> {
    let rows: { return_to: string; expires_at: string }[];
    try {
      const result = await this.db.query<{ return_to: string; expires_at: string }>({
        sql: `SELECT return_to, expires_at FROM oauth_state WHERE state = ?`,
        params: [state],
      });
      rows = result.rows;
    } catch (error) {
      throw new DomainError("E-AUTH-STATE-READ", "oauth state database read failed", error);
    }
    const row = rows[0];
    if (!row || new Date(row.expires_at).getTime() <= now.getTime()) {
      throw new DomainError("E-AUTH-INVALID-STATE", "oauth state invalid or expired");
    }
    const deleteState = { sql: `DELETE FROM oauth_state WHERE state = ?`, params: [state] };
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        if (this.db.execute) await this.db.execute(deleteState);
        else await this.db.batch([deleteState]);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
      }
    }
    if (lastError !== undefined) {
      throw new DomainError("E-AUTH-STATE-DELETE", "oauth state database delete failed", lastError);
    }
    return safeReturnTo(row.return_to);
  }

  async createSession(clientId: string, returnTo: string, now = new Date()): Promise<{ token: string; session: ClientSession }> {
    const token = `${randomUUID()}${randomUUID()}`;
    const id = randomUUID();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
    await this.db.batch([{ sql: `INSERT INTO client_session (id, client_id, token_hash, return_to, expires_at) VALUES (?, ?, ?, ?, ?)`, params: [id, clientId, await sha256Hex(token), safeReturnTo(returnTo), expiresAt] }]);
    return { token, session: { id, clientId, returnTo: safeReturnTo(returnTo), expiresAt } };
  }

  async getSession(token: string | null, now = new Date()): Promise<ClientSession | null> {
    if (!token) return null;
    const { rows } = await this.db.query<{ id: string; client_id: string; return_to: string; expires_at: string }>({ sql: `SELECT id, client_id, return_to, expires_at FROM client_session WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?`, params: [await sha256Hex(token), now.toISOString()] });
    const row = rows[0];
    return row ? { id: row.id, clientId: row.client_id, returnTo: safeReturnTo(row.return_to), expiresAt: row.expires_at } : null;
  }

  async revokeSession(token: string | null): Promise<void> {
    if (!token) return;
    await this.db.batch([{ sql: `UPDATE client_session SET revoked_at = datetime('now') WHERE token_hash = ?`, params: [await sha256Hex(token)] }]);
  }
}

export function readCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function googleAuthorizationUrl(args: { clientId: string; redirectUri: string; state: string }): string {
  const params = new URLSearchParams({ client_id: args.clientId, redirect_uri: args.redirectUri, response_type: "code", scope: "openid email profile", state: args.state, access_type: "online" });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(args: { code: string; clientId: string; clientSecret: string; redirectUri: string }): Promise<{ sub: string; email: string; name: string }> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code: args.code, client_id: args.clientId, client_secret: args.clientSecret, redirect_uri: args.redirectUri, grant_type: "authorization_code" }) });
  if (!tokenResponse.ok) throw new DomainError("E-AUTH-TOKEN", "google token exchange failed");
  const tokens = await tokenResponse.json() as { access_token?: string };
  if (!tokens.access_token) throw new DomainError("E-AUTH-TOKEN", "google access token missing");
  const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  if (!userResponse.ok) throw new DomainError("E-AUTH-USERINFO", "google user info failed");
  const user = await userResponse.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string };
  if (!user.sub || !user.email || user.email_verified !== true) throw new DomainError("E-AUTH-IDENTITY", "verified google identity required");
  return { sub: user.sub, email: user.email, name: user.name ?? user.email };
}
