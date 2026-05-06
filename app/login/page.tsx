import type { Route } from "next";

import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

function safeRedirect(target: string | undefined): Route {
  if (target?.startsWith("/") && !target.startsWith("//")) {
    return target as Route;
  }
  return "/" as Route;
}

export default function LoginPage(props: LoginPageProps) {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Suspense fallback={<LoginCardSkeleton />}>
        <LoginCard searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginCard({ searchParams }: LoginPageProps) {
  const [session, params] = await Promise.all([getSession(), searchParams]);

  if (session) {
    redirect(safeRedirect(params.redirectTo));
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in to DG Tracker</CardTitle>
        <CardDescription>
          Internal tool. Accounts are provisioned by an administrator.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}

function LoginCardSkeleton() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in to DG Tracker</CardTitle>
        <CardDescription>Loading…</CardDescription>
      </CardHeader>
    </Card>
  );
}
