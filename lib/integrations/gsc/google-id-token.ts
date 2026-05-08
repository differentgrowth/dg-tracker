import { createPublicKey, createVerify } from "node:crypto";

import { getEnv } from "@/lib/env";

interface GoogleJwk {
  alg: string;
  e: string;
  kid: string;
  kty: string;
  n: string;
  use: string;
}

interface GoogleJwks {
  keys: GoogleJwk[];
}

interface IdTokenPayload {
  aud: string;
  azp?: string;
  email: string;
  email_verified?: boolean;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
}

const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ALLOWED_ISSUERS = new Set([
  "accounts.google.com",
  "https://accounts.google.com",
]);

let cachedJwks: { keys: Map<string, GoogleJwk>; fetchedAt: number } | null =
  null;
const JWKS_TTL_MS = 60 * 60 * 1000;

async function getJwks(): Promise<Map<string, GoogleJwk>> {
  const now = Date.now();
  if (cachedJwks && now - cachedJwks.fetchedAt < JWKS_TTL_MS) {
    return cachedJwks.keys;
  }
  const res = await fetch(JWKS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Google JWKS: ${res.status}`);
  }
  const json = (await res.json()) as GoogleJwks;
  const keys = new Map<string, GoogleJwk>();
  for (const key of json.keys) {
    keys.set(key.kid, key);
  }
  cachedJwks = { keys, fetchedAt: now };
  return keys;
}

function base64UrlDecode(input: string): Buffer {
  const padded = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

function jwkToPem(jwk: GoogleJwk): string {
  const keyObject = createPublicKey({
    key: {
      kty: jwk.kty,
      n: jwk.n,
      e: jwk.e,
    },
    format: "jwk",
  });
  return keyObject.export({ format: "pem", type: "spki" }).toString();
}

/**
 * Verifies the signature, issuer, audience, and expiry of a Google id_token
 * and returns its payload. Throws on any validation failure.
 */
export async function verifyGoogleIdToken(
  idToken: string
): Promise<IdTokenPayload> {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed id_token");
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(base64UrlDecode(headerB64).toString("utf8")) as {
    alg: string;
    kid: string;
  };
  if (header.alg !== "RS256") {
    throw new Error(`Unsupported id_token algorithm: ${header.alg}`);
  }

  const jwks = await getJwks();
  const jwk = jwks.get(header.kid);
  if (!jwk) {
    throw new Error("Google signing key not found for id_token kid");
  }

  const pem = jwkToPem(jwk);
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const signature = base64UrlDecode(signatureB64);
  if (!verifier.verify(pem, signature)) {
    throw new Error("Invalid id_token signature");
  }

  const payload = JSON.parse(
    base64UrlDecode(payloadB64).toString("utf8")
  ) as IdTokenPayload;

  if (!ALLOWED_ISSUERS.has(payload.iss)) {
    throw new Error(`Unexpected id_token issuer: ${payload.iss}`);
  }
  const expectedAud = getEnv().GOOGLE_OAUTH_CLIENT_ID;
  if (payload.aud !== expectedAud) {
    throw new Error("id_token aud mismatch");
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp < nowSeconds) {
    throw new Error("id_token expired");
  }

  return payload;
}
