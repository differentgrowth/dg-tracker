import { requireSession } from "@/lib/auth/session";

export default async function DashboardPage() {
  const session = await requireSession();

  return (
    <main className="flex min-h-svh flex-col gap-2 p-6">
      <h1 className="font-medium">Dashboard</h1>
      <p className="text-muted-foreground text-sm">
        Signed in as {session.user.email}. Dashboard content coming soon.
      </p>
    </main>
  );
}
