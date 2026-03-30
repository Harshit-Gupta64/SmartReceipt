"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import { useCurrency, CURRENCIES } from "@/contexts/currency-context";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { currency, setCurrency } = useCurrency();
  const userEmail = user?.primaryEmailAddress?.emailAddress || "No email";
  const userName = user?.fullName || "No name set";

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Settings</Typography>
        <Typography color="text.secondary">
          Manage your account and preferences
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardHeader
              title="Account"
              sx={{ pb: 0.5 }}
              action={<PersonOutlineIcon fontSize="small" color="action" />}
            />
            <CardContent>
              <Typography fontWeight={700}>{userName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {userEmail}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardHeader
              title="Plan"
              sx={{ pb: 0.5 }}
              action={<WorkspacePremiumOutlinedIcon fontSize="small" color="action" />}
            />
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography fontWeight={700}>Free</Typography>
                <Chip label="Active" size="small" variant="outlined" />
              </Stack>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                All core features included
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardHeader
              title="Notifications"
              sx={{ pb: 0.5 }}
              action={<NotificationsNoneIcon fontSize="small" color="action" />}
            />
            <CardContent>
              <Typography fontWeight={700}>Email</Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Invoices, stock alerts, expenses
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardHeader
              title="Currency"
              sx={{ pb: 0.5 }}
              action={<AttachMoneyIcon fontSize="small" color="action" />}
            />
            <CardContent>
              <Select
                value={currency.code}
                onChange={(e) => {
                  const found = CURRENCIES.find((c) => c.code === e.target.value);
                  if (found) setCurrency(found);
                }}
                size="small"
                fullWidth
              >
                {CURRENCIES.map((c) => (
                  <MenuItem key={c.code} value={c.code}>
                    {c.symbol} — {c.name}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="body2" color="text.secondary" mt={1}>
                All amounts will display in {currency.name}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <SettingsOutlinedIcon fontSize="small" />
              <Typography variant="h6">Account Actions</Typography>
            </Stack>
          }
        />
        <CardContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}>
              <Box>
                <Typography fontWeight={700}>Profile & Security</Typography>
                <Typography variant="body2" color="text.secondary">
                  Update your name, email, password and connected accounts
                </Typography>
              </Box>
              <Button variant="outlined" onClick={() => openUserProfile()} startIcon={<OpenInNewIcon />}>
                Manage Profile
              </Button>
            </Stack>

            <Divider />

            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}>
              <Box>
                <Typography fontWeight={700}>Signed in as</Typography>
                <Typography variant="body2" color="text.secondary">
                  {userEmail}
                </Typography>
              </Box>
              <Chip
                label="Active Session"
                size="small"
                sx={{
                  bgcolor: "success.light",
                  color: "success.dark",
                  borderColor: "success.main",
                  alignSelf: { xs: "flex-start", sm: "center" },
                }}
                variant="outlined"
              />
            </Stack>

            <Divider />

            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}>
              <Box>
                <Typography fontWeight={700} color="error.main">
                  Sign Out
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sign out of your SmartReceipt account
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="error"
                onClick={() => signOut({ redirectUrl: "/" })}
                startIcon={<LogoutRoundedIcon />}
              >
                Sign Out
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}