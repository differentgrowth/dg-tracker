"use client";

import { useTransition } from "react";

import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { startGscConnectAction } from "@/lib/actions/gsc/connect";
import { disconnectGscAction } from "@/lib/actions/gsc/disconnect";
import { syncGscNowAction } from "@/lib/actions/gsc/sync";

const REQUIRED_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

interface GscConnectionPanelProps {
  canManageConnection: boolean;
  clientId: string;
  connection: {
    googleAccountEmail: string;
    gscSiteUrl: string;
    lastSyncedAt: Date | null;
    lastSyncError: string | null;
    scopes: string[];
  } | null;
  gscProperty: string | null;
  keywordCount: number;
  notice: {
    message: string;
    tone: "error" | "success";
  } | null;
}

export function GscConnectionPanel({
  canManageConnection,
  clientId,
  gscProperty,
  connection,
  keywordCount,
  notice,
}: GscConnectionPanelProps) {
  const [isPending, startTransition] = useTransition();
  const hasRequiredScope = connection?.scopes.includes(REQUIRED_SCOPE) ?? false;
  const canSync = Boolean(connection && hasRequiredScope && keywordCount > 0);

  function handleConnect() {
    startTransition(async () => {
      const result = await startGscConnectAction(clientId);
      if (result.status === "success" && result.url) {
        window.location.href = result.url;
        return;
      }
      toast.error(
        result.status === "error" && result.formError
          ? result.formError
          : "Could not start GSC connection."
      );
    });
  }

  function handleSync() {
    startTransition(async () => {
      const result = await syncGscNowAction(clientId, 28);
      if (result.status === "success") {
        toast.success("GSC sync complete.");
        return;
      }
      toast.error(
        result.status === "error" && result.formError
          ? result.formError
          : "GSC sync failed."
      );
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      const result = await disconnectGscAction(clientId);
      if (result.status === "success") {
        toast.success("Disconnected from Google Search Console.");
        return;
      }
      toast.error(
        result.status === "error" && result.formError
          ? result.formError
          : "Could not disconnect."
      );
    });
  }

  if (!gscProperty) {
    return (
      <Card className="bg-card/95">
        <CardHeader>
          <CardTitle>Google Search Console</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {notice ? <GscNotice notice={notice} /> : null}
          <p className="text-muted-foreground text-sm">
            Set the GSC property string on this client (Edit → GSC property)
            before connecting an account.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!connection) {
    return (
      <Card className="bg-card/95">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Google Search Console</CardTitle>
          <Badge variant="secondary">Not connected</Badge>
        </CardHeader>
        <CardContent className="grid gap-3">
          {notice ? <GscNotice notice={notice} /> : null}
          <p className="text-muted-foreground text-sm">
            Property: <span className="font-mono">{gscProperty}</span>
          </p>
          {canManageConnection ? (
            <div>
              <Button disabled={isPending} onClick={handleConnect}>
                Connect Google Search Console
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Admin access is required to connect a Google account.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/95">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Google Search Console</CardTitle>
        <Badge>Connected</Badge>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {notice ? <GscNotice notice={notice} /> : null}
        <div className="grid gap-1">
          <span className="text-muted-foreground">Connected account</span>
          <span className="font-medium">{connection.googleAccountEmail}</span>
        </div>
        <div className="grid gap-1">
          <span className="text-muted-foreground">Property</span>
          <span className="font-mono">{connection.gscSiteUrl}</span>
        </div>
        <div className="grid gap-1">
          <span className="text-muted-foreground">Last sync</span>
          <span>
            {connection.lastSyncedAt
              ? new Intl.DateTimeFormat("en", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(connection.lastSyncedAt)
              : "Never"}
          </span>
        </div>
        {connection.lastSyncError ? (
          <div className="grid gap-1 border border-destructive/40 bg-destructive/10 p-3">
            <span className="text-destructive text-xs uppercase tracking-widest">
              Last error
            </span>
            <span className="text-destructive">{connection.lastSyncError}</span>
          </div>
        ) : null}
        {hasRequiredScope ? null : (
          <div className="grid gap-1 border border-destructive/40 bg-destructive/10 p-3">
            <span className="text-destructive text-xs uppercase tracking-widest">
              Scope missing
            </span>
            <span className="text-destructive">
              Reconnect and approve Search Console read access before syncing.
            </span>
          </div>
        )}
        {keywordCount === 0 ? (
          <p className="text-muted-foreground">
            Add tracked keywords before running the first GSC sync.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button disabled={isPending || !canSync} onClick={handleSync}>
            Sync now
          </Button>
          {canManageConnection ? (
            <Button
              disabled={isPending}
              onClick={handleDisconnect}
              variant="outline"
            >
              Disconnect
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function GscNotice({
  notice,
}: {
  notice: NonNullable<GscConnectionPanelProps["notice"]>;
}) {
  return (
    <Alert variant={notice.tone === "error" ? "destructive" : "default"}>
      <AlertDescription>{notice.message}</AlertDescription>
    </Alert>
  );
}
