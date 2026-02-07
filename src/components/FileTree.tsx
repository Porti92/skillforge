"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, FileText, FolderOpen, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkillFile {
  path: string;
  content: string;
}

interface FileTreeProps {
  files: SkillFile[];
  skillName?: string;
}

function getFileIcon(path: string) {
  if (path.endsWith(".md")) return "📄";
  if (path.endsWith(".py")) return "🐍";
  if (path.endsWith(".sh") || path.endsWith(".bash")) return "🔧";
  if (path.endsWith(".js") || path.endsWith(".ts")) return "📜";
  if (path.endsWith(".json")) return "⚙️";
  return "📄";
}

function getLanguage(path: string): string {
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".sh") || path.endsWith(".bash")) return "bash";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".json")) return "json";
  return "plaintext";
}

function FileItem({ file, defaultExpanded = false }: { file: SkillFile; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fileName = file.path.split("/").pop() || file.path;
  const icon = getFileIcon(file.path);

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/50">
      {/* File header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          )}
          <span className="text-base">{icon}</span>
          <span className="text-sm font-medium text-zinc-200">{file.path}</span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          title="Copy file content"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </button>

      {/* File content */}
      {expanded && (
        <div className="border-t border-zinc-800">
          <pre className="p-4 overflow-x-auto text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed bg-zinc-950/50 max-h-[500px] overflow-y-auto">
            {file.content}
          </pre>
        </div>
      )}
    </div>
  );
}

export function FileTree({ files, skillName = "my-skill" }: FileTreeProps) {
  const [allExpanded, setAllExpanded] = useState(true);

  return (
    <div className="space-y-3">
      {/* Folder header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-zinc-300">
          <FolderOpen className="w-5 h-5 text-amber-500" />
          <span className="font-medium">{skillName}/</span>
          <span className="text-xs text-zinc-500">({files.length} files)</span>
        </div>
        <button
          onClick={() => setAllExpanded(!allExpanded)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {/* File list */}
      <div className="space-y-2 pl-2">
        {files.map((file, index) => (
          <FileItem
            key={file.path}
            file={file}
            defaultExpanded={allExpanded && index === 0} // First file expanded by default
          />
        ))}
      </div>
    </div>
  );
}

export type { SkillFile };
