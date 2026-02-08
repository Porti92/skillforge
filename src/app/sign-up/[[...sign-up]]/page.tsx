import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
      <SignUp 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-zinc-900 border-zinc-800",
          }
        }}
      />
    </div>
  );
}
