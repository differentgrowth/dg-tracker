import type {
  GscConnection,
  Verification,
} from "@/lib/generated/prisma/client";
import type { SiteEntry } from "@/lib/integrations/gsc/types";

import { getSession } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { redactError } from "@/lib/errors";
import {
  exchangeAuthorizationCode,
  GscClient,
} from "@/lib/integrations/gsc/client";
import { encryptToken } from "@/lib/integrations/gsc/crypto";
import { verifyGoogleIdToken } from "@/lib/integrations/gsc/google-id-token";
import { prisma } from "@/lib/prisma";

const REQUIRED_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const SCOPE_SPLIT_PATTERN = /\s+/;
const TRAILING_SLASH_PATTERN = /\/$/;
const AUTHORIZED_PERMISSION_LEVELS = new Set([
  "siteFullUser",
  "siteOwner",
  "siteRestrictedUser",
]);

interface CallbackSession {
  user: { id: string };
}

interface CallbackClientRecord {
  gscProperty: string | null;
  id: string;
}

interface GscOAuthCallbackDb {
  client: {
    findUnique(args: {
      select: { gscProperty: true; id: true };
      where: { id: string };
    }): Promise<CallbackClientRecord | null>;
  };
  gscConnection: {
    delete(args: { where: { id: string } }): Promise<unknown>;
    update(args: {
      data: { gscSiteUrl: string };
      where: { id: string };
    }): Promise<GscConnection>;
    upsert(args: {
      create: {
        accessTokenCipher: string;
        accessTokenExpiresAt: Date;
        clientId: string;
        connectedByUserId: string;
        googleAccountEmail: string;
        googleAccountSubject: string;
        gscSiteUrl: string;
        refreshTokenCipher: string;
        scopes: string[];
      };
      update: {
        accessTokenCipher: string;
        accessTokenExpiresAt: Date;
        connectedByUserId: string;
        googleAccountEmail: string;
        googleAccountSubject: string;
        gscSiteUrl: string;
        lastSyncError: null;
        refreshTokenCipher: string;
        scopes: string[];
      };
      where: { clientId: string };
    }): Promise<GscConnection>;
  };
  verification: {
    delete(args: { where: { id: string } }): Promise<unknown>;
    findFirst(args: {
      where: { identifier: string };
    }): Promise<Verification | null>;
  };
}

interface GscOAuthCallbackDependencies {
  appUrl?: string;
  createGscClient?: (connection: GscConnection) => {
    listSites(): Promise<SiteEntry[]>;
  };
  db?: GscOAuthCallbackDb;
  encrypt?: (plaintext: string) => string;
  exchangeCode?: typeof exchangeAuthorizationCode;
  getSession?: () => Promise<CallbackSession | null>;
  logError?: (message: string, meta: Record<string, unknown>) => void;
  now?: () => Date;
  verifyIdToken?: typeof verifyGoogleIdToken;
}

interface StatePayload {
  clientId: string;
  userId: string;
}

export interface GscOAuthCallbackResult {
  reason?: string;
  redirectUrl: URL;
  status: "connected" | "error";
}

function redirectWithError(
  appUrl: string,
  clientId: string | null,
  reason: string
): GscOAuthCallbackResult {
  const target = new URL(
    clientId ? `/clients/${clientId}` : "/dashboard",
    appUrl
  );
  target.searchParams.set("gsc", "error");
  target.searchParams.set("reason", reason);
  return { status: "error", reason, redirectUrl: target };
}

function redirectWithSuccess(
  appUrl: string,
  clientId: string
): GscOAuthCallbackResult {
  const target = new URL(`/clients/${clientId}`, appUrl);
  target.searchParams.set("gsc", "connected");
  return { status: "connected", redirectUrl: target };
}

function parseStatePayload(value: string): StatePayload | null {
  try {
    const parsed = JSON.parse(value) as Partial<StatePayload>;
    if (
      typeof parsed.clientId === "string" &&
      typeof parsed.userId === "string"
    ) {
      return { clientId: parsed.clientId, userId: parsed.userId };
    }
  } catch {
    return null;
  }

  return null;
}

function normalizePath(pathname: string): string {
  return pathname.replace(TRAILING_SLASH_PATTERN, "");
}

export function normalizeGscSiteUrl(siteUrl: string): string {
  if (siteUrl.startsWith("sc-domain:")) {
    return siteUrl.toLowerCase();
  }

  try {
    const url = new URL(siteUrl);
    return `${url.protocol}//${url.host}${normalizePath(url.pathname)}`;
  } catch {
    return siteUrl;
  }
}

export function findAuthorizedGscSite(
  sites: SiteEntry[],
  requestedProperty: string
): SiteEntry | null {
  const normalizedRequested = normalizeGscSiteUrl(requestedProperty);

  return (
    sites.find(
      (site) =>
        normalizeGscSiteUrl(site.siteUrl) === normalizedRequested &&
        AUTHORIZED_PERMISSION_LEVELS.has(site.permissionLevel)
    ) ?? null
  );
}

function defaultLogError(message: string, meta: Record<string, unknown>): void {
  console.error(message, meta);
}

