"use client";

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
import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";

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

interface AppSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  drawerWidth?: number;
}

export function AppSidebar({
  mobileOpen,
  onMobileClose,
  drawerWidth = 280,
}: AppSidebarProps) {
  const pathname = usePathname();

  const content = (
    <Stack sx={{ height: "100%" }}>
      <Box sx={{ px: 3, py: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          SmartReceipt
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Business Manager
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        <Typography
          variant="overline"
          sx={{ px: 1.5, color: "text.secondary", letterSpacing: 1.2 }}
        >
          Navigation
        </Typography>
        <List>
          {menuItems.map((item) => {
            const active = pathname === item.href;
            return (
              <ListItemButton
                key={item.title}
                component={Link}
                href={item.href}
                selected={active}
                onClick={onMobileClose}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  "&.Mui-selected": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "& .MuiListItemIcon-root": {
                      color: "primary.contrastText",
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <item.icon size={18} />
                </ListItemIcon>
                <ListItemText primary={item.title} />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
      <Divider />
      <Box sx={{ px: 3, py: 2 }}>
        <Typography variant="caption" color="text.secondary">
          © 2026 SmartReceipt
        </Typography>
      </Box>
    </Stack>
  );

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: drawerWidth },
        }}
      >
        {content}
      </Drawer>

      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid #e8edf3",
          },
        }}
      >
        {content}
      </Drawer>
    </>
  );
}