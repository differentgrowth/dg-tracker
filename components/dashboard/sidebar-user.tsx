"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";

const emailSuffixPattern = /@.*/;
const initialSeparatorPattern = /[\s._-]+/;

export function SidebarUser() {
  const router = useRouter();
  const { data, isPending } = useSession();

  useEffect(() => {
    if (!(isPending || data)) {
      router.replace("/login");
      router.refresh();
    }
  }, [data, isPending, router]);

  if (isPending) {
    return (
      <div className="flex items-center gap-3 px-2 py-2 group-data-[collapsible=icon]:justify-center">
        <Skeleton className="size-9 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1 group-data-[collapsible=icon]:hidden">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { user } = data;
  const displayName = user.name || user.email;
  const initials = getInitials(displayName);

  return (
    <div className="flex items-center gap-3 px-2 py-2 group-data-[collapsible=icon]:justify-center">
      <Avatar className="size-9 border">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
        <p className="truncate font-medium text-sm">{displayName}</p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{user.role || "member"}</Badge>
        </div>
      </div>
    </div>
  );
}

function getInitials(value: string) {
  const parts = value
    .replace(emailSuffixPattern, "")
    .split(initialSeparatorPattern)
    .filter(Boolean);

  return (parts[0]?.[0] ?? "D").concat(parts[1]?.[0] ?? "G").toUpperCase();
}
