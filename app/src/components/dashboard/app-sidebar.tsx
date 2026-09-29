"use client";

import { HomeIcon, LayoutDashboardIcon, PackageIcon, PlusIcon, ReceiptIcon, UsersIcon } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { WalletButton } from "@/components/wallet/wallet-button";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboardIcon, exact: true },
  { href: "/dashboard/plans", label: "Plans", icon: PackageIcon },
  { href: "/dashboard/members", label: "Members", icon: UsersIcon },
];

const SECONDARY = [
  { href: "/subscriptions", label: "My subscriptions", icon: ReceiptIcon },
  { href: "/", label: "Monthly home", icon: HomeIcon },
];

export function AppSidebar() {
  const path = usePathname();
  const { setOpenMobile } = useSidebar();
  const close = () => setOpenMobile(false);
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
                <SidebarMenuButton variant="outline" render={<Link href="/create" onClick={close} />} className="mb-2">
                  <PlusIcon /> <span>New plan</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={item.exact ? path === item.href : path.startsWith(item.href)}
                    render={<Link href={item.href} onClick={close} />}
                  >
                    <item.icon /> <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {SECONDARY.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton size="sm" render={<Link href={item.href} onClick={close} />}>
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
