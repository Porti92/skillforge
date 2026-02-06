"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";

interface Props {
  content: string;
  onContentChange: (newContent: string) => void;
}

export function InlineEditableMarkdown({ content, onContentChange }: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const editableRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [localContent, setLocalContent] = useState(content);

  // Split content into sections by headings
  const sections = localContent.split(/(?=^#{1,6} )/gm);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Focus the editable element when entering edit mode
  useEffect(() => {
    if (editingIndex !== null && editableRefs.current[editingIndex]) {
      const el = editableRefs.current[editingIndex];
      if (el) {
        el.focus();
        // Place cursor at the end
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, [editingIndex]);

  const handleSectionClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIndex(index);
  };

  const saveEdit = (index: number) => {
    const el = editableRefs.current[index];
    if (!el) return;

    const newText = el.innerText;
    const newSections = [...sections];
    newSections[index] = newText;

    const newContent = newSections.join("\n\n");
    setLocalContent(newContent);
    onContentChange(newContent);
    setEditingIndex(null);
  };

  const handleBlur = (index: number) => {
    // Small delay to allow click events to process
    setTimeout(() => {
      if (editingIndex === index) {
        saveEdit(index);
      }
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Escape") {
      setEditingIndex(null);
      setLocalContent(content); // Reset to original
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveEdit(index);
    }
  };

  return (
    <div className="typeset">
      {sections.map((section, index) => {
        const isEditing = editingIndex === index;

        return (
          <div
            key={index}
            className="relative group"
            onClick={(e) => !isEditing && handleSectionClick(index, e)}
          >
            {/* Hover indicator */}
            {!isEditing && editingIndex === null && (
              <div className="absolute -left-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-zinc-600 text-xs">✎</span>
              </div>
            )}

            {/* Editable content with preserved styling */}
            <div
              ref={(el) => (editableRefs.current[index] = el)}
              contentEditable={isEditing}
              suppressContentEditableWarning
              onBlur={() => handleBlur(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`outline-none ${isEditing ? "cursor-text" : "cursor-pointer"} ${
                isEditing ? "ring-1 ring-amber-600/30 rounded" : ""
              }`}
              style={{
                WebkitUserModify: isEditing ? "read-write-plaintext-only" : undefined,
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeHighlight]}
              >
                {section}
              </ReactMarkdown>
            </div>
          </div>
        );
      })}
      <div className="mt-8 text-center text-sm text-zinc-600">
        💡 Click any section to edit it inline
      </div>
    </div>
  );
}
