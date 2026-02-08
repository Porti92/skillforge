"use client";

import { createContext, useContext, ReactNode } from "react";
import { useUser, useClerk, useAuth as useClerkAuth } from "@clerk/nextjs";

interface AuthContextType {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    imageUrl: string | null;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const { isSignedIn } = useClerkAuth();
  const clerk = useClerk();

  const signIn = () => {
    clerk.openSignIn();
  };

  const signOut = async () => {
    await clerk.signOut();
  };

  const normalizedUser = user
    ? {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? null,
        name: user.fullName ?? user.firstName ?? null,
        imageUrl: user.imageUrl ?? null,
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user: normalizedUser,
        isAuthenticated: !!isSignedIn,
        isLoading: !isLoaded,
        signIn,
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
