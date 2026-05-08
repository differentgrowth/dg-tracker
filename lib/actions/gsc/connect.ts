"use server";

import type { ActionResult } from "@/lib/actions/types";
import { randomBytes } from "node:crypto";

import { requireAdmin } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { redactError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { connectGscSchema } from "@/lib/validators/gsc";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const STATE_TTL_MS = 10 * 60 * 1000;

type ConnectResult = ActionResult & { url?: string };

export async function startGscConnectAction(
  clientId: string
): Promise<ConnectResult> {
  const session = await requireAdmin();

  const parsed = connectGscSchema.safeParse({ clientId });
  if (!parsed.success) {
    return { status: "error", formError: "Invalid client id." };
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id: parsed.data.clientId },
      select: { id: true, gscProperty: true },
    });
    if (!client) {
      return { status: "error", formError: "Client not found." };
    }
    if (!client.gscProperty) {
      return {
        status: "error",
        formError:
          "Set the GSC property string on this client before connecting.",
      };
    }

    const env = getEnv();
    const state = randomBytes(32).toString("base64url");
    await prisma.verification.create({
      data: {
        identifier: `gsc-oauth:${state}`,
        value: JSON.stringify({
          userId: session.user.id,
          clientId: client.id,
        }),
        expiresAt: new Date(Date.now() + STATE_TTL_MS),
      },
    });

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", env.GOOGLE_OAUTH_CLIENT_ID);
    url.searchParams.set("redirect_uri", env.GOOGLE_OAUTH_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", `openid email ${GSC_SCOPE}`);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("state", state);

    return { status: "success", url: url.toString() };
  } catch (error) {
    console.error("startGscConnectAction failed", {
      clientId: parsed.data.clientId,
      error: redactError(error),
    });
    return {
      status: "error",
      formError: "Could not start the GSC connection. Check configuration.",
    };
  }
}
