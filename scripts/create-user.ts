/**
 * Internal CLI for provisioning users.
 *
 * Usage:
 *   pnpm tsx scripts/create-user.ts --email user@example.com --name "Jane Doe" --password "secret-pass" [--role admin]
 *
 * This bypasses the public sign-up route (which is blocked at the
 * middleware layer) by calling better-auth's server-side API directly,
 * then promoting the role to "admin" via Prisma if requested.
 */
import "dotenv/config";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Args {
  email: string;
  name: string;
  password: string;
  role: "admin" | "member";
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = { role: "member" };

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];

    switch (flag) {
      case "--email":
        args.email = value;
        i += 1;
        break;
      case "--name":
        args.name = value;
        i += 1;
        break;
      case "--password":
        args.password = value;
        i += 1;
        break;
      case "--role":
        if (value !== "admin" && value !== "member") {
          throw new Error(
            `--role must be "admin" or "member" (got "${value}")`
          );
        }
        args.role = value;
        i += 1;
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
        break;
      default:
        if (flag.startsWith("--")) {
          throw new Error(`Unknown flag: ${flag}`);
        }
    }
  }

  if (!args.email) {
    throw new Error("--email is required");
  }
  if (!args.name) {
    throw new Error("--name is required");
  }
  if (!args.password) {
    throw new Error("--password is required");
  }
  if (args.password.length < 12) {
    throw new Error("--password must be at least 12 characters");
  }

  return args as Args;
}

function printUsage() {
  process.stdout.write(
    [
      "Usage: pnpm tsx scripts/create-user.ts \\",
      "         --email user@example.com \\",
      '         --name "Jane Doe" \\',
      '         --password "at-least-12-characters" \\',
      "         [--role admin|member]",
      "",
    ].join("\n")
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const existing = await prisma.user.findUnique({
    where: { email: args.email },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`A user with email ${args.email} already exists.`);
  }

  const result = await auth.api.signUpEmail({
    body: {
      email: args.email,
      password: args.password,
      name: args.name,
    },
    asResponse: false,
  });

  if (!result?.user) {
    throw new Error("Failed to create user (no user returned).");
  }

  if (args.role === "admin") {
    await prisma.user.update({
      where: { id: result.user.id },
      data: { role: "admin" },
    });
  }

  process.stdout.write(
    `Created user ${result.user.email} (id=${result.user.id}, role=${args.role}).\n`
  );
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
