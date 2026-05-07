import type { Route } from "next";

import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RedirectGate />
    </Suspense>
  );
}

async function RedirectGate() {
  const session = await getSession();
  redirect((session ? "/dashboard" : "/login") as Route);
  return null;
}
