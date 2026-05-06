"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function onSignOut() {
    setIsPending(true);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      disabled={isPending}
      onClick={onSignOut}
      type="button"
      variant="ghost"
    >
      {isPending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
