"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

const PENDING_SESSION_KEY = "prompt-architect-pending-session";

export default function AuthRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const handleRedirect = async () => {
      // Get the supabase client and refresh the session from cookies
      const supabase = getSupabaseClient();

      // This will read the session from cookies set by the callback
      await supabase.auth.getSession();

      // Small delay to ensure auth state is propagated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get the stored return URL
      const returnUrl = sessionStorage.getItem("auth_return_url");
      sessionStorage.removeItem("auth_return_url");

      // Check if there's a pending session to restore
      const hasPendingSession = localStorage.getItem(PENDING_SESSION_KEY) !== null;

      // If user signed in from a specific page, return them there
      if (returnUrl) {
        // Use replace to avoid back button issues
        window.location.replace(returnUrl);
      } else if (hasPendingSession) {
        // No explicit return URL but has pending session - redirect to chat to restore it
        window.location.replace("/chat?restorePending=true");
      } else {
        router.replace("/");
      }
    };

    handleRedirect();
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#0a0a0b]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        <p className="text-zinc-400">Signing you in...</p>
      </div>
    </div>
  );
}
