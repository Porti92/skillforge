"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Session {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  spec?: string;
  messages?: ChatMessage[];
}

interface DbSession {
  id: string;
  user_id: string;
  title: string;
  description: string;
  spec: string | null;
  messages: ChatMessage[] | null;
  created_at: string;
  updated_at: string;
}

const SESSIONS_KEY = "prompt-architect-sessions";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function truncateTitle(description: string, maxLength = 50): string {
  const cleaned = description.trim().replace(/\s+/g, " ");
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength).trim() + "...";
}

// Convert DB session to app session format
function dbToAppSession(dbSession: DbSession): Session {
  return {
    id: dbSession.id,
    title: dbSession.title,
    description: dbSession.description,
    createdAt: new Date(dbSession.created_at).getTime(),
    spec: dbSession.spec || undefined,
    messages: dbSession.messages || undefined,
  };
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const supabase = getSupabaseClient();

  // Load sessions - from Supabase if authenticated, localStorage if not
  // Also migrate any localStorage sessions to Supabase when user authenticates
  useEffect(() => {
    const loadSessions = async () => {
      // If Supabase is not configured, always use localStorage
      if (!isSupabaseConfigured || !supabase) {
        loadFromLocalStorage();
        setIsLoaded(true);
        return;
      }

      if (isAuthenticated && user) {
        try {
          // First, check if there are any localStorage sessions to migrate
          await migrateLocalStorageSessions();

          const { data, error } = await supabase
            .from("sessions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (error) {
            console.error("Failed to load sessions from Supabase:", error);
            // Fallback to localStorage
            loadFromLocalStorage();
          } else if (data) {
            setSessions(data.map(dbToAppSession));
          }
        } catch (error) {
          console.error("Failed to load sessions:", error);
          loadFromLocalStorage();
        }
      } else {
        loadFromLocalStorage();
      }
      setIsLoaded(true);
    };

    const loadFromLocalStorage = () => {
      try {
        const stored = localStorage.getItem(SESSIONS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Session[];
          setSessions(parsed.sort((a, b) => b.createdAt - a.createdAt));
        }
      } catch (error) {
        console.error("Failed to load sessions from localStorage:", error);
      }
    };

    // Migrate localStorage sessions to Supabase for newly authenticated users
    const migrateLocalStorageSessions = async () => {
      if (!supabase) return;
      
      try {
        const stored = localStorage.getItem(SESSIONS_KEY);
        if (!stored || !user) return;

        const localSessions = JSON.parse(stored) as Session[];
        if (localSessions.length === 0) return;

        // Insert all localStorage sessions into Supabase
        const sessionsToInsert = localSessions.map((session) => ({
          user_id: user.id,
          title: session.title,
          description: session.description,
          spec: session.spec || null,
          messages: session.messages || null,
          created_at: new Date(session.createdAt).toISOString(),
        }));

        const { error } = await supabase
          .from("sessions")
          .insert(sessionsToInsert);

        if (error) {
          console.error("Failed to migrate localStorage sessions:", error);
          return;
        }

        // Clear localStorage after successful migration
        localStorage.removeItem(SESSIONS_KEY);
        console.log(`Successfully migrated ${localSessions.length} session(s) from localStorage to Supabase`);
      } catch (error) {
        console.error("Failed to migrate localStorage sessions:", error);
      }
    };

    loadSessions();
  }, [isAuthenticated, user, supabase]);

  // Save sessions to localStorage (for unauthenticated users)
  const persistToLocalStorage = useCallback((newSessions: Session[]) => {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(newSessions));
    } catch (error) {
      console.error("Failed to save sessions to localStorage:", error);
    }
  }, []);

  const saveSession = useCallback(
    async (description: string, spec?: string, messages?: ChatMessage[]): Promise<Session> => {
      const title = truncateTitle(description);

      // If Supabase is configured and user is authenticated, save to Supabase
      if (isSupabaseConfigured && supabase && isAuthenticated && user) {
        const { data, error } = await supabase
          .from("sessions")
          .insert({
            user_id: user.id,
            title,
            description,
            spec: spec || null,
            messages: messages || null,
          })
          .select()
          .single();

        if (error) {
          console.error("Failed to save session to Supabase:", error);
          throw error;
        }

        const newSession = dbToAppSession(data);
        setSessions((prev) => [newSession, ...prev]);
        return newSession;
      } else {
        // Save to localStorage
        const newSession: Session = {
          id: generateId(),
          title,
          description,
          createdAt: Date.now(),
          spec,
          messages,
        };

        setSessions((prev) => {
          const updated = [newSession, ...prev];
          persistToLocalStorage(updated);
          return updated;
        });

        return newSession;
      }
    },
    [isAuthenticated, user, persistToLocalStorage, supabase]
  );

  const updateSession = useCallback(
    async (id: string, updates: Partial<Omit<Session, "id" | "createdAt">>) => {
      if (isSupabaseConfigured && supabase && isAuthenticated && user) {
        // Update in Supabase
        const { error } = await supabase
          .from("sessions")
          .update({
            title: updates.title,
            description: updates.description,
            spec: updates.spec,
            messages: updates.messages,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) {
          console.error("Failed to update session in Supabase:", error);
          return;
        }
      }

      setSessions((prev) => {
        const updated = prev.map((session) =>
          session.id === id ? { ...session, ...updates } : session
        );
        if (!isSupabaseConfigured || !isAuthenticated) {
          persistToLocalStorage(updated);
        }
        return updated;
      });
    },
    [isAuthenticated, user, persistToLocalStorage, supabase]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      if (isSupabaseConfigured && supabase && isAuthenticated && user) {
        // Delete from Supabase
        const { error } = await supabase
          .from("sessions")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) {
          console.error("Failed to delete session from Supabase:", error);
          return;
        }
      }

      setSessions((prev) => {
        const updated = prev.filter((session) => session.id !== id);
        if (!isSupabaseConfigured || !isAuthenticated) {
          persistToLocalStorage(updated);
        }
        return updated;
      });
    },
    [isAuthenticated, user, persistToLocalStorage, supabase]
  );

  const getSession = useCallback(
    (id: string): Session | undefined => {
      return sessions.find((session) => session.id === id);
    },
    [sessions]
  );

  return {
    sessions,
    isLoaded,
    saveSession,
    updateSession,
    deleteSession,
    getSession,
  };
}