function getDependencies(deps: GscOAuthCallbackDependencies) {
  const env = deps.appUrl ? null : getEnv();

  return {
    appUrl: deps.appUrl ?? env?.APP_URL ?? "",
    createGscClient:
      deps.createGscClient ??
      ((connection: GscConnection) => new GscClient(connection)),
    db: deps.db ?? prisma,
    encrypt: deps.encrypt ?? encryptToken,
    exchangeCode: deps.exchangeCode ?? exchangeAuthorizationCode,
    getSession: deps.getSession ?? getSession,
    logError: deps.logError ?? defaultLogError,
    now: deps.now ?? (() => new Date()),
    verifyIdToken: deps.verifyIdToken ?? verifyGoogleIdToken,
  };
}

export async function handleGscOAuthCallback(
  requestUrl: string,
  deps: GscOAuthCallbackDependencies = {}
): Promise<GscOAuthCallbackResult> {
  const {
    appUrl,
    createGscClient,
    db,
    encrypt,
    exchangeCode,
    getSession: readSession,
    logError,
    now,
    verifyIdToken,
  } = getDependencies(deps);
  const url = new URL(requestUrl);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return redirectWithError(appUrl, null, oauthError);
  }
  if (!(code && state)) {
    return redirectWithError(appUrl, null, "missing_params");
  }

  const verification = await db.verification.findFirst({
    where: { identifier: `gsc-oauth:${state}` },
  });
  if (!verification || verification.expiresAt < now()) {
    if (verification) {
      await db.verification.delete({ where: { id: verification.id } });
    }
    return redirectWithError(appUrl, null, "invalid_state");
  }
  await db.verification.delete({ where: { id: verification.id } });

  const payload = parseStatePayload(verification.value);
  if (!payload) {
    return redirectWithError(appUrl, null, "invalid_state");
  }

  const session = await readSession();
  if (!session || session.user.id !== payload.userId) {
    return redirectWithError(appUrl, payload.clientId, "session_mismatch");
  }

  const client = await db.client.findUnique({
    where: { id: payload.clientId },
    select: { id: true, gscProperty: true },
  });
  if (!client?.gscProperty) {
    return redirectWithError(
      appUrl,
      payload.clientId,
      "client_missing_property"
    );
  }

  let tokens: Awaited<ReturnType<typeof exchangeAuthorizationCode>>;
  try {
    tokens = await exchangeCode(code);
  } catch (error) {
    logError("gsc oauth: exchange failed", {
      clientId: payload.clientId,
      error: redactError(error),
    });
    return redirectWithError(appUrl, payload.clientId, "token_exchange_failed");
  }

  const grantedScopes = tokens.scope.split(SCOPE_SPLIT_PATTERN).filter(Boolean);
  if (!grantedScopes.includes(REQUIRED_SCOPE)) {
    return redirectWithError(appUrl, payload.clientId, "scope_missing");
  }

  if (!tokens.idToken) {
    return redirectWithError(appUrl, payload.clientId, "id_token_missing");
  }

  let identity: { email: string; sub: string };
  try {
    const verified = await verifyIdToken(tokens.idToken);
    identity = { sub: verified.sub, email: verified.email };
  } catch (error) {
    logError("gsc oauth: id_token verification failed", {
      clientId: payload.clientId,
      error: redactError(error),
    });
    return redirectWithError(appUrl, payload.clientId, "id_token_invalid");
  }

  const accessTokenExpiresAt = new Date(
    now().getTime() + tokens.expiresIn * 1000
  );
  const accessTokenCipher = encrypt(tokens.accessToken);
  const refreshTokenCipher = encrypt(tokens.refreshToken);

  const upserted = await db.gscConnection.upsert({
    where: { clientId: client.id },
    update: {
      googleAccountEmail: identity.email,
      googleAccountSubject: identity.sub,
      gscSiteUrl: client.gscProperty,
      scopes: grantedScopes,
      accessTokenCipher,
      refreshTokenCipher,
      accessTokenExpiresAt,
      lastSyncError: null,
      connectedByUserId: payload.userId,
    },
    create: {
      clientId: client.id,
      googleAccountEmail: identity.email,
      googleAccountSubject: identity.sub,
      gscSiteUrl: client.gscProperty,
      scopes: grantedScopes,
      accessTokenCipher,
      refreshTokenCipher,
      accessTokenExpiresAt,
      connectedByUserId: payload.userId,
    },
  });

  try {
    const gsc = createGscClient(upserted);
    const sites = await gsc.listSites();
    const authorizedSite = findAuthorizedGscSite(sites, client.gscProperty);
    if (!authorizedSite) {
      await db.gscConnection.delete({ where: { id: upserted.id } });
      return redirectWithError(
        appUrl,
        payload.clientId,
        "property_not_authorized"
      );
    }

    if (authorizedSite.siteUrl !== upserted.gscSiteUrl) {
      await db.gscConnection.update({
        where: { id: upserted.id },
        data: { gscSiteUrl: authorizedSite.siteUrl },
      });
    }
  } catch (error) {
    logError("gsc oauth: sites.list failed", {
      clientId: payload.clientId,
      error: redactError(error),
    });
    await db.gscConnection.delete({ where: { id: upserted.id } });
    return redirectWithError(appUrl, payload.clientId, "sites_list_failed");
  }

  return redirectWithSuccess(appUrl, client.id);
}
