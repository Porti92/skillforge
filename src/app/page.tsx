"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowUp, Wand2 } from "lucide-react";
import NoiseBackground from "@/components/ui/noise-background";
import { useAuth } from "@/contexts/AuthContext";

const exampleSkills = [
  "Get weather and suggest what to wear",
  "Summarize my unread emails",
  "Track my daily habits",
  "Find recipes based on ingredients I have",
  "Monitor a website for changes",
];

export default function Home() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const { isLoading } = useAuth();

  const handleGenerate = () => {
    if (!description.trim()) return;
    const params = new URLSearchParams();
    params.set("description", description);
    params.set("complexity", "simple");
    params.set("agent", "openclaw");
    router.push(`/questions?${params.toString()}`);
  };

  const handleExampleClick = (example: string) => {
    setDescription(example);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-zinc-700 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 flex flex-col relative">
      <NoiseBackground />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-xl">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm mb-4">
              <Sparkles className="w-4 h-4" />
              <span>AI Skill Generator</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              What should your AI do?
            </h1>
            
            <p className="text-zinc-400 text-base md:text-lg">
              Describe a capability in plain English — we'll create the skill.
            </p>
          </div>

          {/* Input area */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 mb-4">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Check the weather and tell me what to wear"
              className="w-full bg-transparent text-white placeholder-zinc-500 text-base md:text-lg resize-none border-none outline-none min-h-[100px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
            
            <div className="flex justify-end pt-2 border-t border-zinc-800 mt-2">
              <Button
                onClick={handleGenerate}
                disabled={!description.trim()}
                className={`rounded-full px-6 py-2 font-medium transition-all ${
                  description.trim()
                    ? "bg-amber-500 hover:bg-amber-400 text-black"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                }`}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Create Skill
              </Button>
            </div>
          </div>

          {/* Example chips */}
          <div className="space-y-3">
            <p className="text-zinc-500 text-sm text-center">Try an example:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {exampleSkills.map((example, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(example)}
                  className="px-3 py-1.5 text-sm bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-full text-zinc-300 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-zinc-600 text-sm">
        Built for AI agents everywhere
      </footer>
    </div>
  );
}
