import type { Route } from "next";

import { Suspense } from "react";
import Link from "next/link";

import {
  RiArchiveLine,
  RiBarChartBoxLine,
  RiDashboardLine,
  RiFileChartLine,
  RiSettings3Line,
  RiSparklingLine,
  RiUserCommunityLine,
} from "@remixicon/react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardNavLink } from "@/components/dashboard/dashboard-nav-link";
import { SidebarUser } from "@/components/dashboard/sidebar-user";
import { SectionDivider } from "@/components/section-divider";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
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
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
}

const navItems: { href: Route; icon: React.ReactNode; label: string }[] = [
  {
    href: "/dashboard",
    icon: <RiDashboardLine aria-hidden="true" />,
    label: "Dashboard",
  },
  {
    href: "/clients",
    icon: <RiUserCommunityLine aria-hidden="true" />,
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

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <Sidebar className="border-sidebar-border/80" collapsible="icon">
        <SidebarHeader className="pb-0">
          <Link
            className={cn(
              "flex h-11 w-full items-center gap-3 px-2 py-2 outline-hidden ring-sidebar-ring transition-[width,height,padding,gap]",
              "focus-visible:ring-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0"
            )}
            href="/dashboard"
          >
            <span
              className={cn(
                "flex size-9 items-center justify-center border bg-primary text-primary-foreground shadow-[4px_4px_0_0_var(--secondary)]",
                "group-data-[collapsible=icon]:size-6 group-data-[collapsible=icon]:shrink-0 group-data-[collapsible=icon]:-translate-x-px group-data-[collapsible=icon]:-translate-y-px group-data-[collapsible=icon]:shadow-[2px_2px_0_0_var(--secondary)]"
              )}
            >
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
          <SectionDivider className="h-2" corners={false} />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <Suspense fallback={null}>
                      <DashboardNavLink {...item} />
                    </Suspense>
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
                  MVP progress
                </div>
                <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
                  Clients, domains, keywords, GSC sync, and ranking history are
                  live. Reports and tighter summaries are next.
                </p>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="pt-0">
          <SectionDivider className="h-2" corners={false} />
          <SidebarUser />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="flex h-16 items-center gap-3 px-4 md:px-6">
            <SidebarTrigger />
            <Separator className="h-6" orientation="vertical" />
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <RiArchiveLine
                aria-hidden="true"
                className="size-4 text-primary"
              />
              <p className="truncate font-medium text-sm uppercase tracking-[0.18em]">
                Internal SEO rank tracking
              </p>
            </div>
            <ThemeToggleButton />
            <SignOutButton />
          </div>
          <SectionDivider className="h-3" />
        </header>
        <div className="relative min-h-[calc(100svh-4rem)] overflow-hidden bg-stone-paper">
          <div className="absolute inset-0 -z-0 bg-arch-grid opacity-[0.5]" />
          <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
