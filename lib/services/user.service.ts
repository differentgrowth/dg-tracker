import type { UserCreateInput } from "@/lib/validators/user";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export class CreateUserError extends Error {
  readonly code: "duplicate_email" | "auth_failed";

  constructor(code: "duplicate_email" | "auth_failed", message: string) {
    super(message);
    this.code = code;
    this.name = "CreateUserError";
  }
}

export function isCreateUserError(error: unknown): error is CreateUserError {
  return error instanceof CreateUserError;
}

/**
 * Provisions an internal app user through Better Auth so password hashing and
 * credential account records stay consistent with normal email sign-ups.
 */
export async function createUser(data: UserCreateInput) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });

  if (existing) {
    throw new CreateUserError(
      "duplicate_email",
      "A user with this email already exists."
    );
  }

  const result = await auth.api.signUpEmail({
    body: {
      email: data.email,
      password: data.password,
      name: data.name,
    },
    asResponse: false,
  });

  if (!result?.user) {
    throw new CreateUserError(
      "auth_failed",
      "Better Auth did not return a created user."
    );
  }

  const createdUser = await prisma.user.findUnique({
    where: { id: result.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!createdUser) {
    throw new CreateUserError(
      "duplicate_email",
      "A user with this email already exists."
    );
  }

  if (data.role === "admin") {
    return prisma.user.update({
      where: { id: createdUser.id },
      data: { role: "admin" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }

  return createdUser;
}
