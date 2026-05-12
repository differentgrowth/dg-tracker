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
process.env.GSC_TOKEN_ENCRYPTION_KEY ??= Buffer.alloc(32, 9).toString("base64");

const {
  clampScheduledGscSyncDays,
  scheduledGscSyncDefaultDays,
  scheduledGscSyncMaxDays,
  scheduledGscSyncMinDays,
} = await import("@/lib/services/scheduled-gsc-sync.service");

test("scheduled GSC sync defaults to a one-day lookback for invalid domain settings", () => {
  assert.equal(
    clampScheduledGscSyncDays(Number.NaN),
    scheduledGscSyncDefaultDays
  );
  assert.equal(scheduledGscSyncDefaultDays, 1);
});

test("scheduled GSC sync caps per-domain lookback days to prevent accidental backfills", () => {
  assert.equal(clampScheduledGscSyncDays(0), scheduledGscSyncMinDays);
  assert.equal(clampScheduledGscSyncDays(3), 3);
  assert.equal(clampScheduledGscSyncDays(99), scheduledGscSyncMaxDays);
  assert.equal(scheduledGscSyncMaxDays, 7);
});
