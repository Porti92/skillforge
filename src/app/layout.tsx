import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthProvider } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
});

export const metadata: Metadata = {
  title: "AgentSkills - AI Agent Skill Generator",
  description: "Create powerful skills for your AI agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${instrumentSerif.variable} antialiased`}
      >
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#f59e0b",
              colorBackground: "#0a0a0b",
              colorInputBackground: "#18181b",
              colorInputText: "#fafafa",
              colorText: "#fafafa",
            },
          }}
        >
          <AuthProvider>
            <Navbar />
            {children}
          </AuthProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
