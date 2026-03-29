"use client";

import {
  CssBaseline,
  PaletteMode,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ColorModeContextValue = {
  mode: PaletteMode;
  toggleColorMode: () => void;
};

const ColorModeContext = createContext<ColorModeContextValue | undefined>(
  undefined
);

export function useColorMode() {
  const value = useContext(ColorModeContext);
  if (!value) {
    throw new Error("useColorMode must be used within MuiThemeProvider");
  }
  return value;
}

export default function MuiThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [mode, setMode] = useState<PaletteMode>("light");

  useEffect(() => {
    const savedMode = window.localStorage.getItem("smartreceipt-color-mode");
    if (savedMode === "light" || savedMode === "dark") {
      setMode(savedMode);
      return;
    }

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setMode("dark");
    }
  }, []);

  const toggleColorMode = () => {
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      window.localStorage.setItem("smartreceipt-color-mode", next);
      return next;
    });
  };

  const colorModeValue = useMemo(
    () => ({ mode, toggleColorMode }),
    [mode]
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === "light" ? "#0284c7" : "#22d3ee",
          },
          secondary: {
            main: mode === "light" ? "#ea580c" : "#fbbf24",
          },
          background: {
            default: mode === "light" ? "#f8fbff" : "#060914",
            paper: mode === "light" ? "#ffffff" : "#0b1220",
          },
        },
        shape: {
          borderRadius: 14,
        },
        typography: {
          fontFamily: "var(--font-geist-sans), sans-serif",
          h4: {
            fontWeight: 700,
          },
          h5: {
            fontWeight: 700,
          },
          h6: {
            fontWeight: 700,
          },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                transition: "background-color 250ms ease, color 250ms ease",
                background:
                  mode === "light"
                    ? "radial-gradient(1200px circle at 10% -10%, rgba(14,165,233,0.12), transparent 55%), radial-gradient(900px circle at 100% 10%, rgba(249,115,22,0.10), transparent 45%), radial-gradient(700px circle at 50% 120%, rgba(16,185,129,0.08), transparent 40%), #f8fbff"
                    : "radial-gradient(1200px circle at 10% -10%, rgba(34,211,238,0.12), transparent 55%), radial-gradient(900px circle at 100% 10%, rgba(251,191,36,0.12), transparent 45%), #060914",
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                border:
                  mode === "light"
                    ? "1px solid #e8edf3"
                    : "1px solid rgba(148,163,184,0.24)",
                boxShadow:
                  mode === "light"
                    ? "0 12px 34px rgba(15, 23, 42, 0.12)"
                    : "0 10px 30px rgba(2, 6, 23, 0.45)",
                background:
                  mode === "light"
                    ? "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.88) 100%)"
                    : "linear-gradient(180deg, rgba(11,18,32,0.92) 0%, rgba(9,14,26,0.88) 100%)",
                backdropFilter: "blur(10px)",
                transition:
                  "transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease",
                transformStyle: "preserve-3d",
                "&:hover": {
                  transform: "translateY(-8px) scale(1.01)",
                  boxShadow:
                    mode === "light"
                      ? "0 24px 50px rgba(15, 23, 42, 0.20)"
                      : "0 24px 48px rgba(2, 6, 23, 0.60)",
                  borderColor:
                    mode === "light"
                      ? "rgba(2,132,199,0.34)"
                      : "rgba(34,211,238,0.38)",
                },
              },
            },
          },
          MuiButton: {
            defaultProps: {
              disableElevation: true,
            },
            styleOverrides: {
              root: {
                borderRadius: 12,
                textTransform: "none",
                fontWeight: 600,
                ...(mode === "light"
                  ? {
                      "&.MuiButton-containedPrimary": {
                        background: "linear-gradient(120deg, #0f766e 0%, #0284c7 55%, #0ea5e9 100%)",
                        boxShadow: "0 12px 30px rgba(2,132,199,0.34)",
                      },
                      "&.MuiButton-containedPrimary:hover": {
                        boxShadow: "0 16px 36px rgba(2,132,199,0.42)",
                      },
                    }
                  : {}),
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={colorModeValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}