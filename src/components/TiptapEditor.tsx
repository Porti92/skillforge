'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Typography from '@tiptap/extension-typography'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { createLowlight } from 'lowlight'
import { useEffect } from 'react'
import { Markdown } from 'tiptap-markdown'
import { TiptapToolbar } from './TiptapToolbar'
import '@/styles/tiptap.css'

// Import common languages for syntax highlighting
import typescript from 'highlight.js/lib/languages/typescript'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'
import json from 'highlight.js/lib/languages/json'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'

// Create lowlight instance
const lowlight = createLowlight()
lowlight.register('typescript', typescript)
lowlight.register('javascript', javascript)
lowlight.register('python', python)
lowlight.register('json', json)
lowlight.register('css', css)
lowlight.register('xml', xml)
lowlight.register('html', xml)

interface TiptapEditorProps {
  content: string
  onChange?: (content: string) => void
  editable?: boolean
  className?: string
  showToolbar?: boolean
}

export function TiptapEditor({ content, onChange, editable = true, className = '', showToolbar = true }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      Typography,
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'typescript',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-amber-500 hover:text-amber-400 underline',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content,
    editable,
    immediatelyRender: false, // Fix SSR hydration issue
    onUpdate: ({ editor }) => {
      // Get markdown output from the editor
      const markdown = editor.storage.markdown.getMarkdown()
      onChange?.(markdown)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none tiptap-editor min-h-[400px] px-6 pb-6',
      },
    },
  })

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.storage.markdown?.getMarkdown()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable)
    }
  }, [editable, editor])

  if (!editor) {
    return null
  }

  return (
    <div className={`tiptap-wrapper ${className}`} style={{ backgroundColor: "var(--card)" }}>
      {showToolbar && editable && <TiptapToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}
