import React, { useState, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { generateId, slugify, JenisSurat, COLOR_THEMES, ColorTheme, DEFAULT_BIODATA, BiodataField, getAllBiodataFields, generateBiodataTableHtml, expandSchoolName, buildLine2, buildSchoolSub, parseMadrasahName, isValidTahunAjaran } from '@/lib/store';
import { KABUPATEN_LIST } from '@/lib/kabupaten';
import { FONT_SIZE_OPTIONS } from '@/lib/headerUtils';
import Expandable from '@/components/Expandable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Upload, Moon, Sun, ImagePlus, Download, FolderOpen, ListChecks, CalendarDays, FileText, Contact, Palette, Database, User, LogOut, Pencil, Check, X, Undo2, Redo2, Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Outdent, Indent, Minus, Eye, Printer, Loader2, RefreshCw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loadData, saveData } from '@/lib/store';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { JenisSuratWizard } from '@/components/JenisSuratWizard';
import { useSidebar } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import kemenagLogo from '@/assets/kemenag-logo.png';
import JSZip from 'jszip';

const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

function DataPathSection() {
  const [dataPath, setDataPath] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.getDataPath().then(p => setDataPath(p));
    }
  }, []);

  const handleChoose = async () => {
    if (!isElectron || !window.electronAPI) return;
    setLoading(true);
    try {
      const chosen = await window.electronAPI.chooseDataPath();
      if (chosen) {
        setDataPath(chosen);
        toast.success('Lokasi penyimpanan diperbarui. Restart aplikasi agar perubahan berlaku.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-lg border border-border bg-muted/50 space-y-2">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Lokasi Penyimpanan Data</Label>
      </div>
      {isElectron ? (
        <>
          <p className="text-xs font-mono text-foreground break-all">{dataPath || 'Memuat...'}</p>
          <Button variant="outline" size="sm" onClick={handleChoose} disabled={loading}>
            <FolderOpen className="mr-1 h-4 w-4" />
            {loading ? 'Memilih...' : 'Ubah Lokasi'}
          </Button>
          <p className="text-xs text-muted-foreground">Pilih folder untuk menyimpan data aplikasi. Restart diperlukan setelah mengubah.</p>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground font-mono">localStorage (browser)</p>
          <p className="text-xs text-muted-foreground">Lokasi kustom tersedia di versi desktop app (Electron).</p>
        </>
      )}
    </div>
  );
}

// ── Full Rich-Text Toolbar for Template Isi Surat ──────────────────────────
const TEMPLATE_EDITOR_STYLE = `
  .te-wrap { border: 1px solid hsl(var(--border)); border-radius: 6px; overflow: hidden; background: #fff; }
  .te-toolbar {
    display: flex; flex-wrap: wrap; align-items: center; gap: 2px;
    padding: 4px 6px; background: hsl(var(--muted)); border-bottom: 1px solid hsl(var(--border));
    user-select: none;
  }
  .te-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 4px; border: none;
    background: transparent; cursor: pointer; color: hsl(var(--foreground));
    transition: background 0.1s;
  }
  .te-btn:hover { background: hsl(var(--accent)); }
  .te-btn.active { background: hsl(var(--accent)); color: hsl(var(--accent-foreground)); }
  .te-sep { width: 1px; height: 20px; background: hsl(var(--border)); margin: 0 3px; flex-shrink: 0; }
  .te-fontsize {
    height: 28px; padding: 0 4px; border: 1px solid hsl(var(--border)); border-radius: 4px;
    background: hsl(var(--background)); font-size: 12px; cursor: pointer;
    color: hsl(var(--foreground));
  }
  .te-biodata-btn {
    display: inline-flex; align-items: center; gap: 4px; height: 28px; padding: 0 8px;
    border-radius: 4px; border: 1px solid hsl(var(--border));
    background: hsl(var(--background)); font-size: 12px; cursor: pointer;
    color: hsl(var(--foreground)); white-space: nowrap;
  }
  .te-biodata-btn:hover { background: hsl(var(--accent)); }
  .te-preview-btn {
    display: inline-flex; align-items: center; gap: 4px; height: 28px; padding: 0 10px;
    border-radius: 4px; border: 1px solid hsl(var(--border));
    background: hsl(var(--background)); font-size: 12px; cursor: pointer;
    color: hsl(var(--foreground)); white-space: nowrap; margin-left: auto;
  }
  .te-preview-btn:hover { background: hsl(var(--accent)); }
  .te-print-btn {
    display: inline-flex; align-items: center; gap: 4px; height: 28px; padding: 0 10px;
    border-radius: 4px; border: none;
    background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
    font-size: 12px; cursor: pointer; white-space: nowrap;
  }
  .te-print-btn:hover { opacity: 0.9; }
  .te-body {
    font-family: 'Times New Roman', Times, serif !important;
    font-size: 12pt !important;
    line-height: 1.5 !important;
    color: #000 !important;
    background: #fff !important;
    text-align: justify;
    word-break: break-word;
    min-height: 300px;
    padding: 20mm 25.4mm;
    box-sizing: border-box;
    outline: none;
    caret-color: #000;
  }
  .te-body:empty::before {
    content: 'Ketik teks di sini...';
    color: #aaa; font-style: italic; pointer-events: none;
  }
  .te-body p, .te-body div {
    margin-top: 0 !important; margin-bottom: 0 !important;
    line-height: 1.5 !important; min-height: 1.5em;
    font-family: 'Times New Roman', Times, serif !important;
    font-size: 12pt !important; color: #000 !important;
    text-align: justify;
  }
  .te-body b, .te-body strong { font-weight: bold !important; }
  .te-body i, .te-body em { font-style: italic !important; }
  .te-body u { text-decoration: underline !important; }
  .te-body span.tab-indent {
    display: inline-block !important; width: 2cm !important; min-width: 2cm !important;
    max-width: 2cm !important; overflow: hidden !important;
    white-space: pre !important; vertical-align: baseline !important;
  }
  .te-body * {
    color: #000 !important;
    font-family: 'Times New Roman', Times, serif !important;
    font-size: 12pt !important; line-height: 1.5 !important;
  }
  .te-preview-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;
  }
  .te-preview-modal {
    background: #fff; width: 210mm; max-height: 90vh;
    overflow-y: auto; border-radius: 4px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    padding: 20mm 25.4mm; box-sizing: border-box;
    font-family: 'Times New Roman', Times, serif; font-size: 12pt;
    line-height: 1.5; color: #000;
  }
  .te-preview-modal-toolbar {
    position: sticky; top: 0; background: #f5f5f5; border-bottom: 1px solid #ccc;
    padding: 8px 16px; display: flex; gap: 8px; align-items: center;
    margin: -20mm -25.4mm 16px; padding: 8px 16px;
  }
`;

const TemplateEditor = React.forwardRef<HTMLDivElement, {
  value: string;
  onChange: (html: string) => void;
  onBiodataClick?: () => void;
  label?: string;
}>(({
  value,
  onChange,
  onBiodataClick,
}, forwardedRef) => {
  const internalRef = useRef<HTMLDivElement>(null);
  // Merge forwarded ref + internal ref so BiodataChecklistSection (using forwardedRef)
  // and TemplateEditor internals (using internalRef) both point to the same DOM node
  const setRef = React.useCallback((node: HTMLDivElement | null) => {
    (internalRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  }, [forwardedRef]);
  const editorRef = internalRef;
  const [showPreview, setShowPreview] = React.useState(false);
  const [fontSize, setFontSize] = React.useState('12');

  // Sync external value into editor when it changes (e.g., loading existing template)
  const lastValueRef = useRef<string>('');
  React.useEffect(() => {
    if (editorRef.current && value !== lastValueRef.current) {
      editorRef.current.innerHTML = value;
      lastValueRef.current = value;
    }
  }, [value]);

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    flush();
  };

  const flush = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastValueRef.current = html;
      onChange(html);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertHTML', false,
        '<span class="tab-indent" style="display:inline-block;width:2cm;min-width:2cm;white-space:pre"> </span>');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertParagraph', false);
    } else if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); exec('bold'); }
      else if (e.key === 'i') { e.preventDefault(); exec('italic'); }
      else if (e.key === 'u') { e.preventDefault(); exec('underline'); }
      else if (e.key === 'z') { e.preventDefault(); exec('undo'); }
      else if (e.key === 'y') { e.preventDefault(); exec('redo'); }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    let content = '';
    if (html) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      tmp.querySelectorAll('style, script, meta, link').forEach(el => el.remove());
      tmp.innerHTML = tmp.innerHTML
        .replace(/<!--\[if[\s\S]*?-->/gi, '')
        .replace(/<!\[endif\]-->/gi, '')
        .replace(/<!--[\s\S]*?-->/gi, '');
      tmp.querySelectorAll('*').forEach((el: Element) => {
        const h = el as HTMLElement;
        const align = h.style.textAlign;
        h.removeAttribute('style'); h.removeAttribute('class'); h.removeAttribute('lang');
        if (align && align !== 'start' && align !== 'left') h.style.textAlign = align;
      });
      tmp.querySelectorAll('p, div').forEach((el: Element) => {
        if (!(el.textContent || '').trim() && !(el as HTMLElement).querySelector('img')) el.remove();
      });
      content = tmp.innerHTML;
    } else if (text) {
      content = text.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    }
    document.execCommand('insertHTML', false, content);
    flush();
  };

  const TBtn = ({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" className="te-btn" title={title} onMouseDown={e => { e.preventDefault(); onClick(); }}>{children}</button>
  );

  return (
    <>
      <style>{TEMPLATE_EDITOR_STYLE}</style>
      <div className="te-wrap">
        {/* ── Toolbar ── */}
        <div className="te-toolbar">
          {/* Undo / Redo */}
          <TBtn title="Undo (Ctrl+Z)" onClick={() => exec('undo')}><Undo2 size={14} /></TBtn>
          <TBtn title="Redo (Ctrl+Y)" onClick={() => exec('redo')}><Redo2 size={14} /></TBtn>

          <div className="te-sep" />

          {/* Font size */}
          <select
            className="te-fontsize"
            value={fontSize}
            onChange={e => { setFontSize(e.target.value); exec('fontSize', '3'); /* placeholder, real size via CSS */ }}
          >
            {[8,9,10,11,12,14,16,18,20,24,28,36].map(s => (
              <option key={s} value={String(s)}>{s}</option>
            ))}
          </select>

          <div className="te-sep" />

          {/* Bold / Italic / Underline */}
          <TBtn title="Tebal (Ctrl+B)" onClick={() => exec('bold')}><Bold size={14} /></TBtn>
          <TBtn title="Miring (Ctrl+I)" onClick={() => exec('italic')}><Italic size={14} /></TBtn>
          <TBtn title="Garis Bawah (Ctrl+U)" onClick={() => exec('underline')}><UnderlineIcon size={14} /></TBtn>

          <div className="te-sep" />

          {/* Alignment */}
          <TBtn title="Rata Kiri" onClick={() => exec('justifyLeft')}><AlignLeft size={14} /></TBtn>
          <TBtn title="Tengah" onClick={() => exec('justifyCenter')}><AlignCenter size={14} /></TBtn>
          <TBtn title="Rata Kanan" onClick={() => exec('justifyRight')}><AlignRight size={14} /></TBtn>
          <TBtn title="Rata Kanan-Kiri" onClick={() => exec('justifyFull')}><AlignJustify size={14} /></TBtn>

          <div className="te-sep" />

          {/* Lists */}
          <TBtn title="Bullet List" onClick={() => exec('insertUnorderedList')}><List size={14} /></TBtn>
          <TBtn title="Numbered List" onClick={() => exec('insertOrderedList')}><ListOrdered size={14} /></TBtn>

          <div className="te-sep" />

          {/* Indent */}
          <TBtn title="Kurangi Indentasi" onClick={() => exec('outdent')}><Outdent size={14} /></TBtn>
          <TBtn title="Tambah Indentasi" onClick={() => exec('indent')}><Indent size={14} /></TBtn>

          <div className="te-sep" />

          {/* Biodata button */}
          {onBiodataClick && (
            <button type="button" className="te-biodata-btn" onMouseDown={e => { e.preventDefault(); onBiodataClick(); }}>
              <ListChecks size={13} /> Biodata
            </button>
          )}

          <div className="te-sep" />
          <div style={{ flexGrow: 1 }} />

          {/* Preview */}
          <button type="button" className="te-preview-btn" onMouseDown={e => { e.preventDefault(); setShowPreview(true); }}>
            <Eye size={13} /> Preview
          </button>
        </div>

        {/* ── Editable body ── */}
        <div
          ref={setRef}
          contentEditable
          suppressContentEditableWarning
          className="te-body"
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'p')}
          onBlur={flush}
          onInput={flush}
        />
      </div>

      {/* ── Preview Modal ── */}
      {showPreview && (
        <div className="te-preview-overlay" onClick={() => setShowPreview(false)}>
          <div className="te-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="te-preview-modal-toolbar">
              <button type="button" className="te-print-btn" onClick={() => window.print()}>
                <Printer size={13} /> Print
              </button>
              <button
                type="button"
                style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #ccc', borderRadius: 4, padding: '2px 10px', cursor: 'pointer' }}
                onClick={() => setShowPreview(false)}
              >Tutup</button>
            </div>
            <div dangerouslySetInnerHTML={{ __html: value }} />
          </div>
        </div>
      )}
    </>
  );
});
TemplateEditor.displayName = 'TemplateEditor';

