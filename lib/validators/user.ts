import { z } from "zod";

export const USER_ROLES = ["member", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

const trimmed = z.string().trim();

export const userCreateSchema = z.object({
  name: trimmed.min(1, "Name is required").max(120, "Name is too long"),
  email: trimmed
    .toLowerCase()
    .max(254, "Email is too long")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128, "Password is too long"),
  role: z.enum(USER_ROLES).default("member"),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
