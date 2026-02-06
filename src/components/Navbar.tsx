"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { SignUpModal } from "@/components/SignUpModal";

export function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, signOut, user } = useAuth();
  const [signUpModalOpen, setSignUpModalOpen] = useState(false);

  // Don't show navbar on chat pages (they have their own sidebar)
  // Don't show navbar for authenticated users (they have the sidebar with avatar)
  if (pathname?.startsWith("/chat") || isAuthenticated) {
    return null;
  }

  // Get user's initials for avatar fallback
  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0];
  const userEmail = user?.email;
  const userAvatar = user?.user_metadata?.avatar_url;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
        <h1 className="text-lg font-[family-name:var(--font-instrument-serif)] italic text-zinc-100">
          Prompt architect
        </h1>

        <div>
          {isLoading ? (
            <div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse" />
          ) : isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userAvatar} alt={userName} />
                    <AvatarFallback className="bg-amber-600 text-zinc-950 text-xs font-medium">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-lg bg-zinc-900 border-zinc-800"
                align="end"
                sideOffset={8}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userAvatar} alt={userName} />
                      <AvatarFallback className="bg-amber-600 text-zinc-950 text-xs font-medium">
                        {getInitials(userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium text-zinc-100">
                        {userName}
                      </span>
                      <span className="truncate text-xs text-zinc-500">
                        {userEmail}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                  onClick={signOut}
                  className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              onClick={() => setSignUpModalOpen(true)}
              className="h-9 px-4 rounded-lg border-zinc-700 bg-zinc-800/50 text-zinc-100 hover:bg-zinc-700/50 hover:text-zinc-50"
            >
              Login
            </Button>
          )}
        </div>
      </nav>
      <SignUpModal open={signUpModalOpen} onOpenChange={setSignUpModalOpen} />
    </>
  );
}
