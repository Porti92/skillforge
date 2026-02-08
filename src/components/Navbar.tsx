"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

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
      
      <div className="flex items-center gap-4">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="text-sm text-zinc-400 hover:text-white transition-colors">
              Sign in
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton 
            appearance={{
              elements: {
                avatarBox: "w-8 h-8"
              }
            }}
          />
        </SignedIn>
      </div>
    </nav>
  );
}
