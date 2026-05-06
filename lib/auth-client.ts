import type { auth } from "@/lib/auth";

import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});

export type AuthClient = typeof authClient;
export type Session = typeof auth.$Infer.Session;

export const { signIn, signOut, useSession } = authClient;
