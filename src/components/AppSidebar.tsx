"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, MessageSquare, Mail } from "lucide-react";
import { TwitterFollowButton } from "@/components/ui/twitter-follow-button";
import { useSessions } from "@/hooks/use-sessions";
import { UserNav } from "@/components/UserNav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = usePathname();
  const { sessions, isLoaded } = useSessions();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center">
          <span className="font-[family-name:var(--font-instrument-serif)] italic text-lg font-medium text-zinc-100 group-data-[collapsible=icon]:hidden">
            Prompt Architect
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/"}
                  tooltip="New Idea"
                >
                  <Link href="/">
                    <Plus className="h-4 w-4" />
                    <span>New Idea</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup className="flex-1">
          <SidebarGroupLabel>History</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {!isLoaded ? (
                // Loading skeleton
                <div className="space-y-2 px-2">
                  <div className="h-8 rounded-md bg-sidebar-accent/50 animate-pulse" />
                  <div className="h-8 rounded-md bg-sidebar-accent/50 animate-pulse" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="px-2 py-4 text-sm text-zinc-500 group-data-[collapsible=icon]:hidden">
                  No sessions yet
                </div>
              ) : (
                sessions.map((session) => (
                  <SidebarMenuItem key={session.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === `/chat?session=${session.id}`}
                      tooltip={session.title}
                    >
                      <Link href={`/chat?session=${session.id}`}>
                        <MessageSquare className="h-4 w-4" />
                        <span className="truncate">{session.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2">
          <TwitterFollowButton
            href="https://x.com/NirPorti"
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
          />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Send Feedback">
              <a href="mailto:feedback@example.com">
                <Mail className="h-4 w-4" />
                <span>Feedback</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <UserNav />
      </SidebarFooter>
    </Sidebar>
  );
}
