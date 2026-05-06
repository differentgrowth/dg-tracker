import type { Route } from "next";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, type Session } from "@/lib/auth";

/**
 * Returns the current session by validating against the database.
 * Returns null if there is no session. Use in Server Components or
 * Server Actions to read the authenticated user.
 */
export async function getSession(): Promise<Session | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

/**
 * Returns the session or redirects to /login. Use at the top of any
 * Server Component or Server Action that requires authentication.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    redirect("/login" as Route);
  }
  return session;
}

/**
 * Same as requireSession but additionally enforces an admin role.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.user.role !== "admin") {
    redirect("/" as Route);
  }
  return session;
}
