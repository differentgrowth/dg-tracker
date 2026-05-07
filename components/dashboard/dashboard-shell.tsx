import type { Route } from "next";

import Link from "next/link";

import {
  RiArchiveLine,
  RiBarChartBoxLine,
  RiDashboardLine,
  RiFileChartLine,
  RiFolderChartLine,
  RiSettings3Line,
  RiSparklingLine,
} from "@remixicon/react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardNavLink } from "@/components/dashboard/dashboard-nav-link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    email: string;
    name?: string | null;
    role?: string | null;
  };
}

const emailSuffixPattern = /@.*/;
const initialSeparatorPattern = /[\s._-]+/;

const navItems: { href: Route; icon: React.ReactNode; label: string }[] = [
  {
    href: "/dashboard",
    icon: <RiDashboardLine aria-hidden="true" />,
    label: "Dashboard",
  },
  {
    href: "/clients",
    icon: <RiFolderChartLine aria-hidden="true" />,
    label: "Clients",
  },
  {
    href: "/reports",
    icon: <RiFileChartLine aria-hidden="true" />,
    label: "Reports",
  },
  {
    href: "/admin",
    icon: <RiSettings3Line aria-hidden="true" />,
    label: "Admin",
  },
];

export function DashboardShell({ children, user }: DashboardShellProps) {
  const displayName = user.name || user.email;
  const initials = getInitials(displayName);

  return (
    <SidebarProvider>
      <Sidebar className="border-sidebar-border/80" collapsible="icon">
        <SidebarHeader className="border-sidebar-border border-b">
          <Link className="flex items-center gap-3 px-2 py-2" href="/dashboard">
            <span className="flex size-9 items-center justify-center border bg-primary text-primary-foreground shadow-[4px_4px_0_0_var(--secondary)]">
              <RiBarChartBoxLine aria-hidden="true" className="size-4" />
            </span>
            <span className="grid leading-tight group-data-[collapsible=icon]:hidden">
              <span className="font-semibold text-sm uppercase tracking-[0.22em]">
                DG Tracker
              </span>
              <span className="text-muted-foreground text-xs">
                Growth visibility desk
              </span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <DashboardNavLink {...item} />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="mt-auto group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>MVP Track</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="mx-2 border bg-sidebar p-3 shadow-[6px_6px_0_0_var(--border)]">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest">
                  <RiSparklingLine aria-hidden="true" className="size-3.5" />
                  Phase 1
                </div>
                <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
                  Shell, empty states, and read-only client visibility before
                  CRUD and GSC sync.
                </p>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-sidebar-border border-t">
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
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:px-6">
          <SidebarTrigger />
          <Separator className="h-6" orientation="vertical" />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <RiArchiveLine aria-hidden="true" className="size-4 text-primary" />
            <p className="truncate font-medium text-sm uppercase tracking-[0.18em]">
              Internal SEO rank tracking
            </p>
          </div>
          <SignOutButton />
        </header>
        <div className="relative min-h-[calc(100svh-4rem)] overflow-hidden bg-[radial-gradient(circle_at_top_right,var(--primary)_0,transparent_18rem),linear-gradient(135deg,transparent_0,transparent_72%,var(--muted)_72%)]/100%_100%">
          <div className="absolute inset-0 -z-0 opacity-[0.04] [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [background-size:32px_32px]" />
          <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function getInitials(value: string) {
  const parts = value
    .replace(emailSuffixPattern, "")
    .split(initialSeparatorPattern)
    .filter(Boolean);

  return (parts[0]?.[0] ?? "D").concat(parts[1]?.[0] ?? "G").toUpperCase();
}
