"use client";

import { AppSidebar } from "@/components/app-sidebar";
import ColorModeToggle from "@/components/color-mode-toggle";
import { UserButton, useUser } from "@clerk/nextjs";
import SessionGuard from "@/components/session-guard";
import MenuIcon from "@mui/icons-material/Menu";
import { CurrencyProvider } from "@/contexts/currency-context";
import {
  alpha,
  AppBar,
  Box,
  Container,
  IconButton,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material";
import { useState } from "react";

const DRAWER_WIDTH = 280;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useUser();

  const appBarBackground =
    theme.palette.mode === "dark"
      ? alpha(theme.palette.background.paper, 0.78)
      : alpha("#ffffff", 0.82);

  const appBarBorder =
    theme.palette.mode === "dark"
      ? alpha(theme.palette.common.white, 0.12)
      : "#e8edf3";

  return (
    <CurrencyProvider>
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
        <SessionGuard />
        <AppSidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          drawerWidth={DRAWER_WIDTH}
        />

        <Box sx={{ flexGrow: 1, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { md: `${DRAWER_WIDTH}px` } }}>
          <AppBar
            position="sticky"
            color="inherit"
            elevation={0}
            sx={{
              borderBottom: `1px solid ${appBarBorder}`,
              bgcolor: appBarBackground,
              backdropFilter: "blur(10px)",
            }}
          >
            <Toolbar>
              <IconButton
                edge="start"
                color="inherit"
                onClick={() => setMobileOpen(true)}
                sx={{ display: { md: "none" }, mr: 1 }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="body1" color="text.secondary" sx={{ flexGrow: 1 }}>
                Welcome back, {user?.firstName || user?.emailAddresses[0]?.emailAddress || "there"}!
              </Typography>
              <ColorModeToggle />
              <UserButton />
            </Toolbar>
          </AppBar>

          <Container maxWidth="xl" sx={{ py: 3 }}>
            {children}
          </Container>
        </Box>
      </Box>
    </CurrencyProvider>
  );
}