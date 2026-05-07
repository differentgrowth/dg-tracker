"use client";

import { useState, useTransition } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  archiveClientAction,
  restoreClientAction,
} from "@/lib/actions/clients/archive-client";

interface ArchiveClientButtonProps {
  clientId: string;
  status: string;
}

export function ArchiveClientButton({
  clientId,
  status,
}: ArchiveClientButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const isArchived = status === "archived";

  function onConfirm() {
    startTransition(async () => {
      if (isArchived) {
        await restoreClientAction(clientId);
      } else {
        await archiveClientAction(clientId);
      }
      setOpen(false);
    });
  }

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger
        render={
          <Button disabled={isPending} variant="outline">
            {isArchived ? "Restore" : "Archive"}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isArchived ? "Restore this client?" : "Archive this client?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isArchived
              ? "Restoring sets the client status back to active and surfaces it in default dashboards again."
              : "Archiving keeps every domain, keyword, and ranking snapshot intact. The client is hidden from default dashboards but stays accessible under the Archived tab."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={onConfirm}>
            {isArchived ? "Restore" : "Archive"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
