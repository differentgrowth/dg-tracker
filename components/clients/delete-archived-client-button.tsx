"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
import { deleteArchivedClientAction } from "@/lib/actions/clients/delete-archived-client";

interface DeleteArchivedClientButtonProps {
  clientId: string;
  status: string;
}

export function DeleteArchivedClientButton({
  clientId,
  status,
}: DeleteArchivedClientButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "archived") {
    return null;
  }

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteArchivedClientAction(clientId);

      if (result.status !== "success") {
        setError(
          result.status === "error" && result.formError
            ? result.formError
            : "Could not remove the archived client."
        );
        return;
      }

      setOpen(false);
      router.replace("/clients?status=archived");
    });
  }

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger
        render={
          <Button disabled={isPending} variant="destructive">
            Remove
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this archived client?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the client and cascades its domains,
            keywords, ranking snapshots, GSC connection, GSC performance
            snapshots, and reports. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={onConfirm}
            variant="destructive"
          >
            Remove permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
