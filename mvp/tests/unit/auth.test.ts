import { describe, expect, it } from "vitest";
import {
  ClientAuthModule,
  googleAuthorizationUrl,
  safeReturnTo,
  sessionCookie,
} from "../../app/src/modules/auth";

describe("client auth helpers", () => {
  it("accepts internal return paths and rejects open redirects", () => {
    expect(safeReturnTo("/book/slots?x=1")).toBe("/book/slots?x=1");
    expect(safeReturnTo("https://evil.example/steal")).toBe("/book");
    expect(safeReturnTo("//evil.example/steal")).toBe("/book");
    expect(safeReturnTo("/\\evil")).toBe("/book");
  });

  it("builds a Google authorization URL with a state", () => {
    const url = new URL(googleAuthorizationUrl({
      clientId: "client-id",
      redirectUri: "https://seraya.example/auth/callback",
      state: "state-value",
    }));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("state")).toBe("state-value");
    expect(url.searchParams.get("scope")).toContain("openid");
  });

  it("sets secure HTTP-only session cookie attributes", () => {
    const cookie = sessionCookie("opaque-token");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
  });
});

describe("ClientAuthModule", () => {
  it("stores and consumes OAuth state once", async () => {
    const batches: { sql: string; params?: unknown[] }[][] = [];
    const db = {
      batch: async (queries: { sql: string; params?: unknown[] }[]) => {
        batches.push(queries);
        return { rows: [], rows_read: 0, rows_written: queries.length };
      },
      query: async () => ({
        rows: [{ return_to: "/book/slots", expires_at: "2026-09-03T00:10:00.000Z" }],
        rows_read: 1,
        rows_written: 0,
      }),
    };
    const auth = new ClientAuthModule(db as never);
    const state = await auth.createOAuthState("/book/slots", new Date("2026-09-03T00:00:00.000Z"));
    expect(state).toBeTruthy();
    expect(batches[0]?.[0]?.sql).toContain("INSERT INTO oauth_state");
    const returnTo = await auth.consumeOAuthState(state, new Date("2026-09-03T00:05:00.000Z"));
    expect(returnTo).toBe("/book/slots");
    expect(batches[1]?.[0]?.sql).toContain("DELETE FROM oauth_state");
  });
});

export {};



describe("auth route contracts", () => {
  it("safe return path remains internal after encoding", () => {
    const target = encodeURIComponent(safeReturnTo("https://evil.example/"));
    expect(decodeURIComponent(target)).toBe("/book");
  });
});
