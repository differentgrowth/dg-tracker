import assert from "node:assert/strict";
import test from "node:test";

const { USER_ROLES, userCreateSchema } = await import("@/lib/validators/user");

test("userCreateSchema normalizes admin-entered identity fields", () => {
  const parsed = userCreateSchema.safeParse({
    email: " Jane@DifferentGrowth.COM ",
    name: " Jane Doe ",
    password: "password1234",
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) {
    return;
  }

  assert.equal(parsed.data.email, "jane@differentgrowth.com");
  assert.equal(parsed.data.name, "Jane Doe");
  assert.equal(parsed.data.role, "member");
});

test("userCreateSchema enforces temporary password length", () => {
  const parsed = userCreateSchema.safeParse({
    email: "jane@differentgrowth.com",
    name: "Jane Doe",
    password: "too-short",
  });

  assert.equal(parsed.success, false);
  if (parsed.success) {
    return;
  }

  assert.deepEqual(parsed.error.flatten().fieldErrors.password, [
    "Password must be at least 12 characters",
  ]);
});

test("userCreateSchema only allows supported internal roles", () => {
  assert.deepEqual(USER_ROLES, ["member", "admin"]);

  const parsed = userCreateSchema.safeParse({
    email: "jane@differentgrowth.com",
    name: "Jane Doe",
    password: "password1234",
    role: "owner",
  });

  assert.equal(parsed.success, false);
});
