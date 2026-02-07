"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export function Navbar() {
  const pathname = usePathname();

  // Don't show navbar on chat/result pages
  if (pathname?.startsWith("/chat") || pathname?.startsWith("/questions")) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3">
      <Link href="/" className="text-lg font-semibold text-zinc-100">
        AgentSkills
      </Link>
    </nav>
  );
}