const BiodataChecklistSection = ({
  selectedBiodata,
  onSelectedChange,
  editorRef,
  settings,
}: {
  selectedBiodata: string[];
  onSelectedChange: (keys: string[]) => void;
  editorRef: React.RefObject<HTMLDivElement>;
  settings: any;
}) => {
  const allFields = getAllBiodataFields(settings).filter(f => f.key !== 'tahunAjaran');

  const toggleKey = (key: string) => {
    if (selectedBiodata.includes(key)) {
      onSelectedChange(selectedBiodata.filter(k => k !== key));
    } else {
      onSelectedChange([...selectedBiodata, key]);
    }
  };

  // Save the live Range object (not a serialized path) — this is the actual cursor position
  const savedRangeRef = useRef<Range | null>(null);

  // Capture cursor/selection whenever user interacts with the editor
  const captureSelection = React.useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      // Only save if cursor is actually inside our editor
      if (el.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  }, [editorRef]);

  React.useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const events = ['keyup', 'mouseup', 'keydown', 'click'];
    events.forEach(ev => el.addEventListener(ev, captureSelection));
    return () => { events.forEach(ev => el.removeEventListener(ev, captureSelection)); };
  }, [editorRef, captureSelection]);

  // onMouseDown on the button: capture BEFORE focus leaves the editor
  const handleInsertMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // prevent button from stealing focus from editor
    captureSelection();
  };

  const insertBiodataTable = () => {
    const el = editorRef.current;
    if (!el) return;
    if (selectedBiodata.length === 0) { toast.error('Pilih biodata terlebih dahulu'); return; }

    const html = generateBiodataTableHtml(selectedBiodata, allFields);
    if (!html) return;

    // Restore focus to editor first
    el.focus();

    const sel = window.getSelection();
    if (!sel) return;

    // Restore saved cursor position if we have one, otherwise insert at end
    if (savedRangeRef.current) {
      try {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      } catch (_) {
        // If saved range is stale, fall back to end
        const fallback = document.createRange();
        fallback.selectNodeContents(el);
        fallback.collapse(false);
        sel.removeAllRanges();
        sel.addRange(fallback);
      }
    } else {
      // No saved range — insert at current cursor or end
      if (sel.rangeCount === 0 || !el.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        const fallback = document.createRange();
        fallback.selectNodeContents(el);
        fallback.collapse(false);
        sel.removeAllRanges();
        sel.addRange(fallback);
      }
    }

    // Insert the biodata table HTML at the cursor position
    document.execCommand('insertHTML', false, html);
    savedRangeRef.current = null;
    onSelectedChange([]);
    toast.success('Tabel biodata disisipkan');
  };

  return (
    <div className="border border-border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-1">
          <ListChecks className="h-4 w-4" />Pilih Biodata untuk Template
        </Label>
        <Button variant="outline" size="sm" onMouseDown={handleInsertMouseDown} onClick={insertBiodataTable}>
          Sisipkan Tabel Biodata
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Centang field yang ingin ditampilkan pada form surat dan dokumen output.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {allFields.map(field => {
          const orderIndex = selectedBiodata.indexOf(field.key);
          return (
            <label key={field.key} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-muted/50">
              <Checkbox
                checked={selectedBiodata.includes(field.key)}
                onCheckedChange={() => toggleKey(field.key)}
              />
              <span>{field.label}</span>
              {orderIndex >= 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                  {orderIndex + 1}
                </span>
              )}
              {field.isCustom && <span className="text-[10px] px-1 py-0.5 rounded bg-accent text-accent-foreground">Kustom</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
};

const Pengaturan = () => {
  const { data, updateData, setTheme, setColorTheme } = useApp();
  const [searchParams] = useSearchParams();
  const { state: sidebarState } = useSidebar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const akunLogoRef = useRef<HTMLInputElement>(null);
  const akunKemenagLogoRef = useRef<HTMLInputElement>(null);
  const isDark = data.settings.theme === 'dark';

  const defaultTab = searchParams.get('tab') || 'general';

  const [nipInput, setNipInput] = useState('');
  const [namaInput, setNamaInput] = useState('');
  const [tahunInput, setTahunInput] = useState('');
  const [jenisLabel, setJenisLabel] = useState('');
  const [jenisJudul, setJenisJudul] = useState('');
  const [newDocxBase64, setNewDocxBase64] = useState<string>('');
  const [newDocxFileName, setNewDocxFileName] = useState<string>('');
  const [editingJenis, setEditingJenis] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editJudul, setEditJudul] = useState('');
  const [reloadingSlug, setReloadingSlug] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardEditingJenis, setWizardEditingJenis] = useState<JenisSurat | undefined>(undefined);

  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [newCustomKey, setNewCustomKey] = useState('');

  // Repo import state
  const [repoJsonText, setRepoJsonText] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'kepala' | 'tahun' | 'jenis' | 'biodata'; id: string; label: string } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [addConfirm, setAddConfirm] = useState<{ type: string; action: () => void } | null>(null);
  const [editConfirm, setEditConfirm] = useState<{ type: string; action: () => void } | null>(null);

  // Kepala edit state
  const [editingKepalaId, setEditingKepalaId] = useState<string | null>(null);
  const [editKepalaName, setEditKepalaName] = useState('');
  const [editKepalaNip, setEditKepalaNip] = useState('');

  const handleAkunLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'customLogo' | 'customKemenagLogo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateData(d => ({ ...d, settings: { ...d.settings, [field]: reader.result as string } }));
      toast.success('Logo berhasil diperbarui');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Kepala Madrasah
  const doAddKepala = () => {
    if (!namaInput.trim()) { toast.error('Nama wajib diisi'); return; }
    if (data.settings.kepalaMadrasah.some(k => k.nama.toLowerCase() === namaInput.trim().toLowerCase())) {
      toast.error('Kepala Madrasah dengan nama yang sama sudah ada');
      return;
    }
    updateData(d => ({
      ...d, settings: { ...d.settings, kepalaMadrasah: [...d.settings.kepalaMadrasah, { id: generateId(), nip: nipInput.trim(), nama: namaInput.trim() }] },
    }));
    setNipInput(''); setNamaInput('');
    toast.success('Kepala Madrasah ditambahkan');
  };
  const addKepala = () => {
    if (!namaInput.trim()) { toast.error('Nama wajib diisi'); return; }
    setAddConfirm({ type: 'Kepala Madrasah', action: doAddKepala });
  };

  const deleteKepala = (id: string) => {
    updateData(d => ({ ...d, settings: { ...d.settings, kepalaMadrasah: d.settings.kepalaMadrasah.filter(k => k.id !== id) } }));
    toast.success('Dihapus');
  };

  const startEditKepala = (k: { id: string; nama: string; nip: string }) => {
    setEditingKepalaId(k.id);
    setEditKepalaName(k.nama);
    setEditKepalaNip(k.nip);
  };
  const doSaveEditKepala = () => {
    if (!editingKepalaId || !editKepalaName.trim()) return;
    updateData(d => ({
      ...d, settings: {
        ...d.settings, kepalaMadrasah: d.settings.kepalaMadrasah.map(k =>
          k.id === editingKepalaId ? { ...k, nama: editKepalaName.trim(), nip: editKepalaNip.trim() } : k
        )
      },
    }));
    setEditingKepalaId(null);
    toast.success('Kepala Madrasah diperbarui');
  };
  const saveEditKepala = () => {
    if (!editingKepalaId || !editKepalaName.trim()) return;
    setEditConfirm({ type: 'Kepala Madrasah', action: doSaveEditKepala });
  };

  // Tahun Ajaran
  const doAddTahun = () => {
    if (!tahunInput.trim()) { toast.error('Tahun ajaran wajib diisi'); return; }
    if (!isValidTahunAjaran(tahunInput.trim())) {
      toast.error('Format harus YYYY/YYYY+1, contoh: 2025/2026');
      return;
    }
    if (data.settings.tahunAjaran.some(t => t.label === tahunInput.trim())) {
      toast.error('Tahun ajaran sudah ada'); return;
    }
    updateData(d => ({
      ...d, settings: { ...d.settings, tahunAjaran: [...d.settings.tahunAjaran, { id: generateId(), label: tahunInput.trim() }] },
    }));
    setTahunInput('');
    toast.success('Tahun ajaran ditambahkan');
  };
  const addTahun = () => {
    if (!tahunInput.trim()) { toast.error('Tahun ajaran wajib diisi'); return; }
    setAddConfirm({ type: 'Tahun Ajaran', action: doAddTahun });
  };
  const deleteTahun = (id: string) => {
    updateData(d => ({ ...d, settings: { ...d.settings, tahunAjaran: d.settings.tahunAjaran.filter(t => t.id !== id) } }));
    toast.success('Dihapus');
  };

  // Jenis Surat
  // ── Jenis Surat DOCX-first handlers ─────────────────────────────────────────

  const handleNewDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.docx')) { toast.error('File harus berformat .docx'); return; }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      bytes.forEach(b => { binary += String.fromCharCode(b); });
      const base64 = btoa(binary);
      setNewDocxBase64(base64);
      setNewDocxFileName(file.name);
      toast.success('DOCX berhasil dimuat: ' + file.name);
    } catch { toast.error('Gagal membaca file DOCX'); }
    e.target.value = '';
  };

  const doAddJenisSurat = async () => {
    if (!jenisLabel.trim()) { toast.error('Label wajib diisi'); return; }
    if (!newDocxBase64) { toast.error('Upload file DOCX template terlebih dahulu'); return; }
    const slug = slugify(jenisLabel.trim());
    if (data.settings.jenisSurat.some(j => j.slug === slug)) { toast.error('Label sudah ada'); return; }
    // Save DOCX to disk (Electron only)
    if (isElectron && window.electronAPI?.saveTemplateDocx) {
      await window.electronAPI.saveTemplateDocx(slug, newDocxBase64);
    }
    // Convert to HTML for fallback preview
    let htmlFallback = '';
    try {
      const mammoth = await import('mammoth');
      const bytes = Uint8Array.from(atob(newDocxBase64), c => c.charCodeAt(0));
      const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
      htmlFallback = result.value;
    } catch { /* non-critical */ }
    updateData(d => ({
      ...d, settings: { ...d.settings, jenisSurat: [...d.settings.jenisSurat, {
        id: generateId(), slug, label: jenisLabel.trim(),
        templateJudul: jenisJudul.trim() || jenisLabel.trim().toUpperCase(),
        templateIsi: htmlFallback,
        templateDocxBase64: newDocxBase64,
        nomorSuratFormat: '###/[JENISURAT]/[BULAN]/[TAHUN]',
        createdAt: new Date().toISOString(),
      }] },
    }));
    setJenisLabel(''); setJenisJudul(''); setNewDocxBase64(''); setNewDocxFileName('');
    toast.success('Jenis surat ditambahkan');
  };

  const addJenisSurat = () => {
    if (!jenisLabel.trim()) { toast.error('Label wajib diisi'); return; }
    if (!newDocxBase64) { toast.error('Upload file DOCX template terlebih dahulu'); return; }
    setAddConfirm({ type: 'Jenis Surat', action: doAddJenisSurat });
  };

  const deleteJenisSurat = (id: string) => {
    const js = data.settings.jenisSurat.find(j => j.id === id);
    if (js && isElectron && window.electronAPI?.deleteTemplateDocx) {
      window.electronAPI.deleteTemplateDocx(js.slug);
    }
    updateData(d => ({
      ...d, settings: { ...d.settings, jenisSurat: d.settings.jenisSurat.filter(j => j.id !== id) },
      surat: d.surat.filter(s => s.jenisSuratId !== id),
    }));
    toast.success('Dihapus');
  };

  const startEditJenis = (js: JenisSurat) => {
    setEditingJenis(js.id); setEditLabel(js.label); setEditJudul(js.templateJudul);
  };

  const doSaveEditJenis = () => {
    if (!editingJenis) return;
    updateData(d => ({
      ...d, settings: { ...d.settings, jenisSurat: d.settings.jenisSurat.map(j =>
        j.id === editingJenis
          ? { ...j, label: editLabel.trim(), templateJudul: editJudul.trim(), slug: slugify(editLabel.trim()) }
          : j
      ) },
    }));
    setEditingJenis(null);
    toast.success('Template diperbarui');
  };

  const saveEditJenis = () => {
    if (!editingJenis) return;
    setEditConfirm({ type: 'Jenis Surat', action: doSaveEditJenis });
  };

  // Handle wizard save for new or edited jenis surat
  const handleWizardSaveJenisSurat = async (jenisSurat: JenisSurat) => {
    try {
      // Save DOCX to disk if present (Electron only)
      if (jenisSurat.templateDocxBase64 && isElectron && window.electronAPI?.saveTemplateDocx) {
        await window.electronAPI.saveTemplateDocx(jenisSurat.slug, jenisSurat.templateDocxBase64);
      }

      if (wizardEditingJenis) {
        // Update existing
        updateData(d => ({
          ...d,
          settings: {
            ...d.settings,
            jenisSurat: d.settings.jenisSurat.map(j => (j.id === jenisSurat.id ? jenisSurat : j)),
          },
        }));
        toast.success('Jenis surat diperbarui');
      } else {
        // Add new
        updateData(d => ({
          ...d,
          settings: {
            ...d.settings,
            jenisSurat: [...d.settings.jenisSurat, jenisSurat],
          },
        }));
        toast.success('Jenis surat ditambahkan');
      }

      setWizardOpen(false);
      setWizardEditingJenis(undefined);
    } catch (err) {
      toast.error('Gagal menyimpan jenis surat');
      console.error(err);
    }
  };

  /** Replace the DOCX file for an existing jenis surat */
  const handleReplaceDocx = async (e: React.ChangeEvent<HTMLInputElement>, jsId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.docx')) { toast.error('File harus berformat .docx'); return; }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      bytes.forEach(b => { binary += String.fromCharCode(b); });
      const base64 = btoa(binary);
      let htmlFallback = '';
      try {
        const mammoth = await import('mammoth');
        const b2 = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const result = await mammoth.convertToHtml({ arrayBuffer: b2.buffer });
        htmlFallback = result.value;
      } catch { /* non-critical */ }
      updateData(d => ({
        ...d, settings: { ...d.settings, jenisSurat: d.settings.jenisSurat.map(j =>
          j.id === jsId ? { ...j, templateDocxBase64: base64, templateIsi: htmlFallback } : j
        ) },
      }));
      // Save to disk
      const js = data.settings.jenisSurat.find(j => j.id === jsId);
      if (js && isElectron && window.electronAPI?.saveTemplateDocx) {
        await window.electronAPI.saveTemplateDocx(js.slug, base64);
      }
      toast.success('DOCX template berhasil diganti');
    } catch { toast.error('Gagal mengganti DOCX'); }
    e.target.value = '';
  };

  /** Reload DOCX from disk after user edits in Word */
  const handleReloadFromDisk = async (js: JenisSurat) => {
    if (!isElectron || !window.electronAPI?.readTemplateDocx) {
      toast.error('Fitur ini hanya tersedia di aplikasi desktop');
      return;
    }
    setReloadingSlug(js.slug);
    try {
      const base64 = await window.electronAPI.readTemplateDocx(js.slug);
      if (!base64) { toast.error('File tidak ditemukan di disk'); return; }
      let htmlFallback = '';
      try {
        const mammoth = await import('mammoth');
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
        htmlFallback = result.value;
      } catch { /* non-critical */ }
      updateData(d => ({
        ...d, settings: { ...d.settings, jenisSurat: d.settings.jenisSurat.map(j =>
          j.id === js.id ? { ...j, templateDocxBase64: base64, templateIsi: htmlFallback } : j
        ) },
      }));
      toast.success('Template berhasil dimuat ulang dari disk');
    } catch (e: any) {
      toast.error('Gagal memuat ulang: ' + e.message);
    } finally {
      setReloadingSlug(null);
    }
  }

  const handleTemplateKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      // Insert a span with class tab-indent — fixed 2cm width, same ruler on every line
      // This matches how MS Word tab stops work at a fixed position
      document.execCommand('insertHTML', false,
        '<span class="tab-indent" style="display:inline-block;width:2cm;min-width:2cm;white-space:pre"> </span>');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Insert new <p> paragraph — matches TinyMCE forced_root_block:'p' behavior
      // This creates proper paragraph blocks that sync with preview
      document.execCommand('insertParagraph', false);
    } else if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          e.stopPropagation();
          document.execCommand('bold', false);
          break;
        case 'i':
          e.preventDefault();
          e.stopPropagation();
          document.execCommand('italic', false);
          break;
        case 'u':
          e.preventDefault();
          e.stopPropagation();
          document.execCommand('underline', false);
          break;
        default:
          break;
      }
    }
  };

  // Custom biodata CRUD
  const addCustomBiodata = () => {
    if (!newCustomLabel.trim()) { toast.error('Label wajib diisi'); return; }
    const key = newCustomKey.trim() || slugify(newCustomLabel.trim()).replace(/-/g, '_');
    const allFields = getAllBiodataFields(data.settings);
    if (allFields.some(f => f.key === key)) { toast.error('Key sudah digunakan'); return; }
    const newField: BiodataField = {
      key, label: newCustomLabel.trim(), placeholder: `{${key}}`, inputType: 'text', isCustom: true,
    };
    updateData(d => ({
      ...d, settings: { ...d.settings, customBiodata: [...(d.settings.customBiodata || []), newField] },
    }));
    setNewCustomLabel(''); setNewCustomKey('');
    toast.success('Biodata kustom ditambahkan');
  };
  const deleteCustomBiodata = (key: string) => {
    updateData(d => ({
      ...d, settings: { ...d.settings, customBiodata: (d.settings.customBiodata || []).filter(f => f.key !== key) },
    }));
    toast.success('Dihapus');
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    switch (deleteTarget.type) {
      case 'kepala': deleteKepala(deleteTarget.id); break;
      case 'tahun': deleteTahun(deleteTarget.id); break;
      case 'jenis': deleteJenisSurat(deleteTarget.id); break;
      case 'biodata': deleteCustomBiodata(deleteTarget.id); break;
    }
    setDeleteTarget(null);
  };

  const getDeleteDescription = () => {
    if (!deleteTarget) return '';
    const labels: Record<string, string> = {
      kepala: 'Kepala Madrasah',
      tahun: 'Tahun Ajaran',
      jenis: 'Jenis Surat (beserta semua surat terkait)',
      biodata: 'Biodata Kustom',
    };
    return `Apakah Anda yakin ingin menghapus ${labels[deleteTarget.type]} "${deleteTarget.label}"? Tindakan ini tidak dapat dibatalkan.`;
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const kepala = data.settings.kepalaMadrasah;

  return (
    <div className="space-y-6 w-full">
      <h1 className="text-xl font-bold text-foreground">Pengaturan</h1>
      <Tabs defaultValue={defaultTab} key={sidebarState}>
        <TabsList className="flex flex-wrap w-full h-auto gap-1 bg-muted p-1 rounded-lg">
          <TabsTrigger value="general" className="flex items-center gap-1.5 flex-1 min-w-0 px-2.5 py-1.5"><User className="h-4 w-4 shrink-0" /><span className="hidden lg:inline truncate">General</span></TabsTrigger>
          <TabsTrigger value="fitur" className="flex items-center gap-1.5 flex-1 min-w-0 px-2.5 py-1.5"><FileText className="h-4 w-4 shrink-0" /><span className="hidden lg:inline truncate">Fitur</span></TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-1.5 flex-1 min-w-0 px-2.5 py-1.5"><Database className="h-4 w-4 shrink-0" /><span className="hidden lg:inline truncate">Data</span></TabsTrigger>
        </TabsList>

        {/* General Tab - Akun, Kepala, Tahun Ajaran, Biodata, Tema */}
        <TabsContent value="general" className="space-y-6 p-6 pt-6">
          {/* Akun & Identitas + Kepala + Identitas Sekolah + Logout */}
          <Expandable title="Akun & Identitas">
            <div className="expandable-content space-y-6 p-6 pt-6">
              <input type="file" accept="image/*" ref={akunLogoRef} className="hidden" onChange={(e) => handleAkunLogoUpload(e, 'customLogo')} />
              <input type="file" accept="image/*" ref={akunKemenagLogoRef} className="hidden" onChange={(e) => handleAkunLogoUpload(e, 'customKemenagLogo')} />

              {/* Username & Password Section */}
              <Expandable title="Akun Login">
              <div className="border border-border rounded-lg p-4 space-y-3">
                
                <h3 className="font-medium text-sm"></h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Username</Label>
                    <Input
                      value={data.settings.username || ''}
                      onChange={e => updateData(d => ({ ...d, settings: { ...d.settings, username: e.target.value } }))}
                      placeholder="Username"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={data.settings.password ? atob(data.settings.password) : ''}
                      onChange={e => updateData(d => ({ ...d, settings: { ...d.settings, password: btoa(e.target.value) } }))}
                      placeholder="Password"
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Perubahan username dan password dapat dilakukan di sini.</p>
              </div>
              </Expandable>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Expandable title="Logo Sidebar">
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {data.settings.customLogo ? (
                      <img src={data.settings.customLogo} alt="Logo" className="w-14 h-14 object-contain border rounded" />
                    ) : (
                      <div className="w-14 h-14 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground">
                        <ImagePlus className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <Button variant="outline" size="sm" onClick={() => akunLogoRef.current?.click()}>
                        <Upload className="mr-1 h-4 w-4" />{data.settings.customLogo ? 'Ganti' : 'Upload'}
                      </Button>
                      {data.settings.customLogo && (
                        <Button variant="ghost" size="sm" onClick={() => updateData(d => ({ ...d, settings: { ...d.settings, customLogo: '' } }))}>
                          Hapus
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                </Expandable>

                <Expandable title="Logo Kementerian Agama">
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {data.settings.customKemenagLogo ? (
                      <img src={data.settings.customKemenagLogo} alt="Kemenag" className="w-14 h-14 object-contain border rounded" />
                    ) : (
                      <div className="w-14 h-14 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground">
                        <ImagePlus className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <Button variant="outline" size="sm" onClick={() => akunKemenagLogoRef.current?.click()}>
                        <Upload className="mr-1 h-4 w-4" />{data.settings.customKemenagLogo ? 'Ganti' : 'Upload'}
                      </Button>
                      {data.settings.customKemenagLogo && (
                        <Button variant="ghost" size="sm" onClick={() => updateData(d => ({ ...d, settings: { ...d.settings, customKemenagLogo: '' } }))}>
                          Hapus
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                </Expandable>
              </div>
              
              <div className="border-t border-border pt-4">
                <h3 className="font-medium text-sm mb-3">Identitas Sekolah</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>NSM</Label>
                    <Input
                      value={data.settings.nsm}
                      onChange={e => { if (/^\d*$/.test(e.target.value)) updateData(d => ({ ...d, settings: { ...d.settings, nsm: e.target.value } })); }}
                      placeholder="NSM" inputMode="numeric"
                    />
                  </div>
                  <div>
                    <Label>NPSN</Label>
                    <Input
                      value={data.settings.npsn}
                      onChange={e => { if (/^\d*$/.test(e.target.value)) updateData(d => ({ ...d, settings: { ...d.settings, npsn: e.target.value } })); }}
                      placeholder="NPSN" inputMode="numeric"
                    />
                  </div>
                </div>
              </div>

              {/* Logout */}
              <div className="border-t border-border pt-4">
                <Button variant="destructive" onClick={() => setShowLogoutConfirm(true)}>
                  <LogOut className="mr-2 h-4 w-4" /> Logout (Reset Data)
                </Button>
                <p className="text-xs text-muted-foreground mt-1">Menghapus semua data lokal dan mengembalikan ke pengaturan awal.</p>
              </div>
            </div>
          </Expandable>

          {/* Kepala Madrasah */}
          <Expandable title="Kepala Madrasah">
            <div className="expandable-content space-y-4 p-6 pt-6">
              {kepala.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">Belum ada Kepala Madrasah. Tambahkan satu untuk ditampilkan di surat.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label>Nama</Label><Input value={namaInput} onChange={e => setNamaInput(e.target.value)} placeholder="Nama lengkap" /></div>
                    <div><Label>NIP</Label><Input value={nipInput} onChange={e => setNipInput(e.target.value)} placeholder="NIP (opsional)" /></div>
                  </div>
                  <Button onClick={addKepala} size="sm"><Plus className="mr-1 h-4 w-4" />Tambah</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {kepala.map(k => (
                    <div key={k.id}>
                      {editingKepalaId === k.id ? (
                        <div className="border border-border rounded-lg p-4 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><Label>Nama</Label><Input value={editKepalaName} onChange={e => setEditKepalaName(e.target.value)} placeholder="Nama" /></div>
                            <div><Label>NIP</Label><Input value={editKepalaNip} onChange={e => setEditKepalaNip(e.target.value)} placeholder="NIP" /></div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveEditKepala}><Check className="mr-1 h-4 w-4" />Simpan</Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingKepalaId(null)}><X className="mr-1 h-4 w-4" />Batal</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4 border border-border rounded-lg bg-muted/30">
                          <Avatar className="h-14 w-14">
                            <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                              {k.nama.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-semibold text-foreground text-base">{k.nama}</div>
                            <div className="text-sm text-muted-foreground">NIP: {k.nip || '-'}</div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => startEditKepala(k)}>
                              <Pencil className="mr-1 h-4 w-4" />Edit
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'kepala', id: k.id, label: k.nama })}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Expandable>

          {/* Tahun Ajaran */}
          <Expandable title="Tahun Ajaran">
            <div className="expandable-content space-y-4 p-6 pt-6">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={tahunInput}
                    onChange={e => setTahunInput(e.target.value)}
                    placeholder="cth: 2025/2026"
                    className="max-w-xs"
                    onKeyDown={e => e.key === 'Enter' && addTahun()}
                  />
                  <Button onClick={addTahun} size="sm"><Plus className="mr-1 h-4 w-4" />Tambah</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Format wajib: <strong>YYYY/YYYY+1</strong> — contoh: 2025/2026, 2026/2027, 2027/2028
                </p>
                {/* Quick-add next 3 years */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {(() => {
                    const currentYear = new Date().getFullYear();
                    const suggestions = [];
                    for (let i = 0; i < 4; i++) {
                      const label = `${currentYear + i}/${currentYear + i + 1}`;
                      if (!data.settings.tahunAjaran.some(t => t.label === label)) {
                        suggestions.push(label);
                      }
                    }
                    return suggestions.slice(0, 4).map(s => (
                      <button
                        key={s}
                        type="button"
                        className="text-xs px-2 py-0.5 rounded border border-border bg-muted hover:bg-accent transition-colors"
                        onClick={() => setTahunInput(s)}
                      >
                        {s}
                      </button>
                    ));
                  })()}
                </div>
              </div>
              {data.settings.tahunAjaran.length > 0 && (
                <div className="space-y-2">
                  {data.settings.tahunAjaran.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <span className="text-sm font-medium">{t.label}</span>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'tahun', id: t.id, label: t.label })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Expandable>

          {/* Biodata Kustom */}
          <Expandable title="Biodata Kustom">
            <div className="expandable-content space-y-4 p-6 pt-6">
              <p className="text-sm text-muted-foreground mb-4">
                Tambahkan field biodata baru yang tidak tersedia secara default (misalnya: NIK, No. KK, dll). Field yang ditambahkan akan muncul di checklist biodata saat membuat template surat.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Label</Label>
                  <Input value={newCustomLabel} onChange={e => setNewCustomLabel(e.target.value)} placeholder="cth: NIK" />
                </div>
                <div>
                  <Label>Key (opsional, auto-generate)</Label>
                  <Input value={newCustomKey} onChange={e => setNewCustomKey(e.target.value)} placeholder="cth: nik" />
                  <p className="text-xs text-muted-foreground mt-1">Placeholder akan jadi: {`{${newCustomKey.trim() || slugify(newCustomLabel.trim() || 'key').replace(/-/g, '_')}}`}</p>
                </div>
              </div>
              <Button onClick={addCustomBiodata} size="sm"><Plus className="mr-1 h-4 w-4" />Tambah Biodata</Button>

              <div className="border-t border-border pt-4 mt-4">
                <h3 className="font-medium text-sm mb-2">Biodata Default</h3>
                <div className="space-y-1">
                  {DEFAULT_BIODATA.map(f => (
                    <div key={f.key} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                      <span>{f.label}</span>
                      <code className="text-xs text-muted-foreground">{f.placeholder}</code>
                    </div>
                  ))}
                </div>
              </div>

              {(data.settings.customBiodata || []).length > 0 && (
                <div className="border-t border-border pt-4 mt-4">
                  <h3 className="font-medium text-sm mb-2">Biodata Kustom</h3>
                  <div className="space-y-1">
                    {(data.settings.customBiodata || []).map(f => (
                      <div key={f.key} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                        <span>{f.label}</span>
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-muted-foreground">{f.placeholder}</code>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteTarget({ type: 'biodata', id: f.key, label: f.label })}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Expandable>

          {/* Tema */}
          <Expandable title="Tema Tampilan">
            <div className="expandable-content space-y-6 p-6 pt-6">
              <div>
                <Label className="mb-2 block">Warna Tema</Label>
                
                {/* Grouped themes by color family */}
                {[
                  { name: 'Cool',    items: ['default', 'slate', 'zinc', 'indigo', 'cyan', 'charcoal'] },
                  { name: 'Warm',    items: ['amber', 'sunset', 'rose', 'coral', 'peach'] },
                  { name: 'Nature',  items: ['emerald', 'teal', 'lime', 'mint', 'olive'] },
                  { name: 'Royal',   items: ['royal', 'fuchsia', 'ocean', 'lavender', 'magenta'] },
                  { name: 'Metal',   items: ['gold', 'silver', 'bronze'] },
                ].map(group => (
                  <div key={group.name} className="mb-4">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{group.name}</div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {group.items.map(themeValue => {
                        const ct = COLOR_THEMES.find(t => t.value === themeValue);
                        if (!ct) return null;
                        return (
                          <button
                            key={ct.value}
                            onClick={() => setColorTheme(ct.value)}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${data.settings.colorTheme === ct.value ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'}`}
                          >
                            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: ct.color }} />
                            <span className="text-xs font-medium">{ct.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Custom color */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Custom</div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setColorTheme('custom' as ColorTheme)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${data.settings.colorTheme === 'custom' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'}`}
                    >
                      <div
                        className="w-6 h-6 rounded-full border border-border"
                        style={{ background: data.settings.customThemeColor || 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
                      />
                      <span className="text-xs font-medium">Custom</span>
                    </button>
                    {data.settings.colorTheme === 'custom' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={data.settings.customThemeColor || '#4f46e5'}
                          onChange={e => updateData(d => ({ ...d, settings: { ...d.settings, customThemeColor: e.target.value } }))}
                          className="w-10 h-10 cursor-pointer rounded border border-border"
                          title="Pilih warna kustom"
                        />
                        <span className="text-xs text-muted-foreground">Pilih warna kustom</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  {isDark ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-amber-500" />}
                  <div>
                    <div className="font-medium text-sm">{isDark ? 'Mode Gelap' : 'Mode Terang'}</div>
                    <div className="text-xs text-muted-foreground">{isDark ? 'Tampilan gelap untuk kenyamanan mata' : 'Tampilan terang standar'}</div>
                  </div>
                </div>
                <Switch checked={isDark} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
              </div>
            </div>
          </Expandable>
        </TabsContent>

        {/* Tahun Ajaran */}
        <TabsContent value="tahun">
          <Expandable title="Tahun Ajaran">
            <div className="expandable-content space-y-4 p-6 pt-6">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={tahunInput}
                    onChange={e => setTahunInput(e.target.value)}
                    placeholder="cth: 2025/2026"
                    className="max-w-xs"
                    onKeyDown={e => e.key === 'Enter' && addTahun()}
                  />
                  <Button onClick={addTahun} size="sm"><Plus className="mr-1 h-4 w-4" />Tambah</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Format wajib: <strong>YYYY/YYYY+1</strong> — contoh: 2025/2026, 2026/2027, 2027/2028
                </p>
                {/* Quick-add next 3 years */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {(() => {
                    const currentYear = new Date().getFullYear();
                    const suggestions = [];
                    for (let i = 0; i < 4; i++) {
                      const label = `${currentYear + i}/${currentYear + i + 1}`;
                      if (!data.settings.tahunAjaran.some(t => t.label === label)) {
                        suggestions.push(label);
                      }
                    }
                    return suggestions.slice(0, 4).map(s => (
                      <button
                        key={s}
                        type="button"
                        className="text-xs px-2 py-0.5 rounded border border-border bg-muted hover:bg-accent transition-colors"
                        onClick={() => setTahunInput(s)}
                      >
                        {s}
                      </button>
                    ));
                  })()}
                </div>
              </div>
              {data.settings.tahunAjaran.length > 0 && (
                <div className="space-y-2">
                  {data.settings.tahunAjaran.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <span className="text-sm font-medium">{t.label}</span>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'tahun', id: t.id, label: t.label })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Expandable>
        </TabsContent>

        {/* Fitur Tab - Jenis Surat Table + Repository */}
        <TabsContent value="fitur" className="space-y-6 p-6 pt-6">
          {/* Jenis Surat Table */}
          <Expandable title="Jenis Surat">
            <div className="expandable-content p-6 pt-6">
              <div className="flex justify-end mb-4">
                <Button onClick={() => { setWizardEditingJenis(undefined); setWizardOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Jenis Surat
                </Button>
              </div>
              {data.settings.jenisSurat.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Belum ada jenis surat. Tambahkan jenis surat baru untuk memulai.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead>Judul Dokumen</TableHead>
                        <TableHead>Format Nomor</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.settings.jenisSurat.map((js) => (
                        <TableRow key={js.id}>
                          <TableCell className="font-medium">{js.label}</TableCell>
                          <TableCell>{js.templateJudul || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{js.nomorSuratFormat}</TableCell>
                          <TableCell className="text-right flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setWizardEditingJenis(js);
                                setWizardOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            {isElectron && js.templateDocxBase64 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReloadFromDisk(js)}
                                disabled={reloadingSlug === js.slug}
                              >
                                {reloadingSlug === js.slug ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                                Reload
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget({ type: 'jenis', id: js.id, label: js.label })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </Expandable>

          {/* Repository Section */}
          <Expandable title="Repository">
            <div className="expandable-content space-y-4 p-6 pt-6">
              <div>
                <Label>Load Repo from Text (JSON)</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">Paste JSON array of repositories:</p>
                <p className="text-xs text-muted-foreground mb-2">`["id":"custom1","name":"Custom Repo","url":"https://example.com","installed":false]`</p>
                <textarea
                  value={repoJsonText}
                  onChange={(e) => setRepoJsonText(e.target.value)}
                  placeholder='[{"id":"custom","name":"My Repo","description":"Desc","url":"","installed":false}]'
                  className="w-full h-24 p-3 border border-border rounded-md font-mono text-sm resize-vertical"
                />
                <Button 
                  onClick={() => {
                    try {
                      const repos = JSON.parse(repoJsonText);
                      if (Array.isArray(repos)) {
                        updateData(d => ({
                          ...d,
                          settings: {
                            ...d.settings,
                            repositories: [...(d.settings.repositories || []), ...repos],
                          },
                        }));
                        setRepoJsonText('');
                        toast.success(`${repos.length} repository ditambahkan`);
                      } else {
                        toast.error('Invalid JSON array');
                      }
                    } catch {
                      toast.error('Invalid JSON');
                    }
                  }}
                  className="mt-2"
                >
                  Import Repos
                </Button>
              </div>
              {(data.settings.repositories || []).length > 0 && (
                <div>
                  <h3 className="font-medium text-sm mb-2">Installed Repositories</h3>
                  <div className="space-y-2">
                    {(data.settings.repositories || []).map((repo: any) => (
                      <div key={repo.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <div>
                          <div className="font-medium text-sm">{repo.name}</div>
                          <div className="text-xs text-muted-foreground">{repo.description || repo.url}</div>
                        </div>
                        <div className="flex gap-1">
                          {repo.url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={repo.url} target="_blank" rel="noopener noreferrer">
                                View
                              </a>
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => updateData(d => ({
                            ...d,
                            settings: {
                              ...d.settings,
                              repositories: d.settings.repositories?.filter((r: any) => r.id !== repo.id) || [],
                            },
                          }))}>
                            Manage
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Expandable>

          {/* Jenis Surat Wizard */}
          <JenisSuratWizard
            open={wizardOpen}
            onOpenChange={setWizardOpen}
            initialData={wizardEditingJenis}
            onSave={handleWizardSaveJenisSurat}
            existingKepalaMadrasah={data.settings.kepalaMadrasah}
            defaultNomorSuratFormat={data.settings.nomorSuratFormat}
            allJenisSurat={data.settings.jenisSurat}
            customBiodata={data.settings.customBiodata}
          />
        </TabsContent>
        {/* Data Tab */}
        <TabsContent value="data" className="space-y-6 p-6 pt-6">
          <Expandable title="Penyimpanan Data">
            <div className="expandable-content space-y-6 p-6 pt-6">
              <DataPathSection />

              {/* Folder Structure Info */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Struktur Folder Default
                </h3>
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs">
                <pre>C:\User\Downloads\Minsa\
  ├── Surat/                 # Raw DOCX templates (*.docx)
  ├── Config/                # JSON configs (app-config.json, history.json)
  ├── Repository/ (optional) # NISN/, EMIS/, PDUM/ folders
  └── Backup/                # Exported ZIP files</pre>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-medium text-sm mb-3">Backup & Restore</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={async () => {
                    try {
                      const zip = new JSZip();
                      const currentData = loadData();
                      zip.file('minsa-data.json', JSON.stringify(currentData, null, 2));
                      (currentData.settings.jenisSurat || []).forEach((js: any) => {
                        if (js.templateDocxBase64) {
                          zip.file(`Surat/${js.slug}.docx`, js.templateDocxBase64, { base64: true });
                        }
                      });
                      const blob = await zip.generateAsync({ type: 'blob' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Minsa-backup-${new Date().toISOString().slice(0,10)}.zip`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('Backup ZIP ready');
                    } catch (e) {
                      toast.error('Export failed');
                    }
                  }}>
                    <Download className="mr-1 h-4 w-4" />
                    Export ZIP
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.zip';
                    input.onchange = async (ev) => {
                      const file = (ev.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      try {
                        const zip = new JSZip();
                        await zip.loadAsync(file);
                        const jsonFile = zip.file('minsa-data.json');
                        if (jsonFile) {
                          const text = await jsonFile.async('string');
                          const parsed = JSON.parse(text);
                          saveData(parsed);
                          toast.success('Data imported');
                          window.location.reload();
                        } else {
                          toast.error('Invalid backup ZIP');
                        }
                      } catch {
                        toast.error('Import failed');
                      }
                    };
                    input.click();
                  }}>
                    <Upload className="mr-1 h-4 w-4" />
                    Import ZIP
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Includes Surat DOCX + Config JSON.</p>
              </div>
            </div>
          </Expandable>
        </TabsContent>
      </Tabs>

      {/* Shared delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        description={getDeleteDescription()}
        onConfirm={handleConfirmDelete}
      />

      {/* Add confirmation dialog */}
      <ConfirmDialog
        open={!!addConfirm}
        onOpenChange={(open) => !open && setAddConfirm(null)}
        title="Konfirmasi Tambah"
        description={addConfirm 
          ? addConfirm.type === 'Kepala Madrasah' && namaInput
            ? `Apakah Anda yakin ingin menambahkan ${namaInput} sebagai Kepala Madrasah?`
            : `Apakah Anda yakin ingin menambahkan ${addConfirm.type} baru?`
          : ''}
        confirmLabel="Tambah"
        onConfirm={() => { addConfirm?.action(); setAddConfirm(null); }}
      />

      {/* Edit confirmation dialog */}
      <ConfirmDialog
        open={!!editConfirm}
        onOpenChange={(open) => !open && setEditConfirm(null)}
        title="Konfirmasi Edit"
        description={editConfirm ? `Apakah Anda yakin ingin menyimpan perubahan pada ${editConfirm.type}?` : ''}
        confirmLabel="Simpan"
        onConfirm={() => { editConfirm?.action(); setEditConfirm(null); }}
      />

      {/* Logout confirmation */}
      <ConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title="Konfirmasi Logout"
        description="Apakah Anda yakin ingin logout? Semua data lokal akan dihapus dan tidak dapat dikembalikan."
        confirmLabel="Logout"
        onConfirm={handleLogout}
      />
    </div>
  );
};

export default Pengaturan;