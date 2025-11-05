'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Spoiler } from '@/lib/tiptap-spoiler';
import { FONT_STYLES, applyFontStyle } from '@/lib/unicode-fonts';
import { useCallback, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  FileCode2,
  Link as LinkIcon,
  Quote,
  Eye,
  EyeOff,
  Type,
  ChevronDown,
  Smile,
  FileText,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { EmojiSymbolPicker } from './EmojiSymbolPicker';
import { WelcomeMessageTemplates } from './WelcomeMessageTemplates';

interface WelcomeMessageEditorProps {
  content: string;
  onChange: (html: string) => void;
}

/**
 * WelcomeMessageEditor component
 * Rich text editor using TipTap with Telegram formatting support
 */
export function WelcomeMessageEditor({ content, onChange }: WelcomeMessageEditorProps) {
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Telegram doesn't support headings
        horizontalRule: false,
        bulletList: false, // Telegram doesn't support lists
        orderedList: false,
        hardBreak: {}, // Enable Shift+Enter for line breaks
        blockquote: {
          HTMLAttributes: {
            class: 'tiptap-blockquote',
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: 'tiptap-paragraph',
          },
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'tiptap-link',
        },
      }),
      Spoiler,
    ],
    content: content,
    editorProps: {
      attributes: {
        class: 'max-w-none focus:outline-none min-h-[200px] p-4 text-sm',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Update editor content when prop changes (for initial load)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const applyUnicodeFont = useCallback((styleId: string) => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);

    if (!selectedText) {
      return;
    }

    const transformedText = applyFontStyle(selectedText, styleId);
    editor.chain().focus().deleteSelection().insertContent(transformedText).run();
  }, [editor]);

  const insertEmojiOrSymbol = useCallback((symbol: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(symbol).run();
    setEmojiPickerOpen(false);
  }, [editor]);

  const selectTemplate = useCallback((template: { content: string }) => {
    if (!editor) return;
    editor.commands.setContent(template.content);
    onChange(template.content);
    setTemplateDialogOpen(false);
  }, [editor, onChange]);

  if (!editor) {
    return <div className="h-[250px] bg-muted animate-pulse rounded-md" />;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-muted p-2 border-b flex flex-wrap gap-1 items-center">
        {/* Template Library Button */}
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="px-3 py-2 rounded hover:bg-background transition-colors text-muted-foreground flex items-center gap-1 text-sm"
              title="Choose Template"
            >
              <FileText className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Welcome Message Templates</DialogTitle>
            </DialogHeader>
            <WelcomeMessageTemplates onSelect={selectTemplate} />
          </DialogContent>
        </Dialog>

        <div className="w-px h-6 bg-border mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Inline Code (Ctrl+E)"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code Block (Ctrl+Shift+C)"
        >
          <FileCode2 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={setLink}
          active={editor.isActive('link')}
          title="Insert Link"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSpoiler().run()}
          active={editor.isActive('spoiler')}
          title="Spoiler (Ctrl+Shift+S)"
        >
          {editor.isActive('spoiler') ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Emoji & Symbol Picker */}
        <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="px-3 py-2 rounded hover:bg-background transition-colors text-muted-foreground flex items-center gap-1 text-sm"
              title="Insert Emoji or Symbol"
            >
              <Smile className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-auto" align="start">
            <EmojiSymbolPicker onSelect={insertEmojiOrSymbol} />
          </PopoverContent>
        </Popover>

        {/* Unicode Font Styles Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="px-3 py-2 rounded hover:bg-background transition-colors text-muted-foreground flex items-center gap-1 text-sm"
              title="Apply Unicode Font Style"
            >
              <Type className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 max-h-[400px] overflow-y-auto">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Select text, then choose style
            </div>
            <DropdownMenuSeparator />
            {FONT_STYLES.map((style) => (
              <DropdownMenuItem
                key={style.id}
                onClick={() => applyUnicodeFont(style.id)}
                className="flex flex-col items-start gap-1 cursor-pointer"
              >
                <span className="font-medium text-sm">{style.name}</span>
                <span className="text-xs text-muted-foreground">{style.example}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Helper text */}
      <div className="px-3 py-1 bg-muted/50 border-b text-xs text-muted-foreground">
        <span className="font-medium">Tip:</span> Press <kbd className="px-1 py-0.5 bg-background border rounded text-[10px]">Enter</kbd> for new paragraph, <kbd className="px-1 py-0.5 bg-background border rounded text-[10px]">Shift+Enter</kbd> for line break
      </div>

      {/* Editor */}
      <div className="bg-background">
        <EditorContent editor={editor} />
      </div>

      {/* Custom styles for the editor */}
      <style jsx global>{`
        .tiptap {
          min-height: 200px;
          color: hsl(var(--foreground)) !important;
        }

        .tiptap * {
          color: inherit;
        }

        .tiptap p {
          margin: 0.5em 0;
          color: hsl(var(--foreground));
        }

        .tiptap p:first-child {
          margin-top: 0;
        }

        .tiptap p:last-child {
          margin-bottom: 0;
        }

        .tiptap strong,
        .tiptap b {
          font-weight: 700;
          color: hsl(var(--foreground));
        }

        .tiptap em,
        .tiptap i {
          font-style: italic;
          color: hsl(var(--foreground));
        }

        .tiptap u {
          text-decoration: underline;
          color: hsl(var(--foreground));
        }

        .tiptap s {
          text-decoration: line-through;
          color: hsl(var(--foreground));
        }

        .tiptap code {
          background-color: hsl(var(--muted));
          color: hsl(var(--foreground));
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.9em;
        }

        .tiptap pre {
          background-color: hsl(var(--muted));
          color: hsl(var(--foreground));
          padding: 12px;
          border-radius: 6px;
          overflow-x: auto;
          margin: 8px 0;
          font-family: 'Courier New', Courier, monospace;
          border: 1px solid hsl(var(--border));
        }

        .tiptap pre code {
          background-color: transparent;
          padding: 0;
          font-size: 0.875em;
          font-family: inherit;
          color: hsl(var(--foreground));
        }

        .tiptap a {
          color: hsl(var(--primary));
          text-decoration: underline;
          cursor: pointer;
        }

        .tiptap blockquote {
          border-left: 3px solid hsl(var(--border));
          padding-left: 12px;
          margin: 8px 0;
          color: hsl(var(--muted-foreground));
        }

        .tiptap tg-spoiler {
          background-color: hsl(var(--muted));
          color: transparent;
          border-radius: 3px;
          padding: 0 2px;
          cursor: help;
        }

        .tiptap tg-spoiler:hover {
          background-color: transparent;
          color: hsl(var(--foreground));
        }

        .tiptap-link {
          color: hsl(var(--primary));
        }

        /* Ensure placeholder text is visible in dark mode */
        .tiptap p.is-editor-empty:first-child::before {
          color: hsl(var(--muted-foreground));
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded hover:bg-background transition-colors ${
        active ? 'bg-background text-primary' : 'text-muted-foreground'
      }`}
    >
      {children}
    </button>
  );
}
