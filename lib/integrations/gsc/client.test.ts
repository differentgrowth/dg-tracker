import type { GscConnection } from "@/lib/generated/prisma/client";
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
process.env.GSC_TOKEN_ENCRYPTION_KEY ??= Buffer.alloc(32, 8).toString("base64");

const { GscClient } = await import("@/lib/integrations/gsc/client");
const { decryptToken, encryptToken } = await import(
  "@/lib/integrations/gsc/crypto"
);
const { GscApiError } = await import("@/lib/integrations/gsc/errors");

const NOW_MS = Date.UTC(2026, 4, 8, 12, 0, 0);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeConnection(overrides: Partial<GscConnection> = {}): GscConnection {
  const now = new Date(NOW_MS);

  return {
    id: "gsc-connection-1",
    clientId: "client-1",
    googleAccountEmail: "owner@example.com",
    googleAccountSubject: "google-subject",
    gscSiteUrl: "sc-domain:example.com",
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    accessTokenCipher: encryptToken("access-token"),
    refreshTokenCipher: encryptToken("refresh-token"),
    accessTokenExpiresAt: new Date(NOW_MS + 60 * 60 * 1000),
    lastSyncedAt: null,
    lastSyncError: null,
    connectedByUserId: "user-1",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("refreshes an expired access token before making a request", async () => {
  let connection = makeConnection({
    accessTokenExpiresAt: new Date(NOW_MS - 1000),
  });
  const authorizationHeaders: string[] = [];
  const fetchImpl: typeof fetch = (input, init) => {
    const url = String(input);
    if (url.includes("/token")) {
      const body = new URLSearchParams(String(init?.body));
      assert.equal(body.get("refresh_token"), "refresh-token");
      return Promise.resolve(
        jsonResponse({
          access_token: "fresh-access-token",
          expires_in: 3600,
          scope: "",
          token_type: "Bearer",
        })
      );
    }

    authorizationHeaders.push(
      String(new Headers(init?.headers).get("authorization"))
    );
    return Promise.resolve(
      jsonResponse({
        siteEntry: [
          { siteUrl: "sc-domain:example.com", permissionLevel: "siteOwner" },
        ],
      })
    );
  };
  const db = {
    gscConnection: {
      update: (args: {
        data: { accessTokenCipher: string; accessTokenExpiresAt: Date };
      }) => {
        connection = {
          ...connection,
          accessTokenCipher: args.data.accessTokenCipher,
          accessTokenExpiresAt: args.data.accessTokenExpiresAt,
        };
        return Promise.resolve(connection);
      },
    },
  };

  const client = new GscClient(connection, {
    db: db as never,
    fetch: fetchImpl,
    now: () => NOW_MS,
  });

  await client.listSites();

  assert.equal(
    decryptToken(connection.accessTokenCipher),
    "fresh-access-token"
  );
  assert.deepEqual(authorizationHeaders, ["Bearer fresh-access-token"]);
});

test("refreshes once after a 401 and retries the original request", async () => {
  let connection = makeConnection();
  let sitesCalls = 0;
  let tokenCalls = 0;
  const fetchImpl: typeof fetch = (input) => {
    const url = String(input);
    if (url.includes("/token")) {
      tokenCalls += 1;
      return Promise.resolve(
        jsonResponse({
          access_token: "retry-access-token",
          expires_in: 3600,
          scope: "",
          token_type: "Bearer",
        })
      );
    }

    sitesCalls += 1;
    if (sitesCalls === 1) {
      return Promise.resolve(
        jsonResponse(
          { error: { status: "UNAUTHENTICATED", message: "expired" } },
          401
        )
      );
    }

    return Promise.resolve(
      jsonResponse({
        siteEntry: [
          { siteUrl: "sc-domain:example.com", permissionLevel: "siteOwner" },
        ],
      })
    );
  };
  const db = {
    gscConnection: {
      update: (args: {
        data: { accessTokenCipher: string; accessTokenExpiresAt: Date };
      }) => {
        connection = {
          ...connection,
          accessTokenCipher: args.data.accessTokenCipher,
          accessTokenExpiresAt: args.data.accessTokenExpiresAt,
        };
        return Promise.resolve(connection);
      },
    },
  };

  const client = new GscClient(connection, {
    db: db as never,
    fetch: fetchImpl,
    now: () => NOW_MS,
  });

  await client.listSites();

  assert.equal(tokenCalls, 1);
  assert.equal(sitesCalls, 2);
  assert.equal(
    decryptToken(connection.accessTokenCipher),
    "retry-access-token"
  );
});

test("retries 429 responses with bounded backoff and throws GscApiError", async () => {
  const sleepCalls: number[] = [];
  const fetchImpl: typeof fetch = () =>
    Promise.resolve(
      jsonResponse(
        { error: { status: "RESOURCE_EXHAUSTED", message: "quota exceeded" } },
        429
      )
    );

  const client = new GscClient(makeConnection(), {
    fetch: fetchImpl,
    now: () => NOW_MS,
    sleep: (ms) => {
      sleepCalls.push(ms);
      return Promise.resolve();
    },
  });

  await assert.rejects(
    () => client.listSites(),
    (error) => {
      assert.ok(error instanceof GscApiError);
      assert.equal(error.status, 429);
      assert.equal(error.code, "RESOURCE_EXHAUSTED");
      return true;
    }
  );
  assert.deepEqual(sleepCalls, [500, 1000]);
});
