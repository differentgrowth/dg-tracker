"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  archiveKeywordAction,
  restoreKeywordAction,
} from "@/lib/actions/keywords/archive-keyword";

interface ArchiveKeywordButtonProps {
  clientId: string;
  keywordId: string;
  status: string;
}

export function ArchiveKeywordButton({
  clientId,
  keywordId,
  status,
}: ArchiveKeywordButtonProps) {
  const [isPending, startTransition] = useTransition();
  const isArchived = status === "archived";

  function onClick() {
    startTransition(async () => {
      if (isArchived) {
        await restoreKeywordAction(clientId, keywordId);
      } else {
        await archiveKeywordAction(clientId, keywordId);
      }
    });
  }

  return (
    <Button disabled={isPending} onClick={onClick} size="sm" variant="outline">
      {isArchived ? "Restore" : "Archive"}
    </Button>
  );
}
