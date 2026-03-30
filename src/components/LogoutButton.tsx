"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs text-white/50 hover:text-white transition-colors"
    >
      Sign out
    </button>
  );
}
