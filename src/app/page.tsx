"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sparkles, ArrowUp, ArrowRight } from "lucide-react";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import NoiseBackground from "@/components/ui/noise-background";
import { Footer } from "@/components/Footer";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { AgentSelector } from "@/components/ui/agent-selector";
import { DEFAULT_AGENT } from "@/lib/coding-agents";
import { SkillComplexity, SKILL_COMPLEXITY_OPTIONS } from "@/types/spec-mode";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const placeholderExamples = [
  "A skill that fetches weather data and gives outfit recommendations...",
  "A skill to manage my Notion tasks — create, update, and list items...",
  "A skill that monitors a GitHub repo and summarizes new PRs...",
  "A skill to transcribe voice memos and save them as notes...",
  "A skill that searches my email and surfaces important messages...",
];

function AnimatedPlaceholder({ show }: { show: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!show) return;

    const currentExample = placeholderExamples[currentIndex];
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      if (displayText.length < currentExample.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentExample.slice(0, displayText.length + 1));
        }, 30);
      } else {
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 15);
      } else {
        setCurrentIndex((prev) => (prev + 1) % placeholderExamples.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isTyping, currentIndex, show]);

  if (!show) return null;

  return (
    <div className="absolute inset-0 pointer-events-none px-3 py-2">
      <span className="text-zinc-600 text-base md:text-sm leading-normal">
        {displayText}
        <span className="animate-pulse">|</span>
      </span>
    </div>
  );
}

export function SkillGenerator() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [skillComplexity, setSkillComplexity] = useState<SkillComplexity>("simple");
  const [selectedAgent, setSelectedAgent] = useState(DEFAULT_AGENT.id);

  const handleGenerate = () => {
    if (!description.trim()) return;
    const params = new URLSearchParams();
    params.set("description", description);
    params.set("complexity", skillComplexity);
    params.set("agent", selectedAgent);
    router.push(`/questions?${params.toString()}`);
  };

  return (
    <div className="h-screen bg-[#0a0a0b] text-zinc-100 flex flex-col relative overflow-hidden">
      <NoiseBackground />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-3xl px-6 py-8 relative z-10">
        <header className="mb-12 text-center">
          <div className="mb-4 inline-flex">
            <div className="group rounded-full border border-white/5 bg-neutral-900 text-base text-white transition-all ease-in hover:cursor-pointer hover:bg-neutral-800">
              <AnimatedShinyText className="inline-flex items-center justify-center px-4 py-1.5 text-sm transition ease-out hover:text-neutral-400 hover:duration-300">
                <Sparkles className="mr-2 h-3.5 w-3.5 text-amber-500" />
                <span>Teach your AI agent new tricks</span>
                <ArrowRight className="ml-2 h-3 w-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
              </AnimatedShinyText>
            </div>
          </div>
          <h1 className="text-5xl font-light tracking-tight text-zinc-50 md:text-6xl flex items-center justify-center gap-4">
            <span>Capability</span>
            <span className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-amber-500">
              <ArrowUp className="w-6 h-6 md:w-7 md:h-7 text-zinc-900 rotate-90" strokeWidth={3} />
            </span>
            <span className="font-[family-name:var(--font-instrument-serif)] italic">Skill</span>
          </h1>
          <p className="mt-4 text-lg text-zinc-500">
            Describe what you want your agent to do — we'll create the skill
          </p>
        </header>

        <div className="space-y-6">
          <div>
            <HoverBorderGradient
              containerClassName="rounded-xl"
              className="rounded-xl"
            >
              <PromptInput
                value={description}
                onValueChange={setDescription}
                onSubmit={handleGenerate}
                maxHeight={200}
                className="w-full bg-transparent border-none shadow-none relative"
              >
                <div className="relative">
                  <AnimatedPlaceholder show={!description} />
                  <PromptInputTextarea
                    className="text-zinc-100 min-h-[100px] relative z-10 bg-transparent"
                  />
                </div>
                <PromptInputActions className="justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <AgentSelector
                      value={selectedAgent}
                      onValueChange={setSelectedAgent}
                    />
                    <Select value={skillComplexity} onValueChange={(v) => setSkillComplexity(v as SkillComplexity)}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SelectTrigger size="sm" className="w-auto gap-2 px-2 border-transparent bg-transparent text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none">
                            <SelectValue placeholder="Select complexity" />
                          </SelectTrigger>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={8} className="bg-zinc-800 text-zinc-100 border-zinc-700">Skill Complexity</TooltipContent>
                      </Tooltip>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {SKILL_COMPLEXITY_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            disabled={option.disabled}
                            className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 text-xs"
                          >
                            <span className="flex items-center gap-2">
                              {option.label}
                              {option.disabled && (
                                <span className="text-xs text-zinc-500">(soon)</span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <PromptInputAction tooltip="Generate skill">
                    <Button
                      variant="default"
                      size="icon"
                      className={`h-8 w-8 rounded-full transition-colors ${
                        description.trim()
                          ? "bg-amber-600 text-zinc-950 hover:bg-amber-500"
                          : "bg-zinc-800 text-zinc-500 hover:bg-zinc-800 cursor-not-allowed"
                      }`}
                      onClick={handleGenerate}
                      disabled={!description.trim()}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                  </PromptInputAction>
                </PromptInputActions>
              </PromptInput>
            </HoverBorderGradient>
          </div>
        </div>

        </div>
      </div>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="h-screen bg-[#0a0a0b] flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-zinc-700 border-t-amber-500 animate-spin" />
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState />;
  }

  if (isAuthenticated) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SkillGenerator />
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return <SkillGenerator />;
}
