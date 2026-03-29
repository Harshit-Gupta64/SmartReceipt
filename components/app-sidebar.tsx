"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Package,
  Users,
  Building2,
  Bot,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { title: "Invoices", icon: FileText, href: "/dashboard/invoices" },
  { title: "Expenses", icon: Receipt, href: "/dashboard/expenses" },
  { title: "Inventory", icon: Package, href: "/dashboard/inventory" },
  { title: "Clients", icon: Users, href: "/dashboard/clients" },
  { title: "Vendors", icon: Building2, href: "/dashboard/vendors" },
  { title: "AI Assistant", icon: Bot, href: "/dashboard/assistant" },
  { title: "Settings", icon: Settings, href: "/dashboard/settings" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <h1 className="text-xl font-bold tracking-tight">SmartReceipt</h1>
        <p className="text-xs text-muted-foreground">Business Manager</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <p className="text-xs text-muted-foreground">© 2025 SmartReceipt</p>
      </SidebarFooter>
    </Sidebar>
  );
}