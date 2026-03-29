"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";

const EIGHT_HOURS = 8 * 60 * 60 * 1000;
// For testing change to: 
// const EIGHT_HOURS = 10 * 1000;

export default function SessionGuard() {
  const { signOut } = useClerk();

  useEffect(() => {
    const checkSession = () => {
      const lastActivity = localStorage.getItem("last_activity");
      const now = Date.now();

      if (lastActivity) {
        const timeDiff = now - parseInt(lastActivity);
        if (timeDiff > EIGHT_HOURS) {
          localStorage.removeItem("last_activity");
          signOut({ redirectUrl: "/" });
          return;
        }
      }

      // Update last activity
      localStorage.setItem("last_activity", now.toString());
    };

    // Check on mount
    checkSession();

    // Check every minute
    const interval = setInterval(checkSession, 60 * 1000);

    // Update activity on user interaction
    const updateActivity = () => {
      localStorage.setItem("last_activity", Date.now().toString());
    };

    window.addEventListener("click", updateActivity);
    window.addEventListener("keypress", updateActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("keypress", updateActivity);
    };
  }, [signOut]);

  return null;
}