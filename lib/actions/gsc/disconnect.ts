"use server";

import type { ActionResult } from "@/lib/actions/types";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/session";
import { redactError } from "@/lib/errors";
import { revokeRefreshToken } from "@/lib/integrations/gsc/client";
import { decryptToken } from "@/lib/integrations/gsc/crypto";
import { prisma } from "@/lib/prisma";
import { disconnectGscSchema } from "@/lib/validators/gsc";

export async function disconnectGscAction(
  clientId: string
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = disconnectGscSchema.safeParse({ clientId });
  if (!parsed.success) {
    return { status: "error", formError: "Invalid client id." };
  }

  try {
    const connection = await prisma.gscConnection.findUnique({
      where: { clientId: parsed.data.clientId },
    });
    if (!connection) {
      return { status: "success" };
    }

    try {
      const refresh = decryptToken(connection.refreshTokenCipher);
      await revokeRefreshToken(refresh);
    } catch (error) {
      console.error("disconnectGscAction: revoke failed", {
        clientId: parsed.data.clientId,
        error: redactError(error),
      });
    }

    await prisma.gscConnection.delete({ where: { id: connection.id } });

    revalidatePath(`/clients/${parsed.data.clientId}`);
    return { status: "success" };
  } catch (error) {
    console.error("disconnectGscAction failed", {
      clientId: parsed.data.clientId,
      error: redactError(error),
    });
    return {
      status: "error",
      formError: "Could not disconnect Google Search Console.",
    };
  }
}
