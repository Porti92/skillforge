"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SignInModalContent } from "@/components/ui/sign-in";
import { useAuth } from "@/contexts/AuthContext";

interface SignUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnTo?: string;
}

export function SignUpModal({
  open,
  onOpenChange,
  returnTo,
}: SignUpModalProps) {
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle(returnTo);
    } catch (error) {
      console.error("Failed to sign in:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0b] border-zinc-800">
        <SignInModalContent
          title="Ready to dive deeper?"
          description="Sign in to continue your journey with Prompt Architect"
          onGoogleSignIn={handleGoogleSignIn}
        />
      </DialogContent>
    </Dialog>
  );
}
