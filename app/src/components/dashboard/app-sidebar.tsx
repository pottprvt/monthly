"use client";

import { LayoutDashboardIcon, PackageIcon, PlusIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { WalletButton } from "@/components/wallet/wallet-button";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboardIcon, exact: true },
  { href: "/dashboard/plans", label: "Plans", icon: PackageIcon },
  { href: "/dashboard/members", label: "Members", icon: UsersIcon },
];

export function AppSidebar() {
  const path = usePathname();
  return (
    <Sidebar>
      <SidebarHeader className="px-4 pt-4">
        <Logo href="/dashboard" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton variant="outline" render={<Link href="/create" />} className="mb-2">
                  <PlusIcon /> <span>New plan</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={item.exact ? path === item.href : path.startsWith(item.href)}
                    render={<Link href={item.href} />}
                  >
                    <item.icon /> <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 p-4">
        <span className="w-fit rounded-full border px-2 py-0.5 text-xs text-muted-foreground">Devnet</span>
        <WalletButton />
      </SidebarFooter>
    </Sidebar>
  );
}
