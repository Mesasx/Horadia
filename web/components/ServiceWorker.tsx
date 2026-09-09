"use client";

import { useEffect } from "react";
import { refreshPushRegistration } from "@/lib/push-client";
import { usePlannerStore } from "@/store/planner-store";

/** Registers the offline service worker once, after load. */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    const onLoad = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        await refreshPushRegistration(
          registration,
          usePlannerStore.getState().reminders,
        );
      } catch {
        // Offline startup and denied notification permission are both benign.
      }
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
