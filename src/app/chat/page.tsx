"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCompletion } from "@ai-sdk/react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Copy, Download, Check, Loader2, ArrowLeft, RefreshCw, FolderArchive, Save, BookmarkPlus } from "lucide-react";
import NoiseBackground from "@/components/ui/noise-background";
import { FileTree, SkillFile } from "@/components/FileTree";

const SKILL_DELIMITER = "---SKILL_START---";
const FILE_PATTERN = /===FILE:\s*(.+?)===([\s\S]*?)(?====FILE:|===END_FILES===|$)/g;

interface ParsedResponse {
  message: string;
  files: SkillFile[];
  rawSpec: string;
}

function parseAIResponse(response: string): ParsedResponse {
  const delimiterIndex = response.indexOf(SKILL_DELIMITER);
  if (delimiterIndex === -1) {
    return { message: "", files: [], rawSpec: response };
  }
  
  const message = response.substring(0, delimiterIndex).trim();
  const rawSpec = response.substring(delimiterIndex + SKILL_DELIMITER.length).trim();
  
  // Parse files from the spec
  const files: SkillFile[] = [];
  let match;
  
  // Reset regex state
  FILE_PATTERN.lastIndex = 0;
  
  while ((match = FILE_PATTERN.exec(rawSpec)) !== null) {
    const path = match[1].trim();
    const content = match[2].trim();
    if (path && content) {
      files.push({ path, content });
    }
  }
  
  // If no files parsed, treat whole spec as SKILL.md
  if (files.length === 0 && rawSpec) {
    files.push({ path: "SKILL.md", content: rawSpec });
  }
  
  return { message, files, rawSpec };
}

