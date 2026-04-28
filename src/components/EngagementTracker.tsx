"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("dhl-visitor-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("dhl-visitor-id", id);
  }
  return id;
}

function track(
  event: string,
  page: string,
  referrer?: string,
  metadata?: Record<string, string>
) {
  const visitorId = getVisitorId();
  if (!visitorId) return;
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, page, visitorId, referrer, metadata }),
  }).catch(() => {});
}

export default function EngagementTracker() {
  const pathname = usePathname();
  const lastPath = useRef("");
  const sentInitial = useRef(false);

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    const referrer =
      !sentInitial.current && typeof document !== "undefined"
        ? document.referrer || undefined
        : undefined;
    sentInitial.current = true;
    track("page_view", pathname, referrer);
  }, [pathname]);

  return null;
}

export { track };
