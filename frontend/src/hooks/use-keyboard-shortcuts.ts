"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";

/**
 * Global keyboard shortcuts for EQUIDELI:
 * - Ctrl/Cmd + K: Focus global search (handled in GlobalSearch component)
 * - "n": Create new request (customer only)
 * - "g" then "d": Go to dashboard
 * - "g" then "r": Go to requests
 * - "g" then "h": Go to horses
 * - "g" then "i": Go to invoices
 * - "g" then "n": Go to notifications
 * - Escape: Close any open dropdown/modal
 */
export function useKeyboardShortcuts() {
  const { user, navigate } = useAppStore();

  useEffect(() => {
    if (!user) return;
    let lastKey = "";
    let lastKeyTime = 0;
    const DOUBLE_KEY_TIMEOUT = 600;

    const handler = (e: KeyboardEvent) => {

      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      const now = Date.now();
      const isDoubleKey = lastKey === "g" && now - lastKeyTime < DOUBLE_KEY_TIMEOUT;


      if (key === "n" && user.roleId === "CUSTOMER" && !isDoubleKey) {
        e.preventDefault();
        navigate("request-create");
        lastKey = "";
        return;
      }


      if (isDoubleKey) {
        const navMap: Record<string, string> = {
          d: "dashboard",
          r: "requests",
          h: "horses",
          i: "invoices",
          n: "notifications",
          t: "trips",
        };
        const targetView = navMap[key];
        if (targetView) {
          e.preventDefault();
          navigate(targetView as any);
          lastKey = "";
          return;
        }
      }

      if (key === "g") {
        lastKey = "g";
        lastKeyTime = now;
      } else {
        lastKey = "";
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [user, navigate]);
}