function generateSkillName(files: SkillFile[]): string {
  const skillMd = files.find(f => f.path === "SKILL.md");
  if (skillMd) {
    // Try to extract name from frontmatter
    const nameMatch = skillMd.content.match(/^---[\s\S]*?name:\s*(.+?)[\s\n]/m);
    if (nameMatch) {
      return nameMatch[1].trim();
    }
    // Try to extract from first heading
    const headingMatch = skillMd.content.match(/^#\s+(.+?)$/m);
    if (headingMatch) {
      return headingMatch[1].toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
  }
  return "my-skill";
}

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const fromQuestions = searchParams.get("fromQuestions") === "true";
  const targetAgent = searchParams.get("agent") || "openclaw";

  const [currentFiles, setCurrentFiles] = useState<SkillFile[]>([]);
  const [skillName, setSkillName] = useState("my-skill");
  const [skillDescription, setSkillDescription] = useState("");
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Generating your skill...");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const hasStartedRef = useRef(false);
  const descriptionRef = useRef("");

  const { completion, isLoading, complete, error } = useCompletion({
    api: "/api/chat",
    streamProtocol: "text",
    onFinish: (_prompt, completionText) => {
      const { files } = parseAIResponse(completionText);
      setCurrentFiles(files);
      const name = generateSkillName(files);
      setSkillName(name);
      // Extract description from SKILL.md frontmatter or first paragraph
      const skillMd = files.find(f => f.path === "SKILL.md");
      if (skillMd) {
        const descMatch = skillMd.content.match(/^---[\s\S]*?description:\s*(.+?)[\s\n]/m);
        if (descMatch) {
          setSkillDescription(descMatch[1].trim());
        }
      }
      setStatusMessage("Your skill is ready!");
    },
  });

  // Extract streaming files for display
  let displayFiles = currentFiles;
  let streamingRaw = "";
  if (isLoading && completion) {
    const parsed = parseAIResponse(completion);
    displayFiles = parsed.files;
    streamingRaw = parsed.rawSpec;
  }
  
  const hasFiles = displayFiles.length > 0 || streamingRaw;

  // Handle coming from questions page
  useEffect(() => {
    if (fromQuestions && !hasStartedRef.current) {
      hasStartedRef.current = true;

      const storedData = sessionStorage.getItem("questionAnswers");
      if (storedData) {
        const { answers, description, skillComplexity, agent, configValues } = JSON.parse(storedData);
        descriptionRef.current = description;

        complete("Generating skill...", {
          body: {
            messages: [],
            currentSpec: "",
            structuredAnswers: answers,
            originalPrompt: description,
            skillComplexity: skillComplexity || "simple",
            targetAgent: agent || targetAgent,
            configValues: configValues || {},
          },
        });

        sessionStorage.removeItem("questionAnswers");
      }
    }
  }, [fromQuestions, complete, targetAgent]);

  const handleCopyAll = async () => {
    if (displayFiles.length > 0) {
      const allContent = displayFiles.map(f => `// ${f.path}\n${f.content}`).join('\n\n---\n\n');
      await navigator.clipboard.writeText(allContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadZip = async () => {
    if (displayFiles.length === 0) return;
    
    // Dynamic import JSZip
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    // Add files to zip
    const folder = zip.folder(skillName);
    if (folder) {
      displayFiles.forEach(file => {
        folder.file(file.path, file.content);
      });
    }
    
    // Generate and download
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${skillName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartOver = () => {
    router.push("/");
  };

  const handleSaveSkill = async () => {
    if (!isSignedIn || displayFiles.length === 0 || isSaving) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: skillName,
          description: skillDescription || descriptionRef.current,
          files: displayFiles,
          isPublic: false,
        }),
      });
      
      if (response.ok) {
        setIsSaved(true);
        setStatusMessage("Skill saved to your library!");
      } else {
        const data = await response.json();
        console.error('Failed to save:', data.error);
        setStatusMessage("Failed to save skill. Please try again.");
      }
    } catch (error) {
      console.error('Error saving skill:', error);
      setStatusMessage("Failed to save skill. Please try again.");
    } finally {
      setIsSaving(false);
    }
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
          {hasFiles && !isLoading && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyAll}
                className="text-zinc-400 hover:text-white"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="ml-1 hidden sm:inline">{copied ? "Copied!" : "Copy All"}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadZip}
                className="text-zinc-400 hover:text-white"
              >
                <FolderArchive className="w-4 h-4" />
                <span className="ml-1 hidden sm:inline">Download ZIP</span>
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
        ) : !hasFiles && isLoading ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
            <p className="text-zinc-400">{statusMessage}</p>
          </div>
        ) : (
          <div className="p-4 md:p-6 max-w-4xl mx-auto">
            {/* Status */}
            {!isLoading && displayFiles.length > 0 && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                ✨ {statusMessage}
              </div>
            )}

            {/* Loading indicator while streaming */}
            {isLoading && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating your skill...
              </div>
            )}

            {/* File Tree */}
            {displayFiles.length > 0 ? (
              <FileTree files={displayFiles} skillName={skillName} />
            ) : streamingRaw ? (
              // Show raw streaming content while parsing
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800">
                  <span className="text-sm font-medium text-zinc-300">Generating...</span>
                </div>
                <pre className="p-4 overflow-x-auto text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed max-h-[500px] overflow-y-auto">
                  {streamingRaw}
                </pre>
              </div>
            ) : null}

            {/* Actions */}
            {!isLoading && displayFiles.length > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleDownloadZip}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black"
                >
                  <FolderArchive className="w-4 h-4 mr-2" />
                  Download {skillName}.zip
                </Button>
                <Button
                  onClick={handleCopyAll}
                  variant="outline"
                  className="flex-1 border-zinc-700 hover:bg-zinc-800"
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copied!" : "Copy All Files"}
                </Button>
              </div>
            )}
            
            {/* Save to Library */}
            {!isLoading && displayFiles.length > 0 && isSignedIn && (
              <div className="mt-3">
                <Button
                  onClick={handleSaveSkill}
                  disabled={isSaving || isSaved}
                  variant="outline"
                  className="w-full border-zinc-700 hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : isSaved ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-400" />
                      Saved to Library
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-4 h-4 mr-2" />
                      Save to My Library
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* Sign in prompt for saving */}
            {!isLoading && displayFiles.length > 0 && !isSignedIn && (
              <p className="mt-3 text-center text-sm text-zinc-500">
                <a href="/sign-in" className="text-amber-500 hover:text-amber-400">Sign in</a> to save skills to your library
              </p>
            )}

            {/* Instructions */}
            {!isLoading && displayFiles.length > 0 && (
              <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                <h3 className="text-sm font-medium text-zinc-300 mb-2">How to use this skill:</h3>
                <ol className="text-sm text-zinc-500 space-y-1 list-decimal list-inside">
                  <li>Download the ZIP or copy the files</li>
                  <li>Extract to <code className="text-amber-400">~/.openclaw/workspace/skills/{skillName}/</code></li>
                  <li>Your agent will automatically discover and use the skill</li>
                </ol>
                <p className="mt-3 text-xs text-zinc-600">
                  Or install via CLI: <code className="text-amber-400/70">npx agentskills install {skillName}</code> (coming soon)
                </p>
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
