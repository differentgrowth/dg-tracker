"use server";

import type { ActionResult } from "@/lib/actions/types";
import type { UserRole } from "@/lib/validators/user";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/session";
import { createUser, isCreateUserError } from "@/lib/services/user.service";
import { userCreateSchema } from "@/lib/validators/user";

type UserField = keyof typeof userCreateSchema.shape;
type CreateUserActionError = Extract<
  ActionResult<UserField>,
  { status: "error" }
>;
type CreateUserActionIdle = Extract<
  ActionResult<UserField>,
  { status: "idle" }
>;

export type CreateUserActionResult =
  | CreateUserActionError
  | CreateUserActionIdle
  | {
      status: "success";
      email: string;
      role: UserRole;
    };

export async function createUserAction(
  _prev: CreateUserActionResult,
  formData: FormData
): Promise<CreateUserActionResult> {
  await requireAdmin();

  const parsed = userCreateSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
    role: formData.get("role") ?? "member",
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors as Partial<
        Record<UserField, string[]>
      >,
    };
  }

  try {
    const user = await createUser(parsed.data);

    revalidatePath("/admin");

    return {
      status: "success",
      email: user.email,
      role: user.role as UserRole,
    };
  } catch (error) {
    if (isCreateUserError(error) && error.code === "duplicate_email") {
      return {
        status: "error",
        fieldErrors: {
          email: [error.message],
        },
      };
    }

    console.error("createUserAction failed", error);

    return {
      status: "error",
      formError: "Could not create the user. Please try again.",
    };
  }
}
