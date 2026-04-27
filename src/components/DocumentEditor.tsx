import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import FontFamily from '@tiptap/extension-font-family';
import TextStyle from '@tiptap/extension-text-style';
import { useRef, useEffect, useState, useCallback } from 'react';
import html2pdf from 'html2pdf.js';
import DocumentPage from './DocumentPage';
import { CONTENT_HEIGHT_PX } from '@/lib/pageConstants';
import FontSize from './extensions/FontSize';
import { Indent as IndentExt } from './extensions/Indent';
import { useApp } from '@/contexts/AppContext';
import { getAllBiodataPlaceholders } from '@/lib/store';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Link as LinkIcon,
  RemoveFormatting,
  Undo2,
  Redo2,
  FileDown,
  Hash,
  User,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

interface DocumentEditorProps {
  value?: string;
  onChange?: (value: string) => void;
}

const FONT_FAMILIES = [
  { label: 'Times New Roman', value: 'Times New Roman, Times, serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
];

const FONT_SIZES = [
  { label: '8 pt', value: '8pt' },
  { label: '10 pt', value: '10pt' },
  { label: '12 pt', value: '12pt' },
  { label: '14 pt', value: '14pt' },
  { label: '18 pt', value: '18pt' },
  { label: '24 pt', value: '24pt' },
  { label: '36 pt', value: '36pt' },
];

const HEADINGS = [
  { label: 'Normal', value: 'p' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
  { label: 'Heading 4', value: 'h4' },
];

export default function DocumentEditor({ value, onChange }: DocumentEditorProps) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const { data } = useApp();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      IndentExt,
      Superscript,
      Subscript,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: value || '<p>Start typing your document...</p>',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Sync external value → editor (only if different to avoid cursor jumps)
  useEffect(() => {
    if (!editor || value === undefined) return;
    const currentHtml = editor.getHTML();
    if (value !== currentHtml) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  // Dynamic page count via ResizeObserver
  useEffect(() => {
    if (!editor || !editorRef.current) return;

    const proseMirror = editorRef.current.querySelector('.ProseMirror');
    if (!proseMirror) return;

    const observer = new ResizeObserver(() => {
      const height = proseMirror.getBoundingClientRect().height;
      const pages = Math.max(1, Math.ceil(height / CONTENT_HEIGHT_PX));
      setPageCount(pages);
    });

    observer.observe(proseMirror);

    return () => observer.disconnect();
  }, [editor]);

  const generatePDF = useCallback(() => {
    if (!pdfRef.current) return;
    html2pdf()
      .set({
        margin: 0,
        filename: 'document.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' },
      })
      .from(pdfRef.current)
      .save();
  }, []);

  const handleLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!editor || !editorRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (!editorRef.current!.contains(target)) return;

      // Tab: First-line indent (insert tab at beginning of paragraph)
      // Ctrl+]: Paragraph indent (margin-left via Indent extension)
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab: Remove first-line indent (tab from beginning of paragraph)
          const { from } = editor.state.selection;
          const pos = editor.state.doc.resolve(from);
          const paragraphStart = pos.before(pos.depth);
          const paragraph = pos.node(pos.depth);
          
          if (paragraph && paragraph.textContent.startsWith('\t')) {
            const tabPos = paragraphStart + 1;
            const newFrom = from <= tabPos ? from : from - 1;
            editor.chain()
              .focus()
              .deleteRange({ from: tabPos, to: tabPos + 1 })
              .setTextSelection(newFrom)
              .run();
          } else if (editor.can().liftListItem('listItem')) {
            editor.chain().focus().liftListItem('listItem').run();
          } else {
            editor.chain().focus().outdent().run();
          }
        } else {
          // Tab: Add first-line indent (insert tab at beginning of paragraph)
          const { from } = editor.state.selection;
          const pos = editor.state.doc.resolve(from);
          const paragraphStart = pos.before(pos.depth);
          editor.chain()
            .focus()
            .setTextSelection(paragraphStart + 1)
            .insertContent('\t')
            .setTextSelection(from + 1)
            .run();
        }
        return;
      }


      if (!e.ctrlKey && !e.metaKey) return;


      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          editor.chain().focus().toggleBold().run();
          break;
        case 'i':
          e.preventDefault();
          editor.chain().focus().toggleItalic().run();
          break;
        case 'u':
          e.preventDefault();
          editor.chain().focus().toggleUnderline().run();
          break;
        case 'k':
          e.preventDefault();
          handleLink();
          break;
        case 'z':
          e.preventDefault();
          e.shiftKey
            ? editor.chain().focus().redo().run()
            : editor.chain().focus().undo().run();
          break;
        case 'y':
          e.preventDefault();
          editor.chain().focus().redo().run();
          break;
        case 'l':
          e.preventDefault();
          editor.chain().focus().setTextAlign('left').run();
          break;
        case 'e':
          e.preventDefault();
          editor.chain().focus().setTextAlign('center').run();
          break;
        case 'r':
          e.preventDefault();
          editor.chain().focus().setTextAlign('right').run();
          break;
        case 'j':
          e.preventDefault();
          editor.chain().focus().setTextAlign('justify').run();
          break;
        case ']':
          e.preventDefault();
          editor.chain().focus().indent().run();
          break;
        case '[':
          e.preventDefault();
          editor.chain().focus().outdent().run();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor, handleLink]);

  if (!editor) return null;

  const biodataPlaceholders = getAllBiodataPlaceholders(data.settings);

  return (
    <div className="bg-gray-100 dark:bg-gray-900 py-6">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur border-b border-gray-200 dark:border-gray-700 px-3 py-2 flex flex-wrap items-center gap-1 shadow-sm">
        {/* Undo / Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          icon={<Undo2 className="h-4 w-4" />}
          title="Undo (Ctrl+Z)"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          icon={<Redo2 className="h-4 w-4" />}
          title="Redo (Ctrl+Y)"
        />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Font Family */}
        <Select
          value={(editor.getAttributes('textStyle').fontFamily as string) || FONT_FAMILIES[0].value}
          onValueChange={(font) =>
            editor.chain().focus().setFontFamily(font).run()
          }
        >
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Font Size */}
        <Select
          value={(editor.getAttributes('fontSize').fontSize as string) || '12pt'}
          onValueChange={(size) =>
            editor.chain().focus().setFontSize(size).run()
          }
        >
          <SelectTrigger className="h-8 w-[80px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Heading */}
        <Select
          value={(() => {
            if (editor.isActive('heading', { level: 1 })) return 'h1';
            if (editor.isActive('heading', { level: 2 })) return 'h2';
            if (editor.isActive('heading', { level: 3 })) return 'h3';
            if (editor.isActive('heading', { level: 4 })) return 'h4';
            return 'p';
          })()}
          onValueChange={(tag) => {
            if (tag === 'p') {
              editor.chain().focus().setParagraph().run();
            } else {
              const level = parseInt(tag[1]);
              editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 }).run();
            }
          }}
        >

          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HEADINGS.map((h) => (
              <SelectItem key={h.value} value={h.value}>
                {h.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Formatting */}
        <ToolbarToggle
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          icon={<Bold className="h-4 w-4" />}
          title="Bold (Ctrl+B)"
        />
        <ToolbarToggle
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          icon={<Italic className="h-4 w-4" />}
          title="Italic (Ctrl+I)"
        />
        <ToolbarToggle
          pressed={editor.isActive('underline')}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          icon={<UnderlineIcon className="h-4 w-4" />}
          title="Underline (Ctrl+U)"
        />
        <ToolbarToggle
          pressed={editor.isActive('strike')}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          icon={<Strikethrough className="h-4 w-4" />}
          title="Strikethrough"
        />
        <ToolbarToggle
          pressed={editor.isActive('superscript')}
          onPressedChange={() => editor.chain().focus().toggleSuperscript().run()}
          icon={<SuperscriptIcon className="h-4 w-4" />}
          title="Superscript"
        />
        <ToolbarToggle
          pressed={editor.isActive('subscript')}
          onPressedChange={() => editor.chain().focus().toggleSubscript().run()}
          icon={<SubscriptIcon className="h-4 w-4" />}
          title="Subscript"
        />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alignment */}
        <ToolbarToggle
          pressed={editor.isActive({ textAlign: 'left' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
          icon={<AlignLeft className="h-4 w-4" />}
          title="Align Left (Ctrl+L)"
        />
        <ToolbarToggle
          pressed={editor.isActive({ textAlign: 'center' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
          icon={<AlignCenter className="h-4 w-4" />}
          title="Align Center (Ctrl+E)"
        />
        <ToolbarToggle
          pressed={editor.isActive({ textAlign: 'right' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
          icon={<AlignRight className="h-4 w-4" />}
          title="Align Right (Ctrl+R)"
        />
        <ToolbarToggle
          pressed={editor.isActive({ textAlign: 'justify' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('justify').run()}
          icon={<AlignJustify className="h-4 w-4" />}
          title="Justify (Ctrl+J)"
        />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <ToolbarToggle
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          icon={<List className="h-4 w-4" />}
          title="Bullet List (Ctrl+Shift+L)"
        />
        <ToolbarToggle
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          icon={<ListOrdered className="h-4 w-4" />}
          title="Numbered List (Ctrl+Shift+N)"
        />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Indent */}
        <ToolbarButton
          onClick={() => editor.chain().focus().indent().run()}
          icon={<Indent className="h-4 w-4" />}
          title="Increase Indent (Ctrl+])"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().outdent().run()}
          icon={<Outdent className="h-4 w-4" />}
          title="Decrease Indent (Ctrl+[)"
        />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Link & Clear */}
        <ToolbarButton
          onClick={handleLink}
          icon={<LinkIcon className="h-4 w-4" />}
          title="Insert Link (Ctrl+K)"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          icon={<RemoveFormatting className="h-4 w-4" />}
          title="Clear Formatting"
        />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Page Number Toggle */}
        <ToolbarToggle
          pressed={showPageNumbers}
          onPressedChange={() => setShowPageNumbers(!showPageNumbers)}
          icon={<Hash className="h-4 w-4" />}
          title="Toggle Page Numbers"
        />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Biodata Placeholder Dropdown */}
        <Select
          onValueChange={(key) => {
            const field = biodataPlaceholders.find(f => f.key === key);
            if (field) {
              editor.chain().focus().insertContent(field.placeholder).run();
            }
          }}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <User className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Biodata" />
          </SelectTrigger>
          <SelectContent>
            {biodataPlaceholders.map((field) => (
              <SelectItem key={field.key} value={field.key}>
                {field.label} ({field.placeholder})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pages */}
      <div ref={pdfRef} className="mt-6">
        {Array.from({ length: pageCount }).map((_, index) => (
          <DocumentPage key={index} pageNumber={index + 1} showPageNumber={showPageNumbers}>
            {index === 0 && (
              <div ref={editorRef}>
                <EditorContent editor={editor} />
              </div>
            )}
          </DocumentPage>
        ))}
      </div>

      {/* PDF Export FAB */}
      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg"
        onClick={generatePDF}
        title="Export PDF"
      >
        <FileDown className="h-5 w-5" />
      </Button>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────── */

function ToolbarButton({
  onClick,
  disabled,
  icon,
  title,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {icon}
    </Button>
  );
}

function ToolbarToggle({
  pressed,
  onPressedChange,
  icon,
  title,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Toggle
      pressed={pressed}
      onPressedChange={onPressedChange}
      className="h-8 w-8 data-[state=on]:bg-accent"
      title={title}
    >
      {icon}
    </Toggle>
  );
}
