"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { User, Session } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithGoogle: (returnTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = getSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    // If Supabase is not configured, skip auth and treat user as "authenticated"
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithGoogle = useCallback(async (returnTo?: string) => {
    if (!isSupabaseConfigured || !supabase) {
      console.log("Auth not configured - skipping sign in");
      return;
    }

    try {
      // Store current or custom return URL to redirect back after auth
      const returnUrl = returnTo
        ? new URL(returnTo, window.location.origin).toString()
        : window.location.href;
      sessionStorage.setItem("auth_return_url", returnUrl);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      console.log("Auth not configured - skipping sign out");
      router.push("/");
      return;
    }

    try {
      // Clear all cached data
      localStorage.removeItem("prompt-architect-pending-session");
      localStorage.removeItem("prompt-architect-sessions");
      sessionStorage.removeItem("questionAnswers");
      sessionStorage.removeItem("auth_return_url");

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Redirect to home page
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }, [supabase, router]);

  // If Supabase is not configured, treat everyone as authenticated
  const isAuthenticated = !isSupabaseConfigured || !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated,
        isLoading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
