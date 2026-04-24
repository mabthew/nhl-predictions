"use client";

import { usePathname } from "next/navigation";
import { track } from "./EngagementTracker";

interface OutboundLinkProps {
  href: string;
  label?: string;
  partner?: string;
  className?: string;
  children: React.ReactNode;
}

export default function OutboundLink({
  href,
  label,
  partner,
  className,
  children,
}: OutboundLinkProps) {
  const pathname = usePathname();

  function handleClick() {
    const metadata: Record<string, string> = { url: href };
    if (label) metadata.label = label;
    if (partner) metadata.partner = partner;
    track("outbound_click", pathname, undefined, metadata);
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={className}
    >
      {children}
    </a>
  );
}
