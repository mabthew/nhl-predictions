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

function track(event: string, page: string, metadata?: Record<string, string>) {
  const visitorId = getVisitorId();
  if (!visitorId) return;
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, page, visitorId, metadata }),
  }).catch(() => {});
}

export default function EngagementTracker() {
  const pathname = usePathname();
  const lastPath = useRef("");

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    track("page_view", pathname);
  }, [pathname]);

  return null;
}

export { track };
