import type {
  GscConnection,
  Verification,
} from "@/lib/generated/prisma/client";
import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5432/test";
process.env.BETTER_AUTH_SECRET ??= "test-secret-with-at-least-32-characters";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.APP_URL ??= "http://localhost:3000";
process.env.GOOGLE_OAUTH_CLIENT_ID ??= "google-client-id";
process.env.GOOGLE_OAUTH_CLIENT_SECRET ??= "google-client-secret";
process.env.GOOGLE_OAUTH_REDIRECT_URI ??=
  "http://localhost:3000/api/google/callback";
process.env.GSC_TOKEN_ENCRYPTION_KEY ??= Buffer.alloc(32, 10).toString(
  "base64"
);

const { handleGscOAuthCallback, findAuthorizedGscSite } = await import(
  "@/lib/integrations/gsc/oauth-callback"
);

const APP_URL = "http://localhost:3000";
const NOW = new Date("2026-05-08T12:00:00.000Z");
const REQUIRED_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

function verification(overrides: Partial<Verification> = {}): Verification {
  return {
    id: "verification-1",
    identifier: "gsc-oauth:state-1",
    value: JSON.stringify({ userId: "user-1", clientId: "client-1" }),
    expiresAt: new Date("2026-05-08T12:10:00.000Z"),
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function connection(overrides: Partial<GscConnection> = {}): GscConnection {
  return {
    id: "connection-1",
    clientId: "client-1",
    googleAccountEmail: "owner@example.com",
    googleAccountSubject: "google-subject",
    gscSiteUrl: "https://example.com",
    scopes: [REQUIRED_SCOPE],
    accessTokenCipher: "cipher:access-token",
    refreshTokenCipher: "cipher:refresh-token",
    accessTokenExpiresAt: new Date("2026-05-08T13:00:00.000Z"),
    lastSyncedAt: null,
    lastSyncError: null,
    connectedByUserId: "user-1",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function callbackUrl(params: Record<string, string>): string {
  const url = new URL("/api/google/callback", APP_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

test("returns invalid_state when the OAuth state row is missing", async () => {
  const result = await handleGscOAuthCallback(
    callbackUrl({ code: "code-1", state: "missing" }),
    {
      appUrl: APP_URL,
      db: {
        verification: {
          findFirst: () => Promise.resolve(null),
          delete: () => Promise.resolve(null),
        },
      } as never,
      now: () => NOW,
    }
  );

  assert.equal(result.status, "error");
  assert.equal(result.reason, "invalid_state");
  assert.equal(result.redirectUrl.pathname, "/dashboard");
});

test("stops before persistence when Google omits the Search Console scope", async () => {
  let upsertCalled = false;
  const result = await handleGscOAuthCallback(
    callbackUrl({ code: "code-1", state: "state-1" }),
    {
      appUrl: APP_URL,
      db: {
        verification: {
          findFirst: () => Promise.resolve(verification()),
          delete: () => Promise.resolve(null),
        },
        client: {
          findUnique: () =>
            Promise.resolve({
              id: "client-1",
              gscProperty: "https://example.com",
            }),
        },
        gscConnection: {
          upsert: () => {
            upsertCalled = true;
            return Promise.resolve(connection());
          },
        },
      } as never,
      exchangeCode: () =>
        Promise.resolve({
          accessToken: "access-token",
          refreshToken: "refresh-token",
          expiresIn: 3600,
          idToken: "id-token",
          scope: "openid email",
        }),
      getSession: () => Promise.resolve({ user: { id: "user-1" } }),
      now: () => NOW,
    }
  );

  assert.equal(result.status, "error");
  assert.equal(result.reason, "scope_missing");
  assert.equal(upsertCalled, false);
});

test("persists tokens and redirects to the client on successful OAuth callback", async () => {
  const upsertArgs: unknown[] = [];
  const updateArgs: unknown[] = [];
  const deleteArgs: unknown[] = [];
  const result = await handleGscOAuthCallback(
    callbackUrl({ code: "code-1", state: "state-1" }),
    {
      appUrl: APP_URL,
      createGscClient: () => ({
        listSites: () =>
          Promise.resolve([
            {
              siteUrl: "https://example.com/",
              permissionLevel: "siteOwner",
            },
          ]),
      }),
      db: {
        verification: {
          findFirst: () => Promise.resolve(verification()),
          delete: () => Promise.resolve(null),
        },
        client: {
          findUnique: () =>
            Promise.resolve({
              id: "client-1",
              gscProperty: "https://example.com",
            }),
        },
        gscConnection: {
          upsert: (args: unknown) => {
            upsertArgs.push(args);
            return Promise.resolve(connection());
          },
          update: (args: unknown) => {
            updateArgs.push(args);
            return Promise.resolve(
              connection({ gscSiteUrl: "https://example.com/" })
            );
          },
          delete: (args: unknown) => {
            deleteArgs.push(args);
            return Promise.resolve(null);
          },
        },
      } as never,
      encrypt: (value) => `cipher:${value}`,
      exchangeCode: () =>
        Promise.resolve({
          accessToken: "access-token",
          refreshToken: "refresh-token",
          expiresIn: 3600,
          idToken: "id-token",
          scope: `openid email ${REQUIRED_SCOPE}`,
        }),
      getSession: () => Promise.resolve({ user: { id: "user-1" } }),
      now: () => NOW,
      verifyIdToken: () =>
        Promise.resolve({
          aud: "google-client-id",
          email: "owner@example.com",
          exp: 1_800_000_000,
          iat: 1_799_999_000,
          iss: "https://accounts.google.com",
          sub: "google-subject",
        }),
    }
  );

  assert.equal(result.status, "connected");
  assert.equal(result.redirectUrl.pathname, "/clients/client-1");
  assert.equal(result.redirectUrl.searchParams.get("gsc"), "connected");
  assert.equal(deleteArgs.length, 0);
  assert.equal(updateArgs.length, 1);
  assert.equal(
    (
      upsertArgs[0] as {
        create: { accessTokenCipher: string; refreshTokenCipher: string };
      }
    ).create.accessTokenCipher,
    "cipher:access-token"
  );
  assert.equal(
    (
      upsertArgs[0] as {
        create: { accessTokenCipher: string; refreshTokenCipher: string };
      }
    ).create.refreshTokenCipher,
    "cipher:refresh-token"
  );
});

test("findAuthorizedGscSite normalizes URL-prefix trailing slashes", () => {
  assert.deepEqual(
    findAuthorizedGscSite(
      [{ siteUrl: "https://example.com/", permissionLevel: "siteFullUser" }],
      "https://example.com"
    ),
    { siteUrl: "https://example.com/", permissionLevel: "siteFullUser" }
  );
});
