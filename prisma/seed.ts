/**
 * Seeds the database with a known admin and a couple of sample member users
 * so a fresh local environment is immediately usable.
 *
 * Usage:
 *   pnpm db:seed
 *
 * Idempotent: skips users that already exist.
 *
 * Goes through better-auth's server-side sign-up API (same path as
 * scripts/create-user.ts) so password hashing and account creation match
 * normal sign-ups. The 12-character minimum from `lib/auth.ts` is honored.
 */
import "dotenv/config";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SEED_PASSWORD = "password1234";

const USERS = [
  { email: "admin@local.com", name: "Admin", role: "admin" },
  { email: "member1@local.com", name: "Member One", role: "member" },
  { email: "member2@local.com", name: "Member Two", role: "member" },
] as const;

async function seedUser(entry: (typeof USERS)[number]) {
  const existing = await prisma.user.findUnique({
    where: { email: entry.email },
    select: { id: true },
  });
  if (existing) {
    process.stdout.write(`skipped ${entry.email} (already exists)\n`);
    return;
  }

  const result = await auth.api.signUpEmail({
    body: {
      email: entry.email,
      password: SEED_PASSWORD,
      name: entry.name,
    },
    asResponse: false,
  });

  if (!result?.user) {
    throw new Error(`Failed to create ${entry.email} (no user returned).`);
  }

  if (entry.role === "admin") {
    await prisma.user.update({
      where: { id: result.user.id },
      data: { role: "admin" },
    });
  }

  process.stdout.write(`created ${entry.email} (role=${entry.role})\n`);
}

async function main() {
  for (const entry of USERS) {
    await seedUser(entry);
  }
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
