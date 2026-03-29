"use client";

import { Box, Button, Typography, Stack } from "@mui/material";
import Link from "next/link";

export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 4,
      }}
    >
      <Stack spacing={3} alignItems="center" textAlign="center" maxWidth={480}>
        <Typography
          variant="h1"
          fontWeight={900}
          sx={{
            fontSize: { xs: "6rem", md: "10rem" },
            background: "linear-gradient(135deg, #06b6d4, #6366f1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1,
          }}
        >
          404
        </Typography>

        <Typography variant="h5" fontWeight={700}>
          Page not found
        </Typography>

        <Typography variant="body1" color="text.secondary">
          Looks like this page doesn't exist or was moved. Let's get you back
          on track!
        </Typography>

        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            component={Link}
            href="/dashboard"
            sx={{
              background: "linear-gradient(135deg, #06b6d4, #6366f1)",
              px: 4,
              py: 1.5,
              borderRadius: 3,
              fontWeight: 700,
            }}
          >
            Go to Dashboard
          </Button>
          <Button
            variant="outlined"
            component={Link}
            href="/"
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 3,
              fontWeight: 700,
            }}
          >
            Home
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}