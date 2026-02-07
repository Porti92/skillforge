"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCompletion } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Copy, Download, Check, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import NoiseBackground from "@/components/ui/noise-background";

const SKILL_DELIMITER = "---SKILL_START---";

function parseAIResponse(response: string): { message: string; spec: string } {
  const delimiterIndex = response.indexOf(SKILL_DELIMITER);
  if (delimiterIndex === -1) {
    return { message: "", spec: response };
  }
  const message = response.substring(0, delimiterIndex).trim();
  const spec = response.substring(delimiterIndex + SKILL_DELIMITER.length).trim();
  return { message, spec };
}

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fromQuestions = searchParams.get("fromQuestions") === "true";
  const targetAgent = searchParams.get("agent") || "openclaw";

  const [currentSpec, setCurrentSpec] = useState("");
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Generating your skill...");
  const hasStartedRef = useRef(false);
  const descriptionRef = useRef("");

  const { completion, isLoading, complete, error } = useCompletion({
    api: "/api/chat",
    streamProtocol: "text",
    onFinish: (_prompt, completionText) => {
      const { spec } = parseAIResponse(completionText);
      setCurrentSpec(spec);
      setStatusMessage("Your skill is ready!");
    },
  });

  // Extract streaming spec for display
  let displaySpec = currentSpec;
  if (isLoading && completion) {
    const { spec } = parseAIResponse(completion);
    displaySpec = spec;
  }

  // Handle coming from questions page
  useEffect(() => {
    if (fromQuestions && !hasStartedRef.current) {
      hasStartedRef.current = true;

      const storedData = sessionStorage.getItem("questionAnswers");
      if (storedData) {
        const { answers, description, skillComplexity, agent } = JSON.parse(storedData);
        descriptionRef.current = description;

        complete("Generating skill...", {
          body: {
            messages: [],
            currentSpec: "",
            structuredAnswers: answers,
            originalPrompt: description,
            skillComplexity: skillComplexity || "simple",
            targetAgent: agent || targetAgent,
          },
        });

        sessionStorage.removeItem("questionAnswers");
      }
    }
  }, [fromQuestions, complete, targetAgent]);

  const handleCopy = async () => {
    if (displaySpec) {
      await navigator.clipboard.writeText(displaySpec);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (displaySpec) {
      const blob = new Blob([displaySpec], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "SKILL.md";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleStartOver = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 flex flex-col relative">
      <NoiseBackground />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <button
          onClick={handleStartOver}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">New Skill</span>
        </button>

        <div className="flex items-center gap-2">
          {displaySpec && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-zinc-400 hover:text-white"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="ml-1 hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="text-zinc-400 hover:text-white"
              >
                <Download className="w-4 h-4" />
                <span className="ml-1 hidden sm:inline">Download</span>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 relative z-10 overflow-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="text-red-400 mb-4">Something went wrong</div>
            <p className="text-zinc-500 mb-6 max-w-md">
              {error.message || "Failed to generate skill. Please try again."}
            </p>
            <Button onClick={handleStartOver} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : !displaySpec && isLoading ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
            <p className="text-zinc-400">{statusMessage}</p>
          </div>
        ) : (
          <div className="p-4 md:p-6 max-w-4xl mx-auto">
            {/* Status */}
            {!isLoading && displaySpec && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                ✨ {statusMessage}
              </div>
            )}

            {/* Skill content */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300">Generated Skill</span>
                {isLoading && (
                  <span className="text-xs text-amber-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Generating...
                  </span>
                )}
              </div>
              <pre className="p-4 overflow-x-auto text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                {displaySpec || "Waiting for content..."}
              </pre>
            </div>

            {/* Actions */}
            {!isLoading && displaySpec && (
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleCopy}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black"
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copied to Clipboard!" : "Copy Skill"}
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="flex-1 border-zinc-700 hover:bg-zinc-800"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download as SKILL.md
                </Button>
              </div>
            )}

            {/* Instructions */}
            {!isLoading && displaySpec && (
              <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                <h3 className="text-sm font-medium text-zinc-300 mb-2">How to use this skill:</h3>
                <ol className="text-sm text-zinc-500 space-y-1 list-decimal list-inside">
                  <li>Copy or download the skill above</li>
                  <li>Save it as <code className="text-amber-400">SKILL.md</code> in your agent's skills folder</li>
                  <li>Your agent will automatically discover and use the skill</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#0a0a0b]">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
