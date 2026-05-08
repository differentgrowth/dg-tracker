import type { GscConnection } from "@/lib/generated/prisma/client";
import type {
  OAuthTokenResponse,
  SearchAnalyticsRequest,
  SearchAnalyticsResponse,
  SearchAnalyticsRow,
  SiteEntry,
  SitesListResponse,
} from "@/lib/integrations/gsc/types";

import { getEnv } from "@/lib/env";
import { decryptToken, encryptToken } from "@/lib/integrations/gsc/crypto";
import { GscApiError } from "@/lib/integrations/gsc/errors";
import { prisma } from "@/lib/prisma";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SITES_ENDPOINT = "https://www.googleapis.com/webmasters/v3/sites";
const SEARCH_ANALYTICS_ROW_LIMIT = 25_000;
const REFRESH_SKEW_MS = 60_000;
const MAX_RETRIES = 3;

interface GscClientDependencies {
  db?: Pick<typeof prisma, "gscConnection">;
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

interface GoogleErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

async function parseError(
  res: Response,
  fallback: string
): Promise<GscApiError> {
  let code: string | undefined;
  let message = fallback;
  try {
    const body = (await res.json()) as GoogleErrorBody;
    if (body.error?.message) {
      message = body.error.message;
    }
    if (body.error?.status) {
      code = body.error.status;
    }
  } catch {
    // non-JSON error; keep fallback message
  }
  return new GscApiError({ status: res.status, code, message });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Exchange an authorization code for tokens. Used by the OAuth callback.
 */
export async function exchangeAuthorizationCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  idToken: string | undefined;
  scope: string;
}> {
  const env = getEnv();
  const params = new URLSearchParams({
    code,
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    throw await parseError(res, "Failed to exchange authorization code");
  }
  const json = (await res.json()) as OAuthTokenResponse;
  if (!json.refresh_token) {
    throw new Error(
      "Google did not return a refresh_token. Re-run the consent flow with prompt=consent."
    );
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
    idToken: json.id_token,
    scope: json.scope,
  };
}

/**
 * Best-effort revoke at Google. Never throws.
 */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  try {
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`,
      { method: "POST" }
    );
  } catch {
    // best effort
  }
}

/**
 * Per-connection client. Refreshes the access token automatically.
 */
export class GscClient {
  private connection: GscConnection;
  private readonly db: Pick<typeof prisma, "gscConnection">;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly sleepImpl: (ms: number) => Promise<void>;

  constructor(connection: GscConnection, deps: GscClientDependencies = {}) {
    this.connection = connection;
    this.db = deps.db ?? prisma;
    this.fetchImpl = deps.fetch ?? fetch;
    this.now = deps.now ?? Date.now;
    this.sleepImpl = deps.sleep ?? sleep;
  }

  static async forClientId(clientId: string): Promise<GscClient> {
    const connection = await prisma.gscConnection.findUnique({
      where: { clientId },
    });
    if (!connection) {
      throw new Error(`No GSC connection for client ${clientId}`);
    }
    return new GscClient(connection);
  }

  private async getAccessToken(): Promise<string> {
    const expiresAt = this.connection.accessTokenExpiresAt.getTime();
    if (expiresAt - REFRESH_SKEW_MS > this.now()) {
      return decryptToken(this.connection.accessTokenCipher);
    }
    await this.refreshAccessToken();
    return decryptToken(this.connection.accessTokenCipher);
  }

  private async refreshAccessToken(): Promise<void> {
    const env = getEnv();
    const refreshToken = decryptToken(this.connection.refreshTokenCipher);
    const params = new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    const res = await this.fetchImpl(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!res.ok) {
      throw await parseError(res, "Failed to refresh access token");
    }
    const json = (await res.json()) as OAuthTokenResponse;
    const newAccess = json.access_token;
    const newExpiresAt = new Date(this.now() + json.expires_in * 1000);
    this.connection = await this.db.gscConnection.update({
      where: { id: this.connection.id },
      data: {
        accessTokenCipher: encryptToken(newAccess),
        accessTokenExpiresAt: newExpiresAt,
      },
    });
  }

  private async authorizedFetch(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    let lastError: GscApiError | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const accessToken = await this.getAccessToken();
      const res = await this.fetchImpl(url, {
        ...init,
        headers: {
          ...init.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        return res;
      }
      if (res.status === 401 && attempt === 0) {
        await this.refreshAccessToken();
        continue;
      }
      const err = await parseError(res, `GSC request failed: ${res.status}`);
      if (!err.retryable || attempt === MAX_RETRIES - 1) {
        throw err;
      }
      lastError = err;
      const backoffMs = 2 ** attempt * 500;
      await this.sleepImpl(backoffMs);
    }
    throw lastError ?? new Error("GSC request exhausted retries");
  }

  async listSites(): Promise<SiteEntry[]> {
    const res = await this.authorizedFetch(SITES_ENDPOINT, { method: "GET" });
    const json = (await res.json()) as SitesListResponse;
    return json.siteEntry ?? [];
  }

  /**
   * Paginated wrapper around searchAnalytics.query. Returns every row across
   * pages — caller is responsible for keeping the date range bounded.
   */
  async searchAnalyticsQuery(
    siteUrl: string,
    body: Omit<SearchAnalyticsRequest, "rowLimit" | "startRow">
  ): Promise<SearchAnalyticsRow[]> {
    const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      siteUrl
    )}/searchAnalytics/query`;
    const all: SearchAnalyticsRow[] = [];
    let startRow = 0;
    while (true) {
      const requestBody: SearchAnalyticsRequest = {
        ...body,
        rowLimit: SEARCH_ANALYTICS_ROW_LIMIT,
        startRow,
      };
      const res = await this.authorizedFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const json = (await res.json()) as SearchAnalyticsResponse;
      const rows = json.rows ?? [];
      all.push(...rows);
      if (rows.length < SEARCH_ANALYTICS_ROW_LIMIT) {
        break;
      }
      startRow += SEARCH_ANALYTICS_ROW_LIMIT;
    }
    return all;
  }
}
