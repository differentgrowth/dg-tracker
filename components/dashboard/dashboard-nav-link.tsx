"use client";

import type { Route } from "next";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SidebarMenuButton } from "@/components/ui/sidebar";

interface DashboardNavLinkProps {
  href: Route;
  icon: React.ReactNode;
  label: string;
}

export function DashboardNavLink({ href, icon, label }: DashboardNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <SidebarMenuButton
      isActive={isActive}
      render={<Link href={href} />}
      tooltip={label}
    >
      {icon}
      <span>{label}</span>
    </SidebarMenuButton>
  );
}
