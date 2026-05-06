import type { Route } from "next";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";

export default async function Page() {
  const session = await getSession();
  redirect((session ? "/dashboard" : "/login") as Route);
}
