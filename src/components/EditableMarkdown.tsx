"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";

interface Props {
  content: string;
  onContentChange: (newContent: string) => void;
}

export function EditableMarkdown({ content, onContentChange }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Split content into sections by headings
  const sections = content.split(/(?=^#{1,6} )/gm);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [editValue, isEditing]);

  const handleStartEdit = (section: string) => {
    setEditingSection(section);
    setEditValue(section);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editingSection !== null) {
      const newContent = content.replace(editingSection, editValue);
      onContentChange(newContent);
    }
    setIsEditing(false);
    setEditingSection(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingSection(null);
    setEditValue("");
  };

  return (
    <div className="typeset">
      {sections.map((section, index) => {
        const isCurrentlyEditing = isEditing && editingSection === section;

        return (
          <div
            key={index}
            className="relative group"
            onDoubleClick={() => !isEditing && handleStartEdit(section)}
          >
            {isCurrentlyEditing ? (
              <div className="space-y-2 mb-4">
                <textarea
                  ref={textareaRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full min-h-[120px] px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded-md text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 resize-none overflow-hidden"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="px-3 py-1.5 bg-amber-600 text-zinc-950 text-sm font-medium rounded hover:bg-amber-500 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-sm font-medium rounded hover:bg-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                {!isEditing && (
                  <div className="absolute -left-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartEdit(section)}
                      className="text-zinc-600 hover:text-amber-500 text-xs"
                      title="Click to edit this section"
                    >
                      ✎
                    </button>
                  </div>
                )}
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeHighlight]}
                >
                  {section}
                </ReactMarkdown>
              </div>
            )}
          </div>
        );
      })}
      {!isEditing && (
        <div className="mt-8 text-center text-sm text-zinc-600">
          💡 Double-click any section to edit it inline
        </div>
      )}
    </div>
  );
}
