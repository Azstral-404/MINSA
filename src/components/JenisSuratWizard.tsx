import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  JenisSurat,
  JenisSuratHeader,
  generateId,
  slugify,
  buildLine2,
  buildSchoolSub,
  expandSchoolName,
} from '@/lib/store';

import { FONT_SIZE_OPTIONS } from '@/lib/headerUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  ChevronRight,
  ChevronLeft,
  Upload,
  Plus,
  Trash2,
  X,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Strikethrough,
  Subscript,
  Superscript,
  Link,
  Undo2,
  Redo2,
  Type,
  Indent,
  Outdent,
} from 'lucide-react';
import { toast } from 'sonner';

export interface JenisSuratWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: JenisSurat;
  initialStep?: number;
  onSave: (data: JenisSurat) => void;
  existingKepalaMadrasah: Array<{ id: string; nama: string; nip: string }>;
  defaultNomorSuratFormat: string;
  allJenisSurat?: JenisSurat[];
  customBiodata?: Array<{ key: string; label: string; placeholder: string }>;
}

const STEPS = ['Label', 'Header', 'Nomor Surat', 'Konten', 'Kepala Madrasah', 'Preview A4'];

// ─── MS-Word-like Tab stops (every 1.25cm, mirroring Word default) ────────────
const TAB_WIDTH_CM = 1.25;

export function JenisSuratWizard({
  open,
  onOpenChange,
  initialData,
  initialStep = 0,
  onSave,
  existingKepalaMadrasah,
  defaultNomorSuratFormat,
  allJenisSurat = [],
  customBiodata = [],
}: JenisSuratWizardProps) {
  const isEditing = !!initialData;
  const [step, setStep] = useState(initialStep || 0);
  const [labelError, setLabelError] = useState('');

  // ── Form state ────────────────────────────────────────────────────────────
  const [label, setLabel] = useState('');
  const [templateJudul, setTemplateJudul] = useState('');
  const [templateIsi, setTemplateIsi] = useState('');
  const [nomorSuratFormat, setNomorSuratFormat] = useState(defaultNomorSuratFormat);
  const [selectedKepalaMadrasahNama, setSelectedKepalaMadrasahNama] = useState(false);
  const [selectedKepalaMadrasahNip, setSelectedKepalaMadrasahNip] = useState(false);
  const [headerMode, setHeaderMode] = useState<'text' | 'image'>('text');
  const [customLine1, setCustomLine1] = useState('');
  const [customLine2, setCustomLine2] = useState('');
  const [customSchool, setCustomSchool] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [customContact, setCustomContact] = useState('');
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [customLogoSize, setCustomLogoSize] = useState(22);
  const [customLine1Size, setCustomLine1Size] = useState(16);
  const [customLine2Size, setCustomLine2Size] = useState(14);
  const [customSchoolSize, setCustomSchoolSize] = useState(12);
  const [customAddressSize, setCustomAddressSize] = useState(11);
  const [customContactSize, setCustomContactSize] = useState(11);
  const [customHeaderImageUrl, setCustomHeaderImageUrl] = useState('');
  const [signatureKepalaMadrasahId, setSignatureKepalaMadrasahId] = useState('');
  const [signatureImageUrl, setSignatureImageUrl] = useState('');

  // ── Load initialData when modal opens or data changes ──────────────────────
  useEffect(() => {
    if (!open) {
      // Reset on close
      setLabel('');
      setTemplateJudul('');
      setTemplateIsi('');
      setNomorSuratFormat(defaultNomorSuratFormat);
      setSelectedKepalaMadrasahNama(false);
      setSelectedKepalaMadrasahNip(false);
      setHeaderMode('text');
      setCustomLine1('');
      setCustomLine2('');
      setCustomSchool('');
      setCustomAddress('');
      setCustomContact('');
      setCustomLogoUrl('');
      setCustomLogoSize(22);
      setCustomLine1Size(16);
      setCustomLine2Size(14);
      setCustomSchoolSize(12);
      setCustomAddressSize(11);
      setCustomContactSize(11);
      setCustomHeaderImageUrl('');
      setSignatureKepalaMadrasahId('');
      setSignatureImageUrl('');
      setStep(initialStep || 0);
      return;
    }

    if (initialData) {
      // Edit mode: load all data
      setLabel(initialData.label || '');
      setTemplateJudul(initialData.templateJudul || '');
      setTemplateIsi(initialData.templateIsi || '');
      setNomorSuratFormat(initialData.nomorSuratFormat || defaultNomorSuratFormat);
      
      // Extra fields
      setSelectedKepalaMadrasahNama(initialData.extraFields?.showKepalaNama === 'true');
      setSelectedKepalaMadrasahNip(initialData.extraFields?.showKepalaNip === 'true');
      
      // Signature
      setSignatureKepalaMadrasahId(initialData.signatureKepalaMadrasahId || '');
      setSignatureImageUrl(initialData.signatureImageUrl || '');
      
      // Header
      const header = initialData.jenisSuratHeader as JenisSuratHeader || {} as JenisSuratHeader;
      const mode = (header.customHeaderMode || 'text') === 'image' ? 'image' : 'text';
      setHeaderMode(mode);
      
      if (mode === 'text') {
        setCustomLine1(header.customLine1 || '');
        setCustomLine2(header.customLine2 || '');
        setCustomSchool(header.customSchool || '');
        setCustomAddress(header.customAddress || '');
        setCustomContact(header.customContact || '');
        setCustomLogoUrl(header.customLogoUrl || '');
        setCustomLogoSize(header.customLogoSize || 22);
        setCustomLine1Size(header.customLine1Size || 16);
        setCustomLine2Size(header.customLine2Size || 14);
        setCustomSchoolSize(header.customSchoolSize || 12);
        setCustomAddressSize(header.customAddressSize || 11);
        setCustomContactSize(header.customContactSize || 11);
      } else {
        setCustomHeaderImageUrl(header.customHeaderImageUrl || '');
      }
      
      setStep(initialStep || 3);
    } else {
      // Add mode: fresh defaults
      setLabel('');
      setTemplateJudul('');
      setTemplateIsi('');
      setNomorSuratFormat(defaultNomorSuratFormat);
      setSelectedKepalaMadrasahNama(false);
      setSelectedKepalaMadrasahNip(false);
      setHeaderMode('text');
      // ... other defaults already set
      setStep(initialStep || 0);
    }
  }, [open, initialData, initialStep, defaultNomorSuratFormat]);

// ── Header helpers (after useEffect load) ──────────────────────────────────
  const getLastHeaderSettings = useCallback(() => {
    // Only for NEW (no localStorage when editing - useEffect handles it)
    if (initialData) return null;
    try {
      const saved = localStorage.getItem('lastJenisSuratHeader');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return null;
  }, []);

  const lastHeaderSettings = useMemo(() => getLastHeaderSettings(), [getLastHeaderSettings]);

  const signatureInputRef = useRef<HTMLInputElement>(null);

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSignatureImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ── Real-time header synchronization (Step 2) ─────────────────────────────
  // When header fields change, update them in real-time for preview
  useEffect(() => {
    // Save header settings to localStorage for real-time preview sync
    const headerSettings = {
      customLine1,
      customLine2,
      customSchool,
      customAddress,
      customContact,
      customLogoUrl,
      customLogoSize,
      customLine1Size,
      customLine2Size,
      customSchoolSize,
      customAddressSize,
      customContactSize,
      customHeaderImageUrl,
      customHeaderMode: headerMode,
    };
    try {
      localStorage.setItem('lastJenisSuratHeader', JSON.stringify(headerSettings));
    } catch (e) {
      console.warn('Could not save header settings to localStorage', e);
    }
  }, [
    customLine1, customLine2, customSchool, customAddress, customContact,
    customLogoUrl, customLogoSize, customLine1Size, customLine2Size,
    customSchoolSize, customAddressSize, customContactSize,
    customHeaderImageUrl, headerMode,
  ]);
  const headerImageRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCustomLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleHeaderImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCustomHeaderImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ── Editor ref ────────────────────────────────────────────────────────────
  const editorRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);

  type Placeholder = {
    token: string;
    label: string;
  };

  const PLACEHOLDERS: Placeholder[] = [
    { token: "{nama}", label: "Nama" },
    { token: "{kelas}", label: "Kelas" },
    { token: "{no_induk}", label: "No. Induk" },
    { token: "{nisn}", label: "NISN" },
    { token: "{tempat_lahir}, {tanggal_lahir}", label: "Tempat, Tanggal Lahir" },
    { token: "{jenis_kelamin}", label: "Jenis Kelamin" },
    { token: "{alamat}", label: "Alamat" },
    { token: "{tahun_ajaran}", label: "Tahun Ajaran" },
    { token: "{nama_orang_tua}", label: "Nama Orang Tua" },
    // Kabupaten field removed from header configuration
  ];

  const TAB_WIDTH_CM = 1.25;

  // ── Sync editor content when reaching Step 4 ─────────────────────────────
  useEffect(() => {
    if (step === 3 && editorRef.current) {
      const savedRange = selectionRange;
      if (templateIsi && templateIsi.trim().length > 0) {
        editorRef.current.innerHTML = templateIsi;
      } else {
        editorRef.current.innerHTML = '<br>';
      }
      editorRef.current.focus();
      // Restore selection if possible
      if (savedRange) {
        restoreSelection();
      } else {
        // Place cursor at end
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, [step]);

  // Removed redundant templateIsi sync (handled by debounced onInput)

  // ── Real-time duplicate label detection ───────────────────────────────────
  useEffect(() => {
    if (!label.trim()) {
      setLabelError('');
      return;
    }
    const isDuplicate = allJenisSurat.some(
      j => j.id !== initialData?.id && j.label.toLowerCase() === label.trim().toLowerCase()
    );
    setLabelError(
      isDuplicate ? `⚠️ Label "${label.trim()}" sudah ada. Gunakan nama yang berbeda.` : ''
    );
  }, [label, allJenisSurat, initialData?.id]);

  // ── Auto-populate Judul Dokumen from Label ────────────────────────────────
  // Track if user has made a custom edit (different from auto-generated)
  const [autoGeneratedJudul, setAutoGeneratedJudul] = useState<string | null>(null);

  useEffect(() => {
    if (!label.trim()) {
      setTemplateJudul('');
      setAutoGeneratedJudul(null);
      return;
    }

    const autoJudul = label.trim().toUpperCase();
    setAutoGeneratedJudul(autoJudul);

    // Auto-update only if:
    // 1. Judul is empty, OR
    // 2. Judul matches the previously auto-generated value (user hasn't customized yet)
    if (!templateJudul || templateJudul === autoGeneratedJudul) {
      setTemplateJudul(autoJudul);
    }
    // Otherwise, respect user's custom edit
  }, [label]);

  // ── Rich text format helpers ──────────────────────────────────────────────
  function restoreSelection() {
    const sel = window.getSelection();
    if (sel && selectionRange && editorRef.current?.contains(selectionRange.startContainer)) {
      sel.removeAllRanges();
      sel.addRange(selectionRange);
    }
  }

  function saveEditorSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      setSelectionRange(sel.getRangeAt(0).cloneRange());
    }
  }

  function insertLabeledPlaceholder(ph: Placeholder) {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel?.rangeCount || !editorRef.current) return;

    const range = sel.getRangeAt(0);
    
    // Simplified inline structure - no flex/narrow
    const labelSpan = document.createElement('span');
    labelSpan.className = 'ph-label';
    labelSpan.textContent = ph.label + '\u00A0'.repeat(2);

    const colonSpan = document.createElement('span');
    colonSpan.className = 'ph-colon';
    colonSpan.textContent = ':';

    const tokenSpan = document.createElement('span');
    tokenSpan.textContent = ph.token;
    tokenSpan.contentEditable = 'false';
    tokenSpan.className = 'placeholder-token';
    tokenSpan.dataset.phToken = ph.token;
    tokenSpan.dataset.phLabel = ph.label;

    range.deleteContents();
    range.insertNode(labelSpan);
    range.collapse(false);
    range.insertNode(colonSpan);
    range.collapse(false);
    range.insertNode(tokenSpan);
    
    // Position cursor AFTER token for typing
    range.setStartAfter(tokenSpan);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    editorRef.current.normalize(); // Clean up empty text nodes
    saveEditorSelection();
    // Debounced sync below
  }

  const ptToCmdSize = { 8: 1, 9: 2, 10: 3, 11: 4, 12: 5, 14: 6, 16: 7 };

  function applyFormat(command: string, value?: string) {
    restoreSelection();
    document.execCommand(command, false, value);
    debouncedSetTemplateIsi(editorRef.current?.innerHTML ?? '');
  }



  const applyFontSize = (pt: string) => {
    editorRef.current?.focus();
    // execCommand fontSize uses 1-7 scale; we map pt to the closest
    const ptNum = parseInt(pt);
    const size =
      ptNum <= 8
        ? 1
        : ptNum <= 10
        ? 2
        : ptNum <= 12
        ? 3
        : ptNum <= 14
        ? 4
        : ptNum <= 18
        ? 5
        : ptNum <= 24
        ? 6
        : 7;
    document.execCommand('fontSize', false, String(size));
    // Override the size attribute with inline style for accuracy
    if (editorRef.current) {
      const fonts = editorRef.current.querySelectorAll('font[size]');
      fonts.forEach(f => {
        const el = f as HTMLElement;
        el.style.fontSize = `${pt}pt`;
        el.removeAttribute('size');
      });
      setTemplateIsi(editorRef.current.innerHTML);
    }
  };

// Removed old insertPlaceholder - using insertLabeledPlaceholder now

  // Debounce state sync
  const timeoutRef = useRef<NodeJS.Timeout>();
  const debouncedSetTemplateIsi = useCallback((html: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setTemplateIsi(html), 300);
  }, []);

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      restoreSelection();
      if (e.shiftKey) {
        // Outdent: remove nearest .tab-indent span before the caret
        const sel = window.getSelection();
        if (!sel?.anchorNode) return;
        let node: Node | null = sel.anchorNode;
        while (node && !(node instanceof HTMLElement && node.classList.contains('tab-indent'))) {
          node = node.previousSibling;
        }
        if (node && node.parentElement) {
          node.parentElement.removeChild(node);
        }
      } else {
        // Indent: insert the tab span
        const span = document.createElement('span');
        span.className = 'tab-indent';
        span.innerHTML = '&nbsp;'.repeat(4);
        const sel = window.getSelection();
        if (!sel?.rangeCount) return;
        const range = sel.getRangeAt(0);
        range.insertNode(span);
        range.setStartAfter(span);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      debouncedSetTemplateIsi(editorRef.current?.innerHTML ?? '');
      return;
    }

    if (e.ctrlKey && !e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); applyFormat('bold'); break;
        case 'i': e.preventDefault(); applyFormat('italic'); break;
        case 'u': e.preventDefault(); applyFormat('underline'); break;
        case 'z': e.preventDefault(); applyFormat('undo'); break;
        case 'y': e.preventDefault(); applyFormat('redo'); break;
        case 'j': e.preventDefault(); applyFormat('justifyFull'); break;
      }
      return;
    }
  };

  // ── Navigation guard ──────────────────────────────────────────────────────
  const canProceedStep = (): boolean => {
    switch (step) {
      case 0:
        return label.trim().length > 0 && !labelError;
      case 1:
        return true;
      case 2:
        return nomorSuratFormat.trim().length > 0;
      case 3:
        return templateIsi.trim().length > 0;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!canProceedStep()) {
      toast.error('Lengkapi semua field yang diperlukan');
      return;
    }
    try {
      const jenisSuratHeader: JenisSuratHeader = {
        useGlobalHeader: false,
        customHeaderMode: headerMode,
        ...(headerMode === 'text' && {
          customLine1,
          customLine2,
          customSchool,
          customAddress,
          customContact,
          customLogoUrl: customLogoUrl || undefined,
          customLogoSize,
          customLine1Size,
          customLine2Size,
          customSchoolSize,
          customAddressSize,
          customContactSize,
        }),
        ...(headerMode === 'image' && {
          customHeaderImageUrl: customHeaderImageUrl || undefined,
        }),
      };

      if (!initialData) {
        try {
          localStorage.setItem('lastJenisSuratHeader', JSON.stringify(jenisSuratHeader));
        } catch (_) {}
      }

const jenisSurat: JenisSurat = {
  id: initialData?.id || generateId(),
  slug: initialData?.slug || slugify(label),
  label,
  templateJudul,
  templateIsi,
  nomorSuratFormat,
  templateDocxBase64: undefined,
  createdAt: initialData?.createdAt || new Date().toISOString(),
  selectedBiodata: [],
  jenisSuratHeader,
  signatureKepalaMadrasahId: signatureKepalaMadrasahId || undefined,
  signatureImageUrl: signatureImageUrl || undefined,
  extraFields: {
    ...(initialData?.extraFields || {}),
    showKepalaNama: selectedKepalaMadrasahNama ? 'true' : 'false',
    showKepalaNip: selectedKepalaMadrasahNip ? 'true' : 'false',
  },
};

// ✅ Call functions after object creation
onSave(jenisSurat);
handleClose();
    } catch (err) {
      toast.error('Gagal menyimpan jenis surat');
      console.error(err);
    }
  };

  // ── Close / reset ─────────────────────────────────────────────────────────
const handleClose = () => {
    // Clear localStorage to prevent persistence
    try {
      localStorage.removeItem('lastJenisSuratHeader');
    } catch (_) {}
    
    setStep(0);
    setLabel('');
    setLabelError('');
    setTemplateJudul('');
    setTemplateIsi('');
    setNomorSuratFormat(defaultNomorSuratFormat);
    setSelectedKepalaMadrasahNama(false);
    setSelectedKepalaMadrasahNip(false);
    setHeaderMode('text');
    setCustomLine1('');
    setCustomLine2('');
    setCustomSchool('');
    setCustomAddress('');
    setCustomContact('');
    setCustomLogoUrl('');
    setCustomHeaderImageUrl('');
    setCustomLogoSize(22);
    setCustomLine1Size(16);
    setCustomLine2Size(14);
    setCustomSchoolSize(12);
    setCustomAddressSize(11);
    setCustomContactSize(11);
    setSignatureKepalaMadrasahId('');
    setSignatureImageUrl('');
    onOpenChange(false);
  };

  // ── Inline A4 preview (used in step 5 and step 6) ────────────────────────
  const InlineA4Preview = () => (
    <div
      className="bg-white text-black shadow-lg mx-auto"
      style={{
        width: '210mm',
        padding: '4.2mm 25.4mm 25.4mm 25.4mm',
        fontFamily: "'Times New Roman', serif",
        fontSize: '12pt',
        lineHeight: '1.0',
        boxSizing: 'border-box',
        color: '#000000',
      }}
    >
      {/* Header / KOP */}
      <div style={{ borderBottom: '3px solid black', paddingBottom: '10px', marginBottom: '24px', minHeight: '40px' }}>
        {headerMode === 'image' ? (
          customHeaderImageUrl ? (
            <img src={customHeaderImageUrl} alt="Header KOP" style={{ width: '100%', display: 'block', minHeight: '40px' }} />
          ) : (
            <div style={{ textAlign: 'center', fontSize: '11pt', color: '#999', fontStyle: 'italic' }}>
              [Gambar KOP - belum diunggah]
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
            {customLogoUrl && (
              <img
                src={customLogoUrl}
                alt="Logo"
                style={{ width: `${customLogoSize}mm`, height: `${customLogoSize}mm`, minWidth: `${customLogoSize}mm`, objectFit: 'contain', flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, textAlign: 'center' }}>
              {customLine1 ? (
                <div style={{ fontSize: `${customLine1Size}pt`, fontWeight: 'bold', lineHeight: '1.2' }}>{customLine1}</div>
              ) : (
                <div style={{ fontSize: '14pt', fontWeight: 'bold', lineHeight: '1.2', color: '#ccc' }}>[Line 1]</div>
              )}
              {customLine2 ? (
                <div style={{ fontSize: `${customLine2Size}pt`, fontWeight: 'bold', lineHeight: '1.2' }}>{customLine2}</div>
              ) : (
                <div style={{ fontSize: '12pt', fontWeight: 'bold', lineHeight: '1.2', color: '#ccc' }}>[Line 2]</div>
              )}
              {customSchool ? (
                <div style={{ fontSize: `${customSchoolSize}pt`, fontWeight: 'bold', lineHeight: '1.2' }}>{customSchool}</div>
              ) : (
                <div style={{ fontSize: '11pt', fontWeight: 'bold', lineHeight: '1.2', color: '#ccc' }}>[Nama Sekolah]</div>
              )}
              {(customAddress || customContact) ? (
                <div style={{ fontSize: `${customAddressSize}pt`, lineHeight: '1.2' }}>
                  {customAddress}{customContact ? ` ${customContact}` : ''}
                </div>
              ) : (
                <div style={{ fontSize: '10pt', lineHeight: '1.2', color: '#ccc' }}>[Alamat / Kontak]</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Judul */}
      <div style={{ textAlign: 'center', marginBottom: '6px', marginTop: '12px' }}>
        <div style={{ fontWeight: 'bold', textDecoration: 'underline', fontSize: '14pt', textUnderlineOffset: '4px', minHeight: '18pt' }}>
          {templateJudul || '[Judul Surat]'}
        </div>
      </div>

      {/* Nomor */}
      <div style={{ textAlign: 'center', marginTop: '0', marginBottom: '36px', fontSize: '12pt', fontWeight: 'bold', lineHeight: '1.0', minHeight: '18pt' }}>
        NOMOR : {nomorSuratFormat.replace(/\{nomor\}/gi, '001').replace(/\{bulan\}/gi, '03').replace(/\{tahun\}/gi, '2026')}
      </div>

      {/* Isi */}
      <style>{`
        .wizard-a4-isi-content { font-family:'Times New Roman',Times,serif; font-size:12pt; line-height:1.5; color:#000; text-align:justify; word-break:break-word; }
        .wizard-a4-isi-content p { margin-top:0; margin-bottom:0; line-height:1.5; min-height:1.5em; }
        .wizard-a4-isi-content div { margin-top:0; margin-bottom:0; line-height:1.5; }
        .wizard-a4-isi-content .tab-indent { 
          display: inline-block !important; 
          width: ${TAB_WIDTH_CM}cm !important; 
          min-width: ${TAB_WIDTH_CM}cm !important; 
        }
        .wizard-a4-isi-content .placeholder-token {
          background: #fffbcc !important;
          border: 1px dashed #d9a600 !important;
          padding: 0 2px !important;
          border-radius: 2px !important;
        }
        .wizard-a4-isi-content [data-ph-label] {
          display: inline-flex !important;
          align-items: baseline !important;
          white-space: nowrap !important;
          width: auto !important;
          table-layout: none !important;
        }
        .wizard-a4-isi-content * { color:#000 !important; font-family:'Times New Roman',Times,serif; font-size:12pt; line-height:1.5; }
        .wizard-a4-isi-content b, .wizard-a4-isi-content strong { font-weight:bold !important; }
        .wizard-a4-isi-content i, .wizard-a4-isi-content em { font-style:italic !important; }
        .wizard-a4-isi-content u { text-decoration:underline !important; }
        .wizard-a4-isi-content s { text-decoration:line-through !important; }
      `}</style>
      <div className="wizard-a4-isi-content" style={{ textAlign: 'justify' }}>
        {templateIsi ? (
          <div dangerouslySetInnerHTML={{ __html: templateIsi }} />
        ) : (
          <div style={{ color: '#999', fontStyle: 'italic' }}>
            [Belum ada konten - silakan isi di Step 4]
          </div>
        )}
      </div>

      {/* TTD */}
      <div style={{ marginTop: '40px', paddingLeft: '100mm' }}>
        <div>[Lokasi], [Tanggal]</div>
        <div>Kepala Madrasah,</div>
        <div style={{ marginTop: '60px', fontWeight: 'bold', display: 'inline-block', position: 'relative', minWidth: '120px', marginBottom: selectedKepalaMadrasahNip && existingKepalaMadrasah[0]?.nip ? '4px' : '3px' }}>
          {selectedKepalaMadrasahNama && existingKepalaMadrasah[0] ? (
            selectedKepalaMadrasahNip ? (
              <span style={{ display: 'inline-block', borderBottom: '1px solid black', paddingBottom: '2px' }}>
                {existingKepalaMadrasah[0].nama}
              </span>
            ) : (
              existingKepalaMadrasah[0].nama
            )
          ) : (
            '_____________________'
          )}
        </div>
        {selectedKepalaMadrasahNip && existingKepalaMadrasah[0]?.nip && (
          <div>NIP. {existingKepalaMadrasah[0].nip}</div>
        )}
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? `Edit Jenis Surat: ${label}` : 'Tambah Jenis Surat Baru'} — Step {step + 1} / {STEPS.length}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex gap-1 mb-6">
        {STEPS.map((s, i) => (
            <div
              key={i}
              title={s}
              className={`flex-1 h-2 rounded-full transition-colors cursor-pointer ${
                i === step ? 'bg-primary' : i < step ? 'bg-primary/50' : 'bg-muted'
              }`}
              onClick={() => {
                // Editing: cannot go back to step 0 to preserve data
                if (isEditing && i === 0) return;
                // Only allow going back to already-completed steps
                if (i < step) setStep(i);
              }}
            />
          ))}
        </div>

        {/* ── STEP 0 — Label ────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4 mb-6">
            <div>
              <Label>Label Jenis Surat *</Label>
              <Input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="cth: Surat Keterangan Aktif"
                autoFocus
                className={labelError ? 'border-red-500 focus-visible:ring-red-400' : ''}
              />
              {labelError && <p className="text-xs text-red-500 mt-1">{labelError}</p>}
              {!labelError && label.trim() && (
                <p className="text-xs text-green-600 mt-1">✓ Label tersedia</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Nama jenis surat yang ditampilkan di daftar
              </p>
            </div>
            <div>
              <Label>Judul Dokumen</Label>
              <Input
                value={templateJudul}
                onChange={e => setTemplateJudul(e.target.value)}
                placeholder={label ? label.toUpperCase() : "Auto dari Label Jenis Surat"}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {label ? `Akan otomatis terisi dari label: "${label.toUpperCase()}"` : 'Judul yang ditampilkan di dokumen surat (akan otomatis dari Label)'}
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 1 — Header ───────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4 mb-6">
            <input type="file" accept="image/*" ref={logoInputRef} className="hidden" onChange={handleLogoUpload} />
            <input type="file" accept="image/jpeg,image/png" ref={headerImageRef} className="hidden" onChange={handleHeaderImageUpload} />

            <div className="border border-border rounded-lg p-3 space-y-3">
              <Label className="font-medium">Mode Header untuk Jenis Surat Ini</Label>
              <p className="text-xs text-muted-foreground">
                Pengaturan ini disimpan dari sesi terakhir dan dapat diubah untuk setiap jenis surat.
              </p>
              <div className="flex gap-3">
                {(['text', 'image'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setHeaderMode(mode)}
                    className={`flex-1 p-3 rounded-lg border-2 text-left transition-all ${
                      headerMode === mode ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="font-medium text-sm">{mode === 'text' ? 'Teks KOP' : 'Gambar KOP'}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {mode === 'text' ? 'Header khusus dengan baris teks' : 'Import JPEG/PNG scan KOP'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Image header */}
            {headerMode === 'image' && (
              <div className="border border-border rounded-lg p-4 space-y-3">
                <Label className="font-medium">Gambar Header (JPEG / PNG)</Label>
                {customHeaderImageUrl ? (
                  <div className="space-y-2">
                    <img src={customHeaderImageUrl} alt="Header KOP" className="w-full border rounded object-contain" style={{ maxHeight: '120px' }} />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => headerImageRef.current?.click()}>
                        <Upload className="mr-1 h-4 w-4" />Ganti Gambar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setCustomHeaderImageUrl('')}>Hapus</Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => headerImageRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Klik untuk upload gambar KOP (JPEG/PNG)</p>
                  </div>
                )}
              </div>
            )}

            {/* Text header */}
            {headerMode === 'text' && (
              <div className="border border-border rounded-lg p-4 space-y-4">
                {/* Logo */}
                <div className="flex items-center gap-4">
                  {customLogoUrl ? (
                    <img src={customLogoUrl} alt="Logo" className="w-16 h-16 object-contain border rounded" />
                  ) : (
                    <div className="w-16 h-16 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground">
                      <Upload className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                      <Upload className="mr-1 h-4 w-4" />{customLogoUrl ? 'Ganti Logo' : 'Upload Logo'}
                    </Button>
                    {customLogoUrl && <Button variant="ghost" size="sm" onClick={() => setCustomLogoUrl('')}>Hapus Logo</Button>}
                  </div>
                  <div className="flex items-center gap-3 ml-2">
                    <Label className="text-xs whitespace-nowrap">Ukuran: {customLogoSize}mm</Label>
                    <input type="range" value={customLogoSize} onChange={e => setCustomLogoSize(parseInt(e.target.value))} min={10} max={40} step={1} className="w-32 h-2" />
                  </div>
                </div>

                {/* Text lines */}
                {[
                  { label: 'Baris 1', field: 'line1', value: customLine1, setValue: setCustomLine1, sizeValue: customLine1Size, setSizeValue: setCustomLine1Size, defaultSize: 16, hint: '' },
                  { label: 'Baris 2', field: 'line2', value: customLine2, setValue: setCustomLine2, sizeValue: customLine2Size, setSizeValue: setCustomLine2Size, defaultSize: 14 },
                  { label: 'Nama Sekolah', field: 'school', value: customSchool, setValue: setCustomSchool, sizeValue: customSchoolSize, setSizeValue: setCustomSchoolSize, defaultSize: 12, hint: '' },
                  { label: 'Alamat', field: 'address', value: customAddress, setValue: setCustomAddress, sizeValue: customAddressSize, setSizeValue: setCustomAddressSize, defaultSize: 11, hint: '' },
                  { label: 'Kontak', field: 'contact', value: customContact, setValue: setCustomContact, sizeValue: customContactSize, setSizeValue: setCustomContactSize, defaultSize: 11, hint: '' },
                ].map(item => (
                  <div key={item.field} className="border-t border-border pt-3">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-sm">{item.label}</Label>
                        <Input
                          value={item.value}
                          onChange={e => item.setValue(e.target.value)}
                          placeholder={item.hint}
                          className="text-sm mt-1"
                        />
                      </div>
                      <div className="w-20">
                        <Select
                          value={String(item.sizeValue)}
                          onValueChange={v => item.setSizeValue(parseInt(v))}
                        >
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FONT_SIZE_OPTIONS.map(s => (
                              <SelectItem key={s} value={String(s)}>{s}pt</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Live preview */}
                <div className="border-t border-border pt-4">
                  <Label className="text-sm font-medium mb-2 block">Preview Header</Label>
                  <div className="bg-white text-black border rounded-lg p-6 mx-auto" style={{ maxWidth: '210mm', fontFamily: "'Times New Roman', serif" }}>
                    <div style={{ textAlign: 'center', borderBottom: '3px solid black', paddingBottom: '8px', position: 'relative' }}>
                      {customLogoUrl && (
                        <img src={customLogoUrl} alt="Logo" style={{ position: 'absolute', left: '0', bottom: '5px', width: `${customLogoSize}mm`, height: `${customLogoSize}mm`, objectFit: 'contain' }} />
                      )}
                      {customLine1 && <div style={{ fontSize: `${customLine1Size}pt`, fontWeight: 'bold', lineHeight: '1.0' }}>{customLine1}</div>}
                      {customLine2 && <div style={{ fontSize: `${customLine2Size}pt`, fontWeight: 'bold', lineHeight: '1.0' }}>{customLine2}</div>}
                      {customSchool && <div style={{ fontSize: `${customSchoolSize}pt`, fontWeight: 'bold', lineHeight: '1.0' }}>{customSchool}</div>}
                      {(customAddress || customContact) && (
                        <div style={{ fontSize: `${customAddressSize}pt`, lineHeight: '1.0' }}>
                          {customAddress}{customContact ? ` ${customContact}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2 — Nomor Surat ──────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4 mb-6">
            <div className="border border-border rounded-lg p-4 space-y-2">
              <Label>Format Nomor Surat *</Label>
              <Input
                value={nomorSuratFormat}
                onChange={e => setNomorSuratFormat(e.target.value)}
                placeholder="B. {nomor} /Mi.01.21/1/PP.01.1/{bulan}/{tahun}"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Placeholder: {'{nomor}'} = nomor surat, {'{bulan}'} = bulan (01-12), {'{tahun}'} = tahun
              </p>
              <p className="text-xs text-muted-foreground">
                Preview: {nomorSuratFormat.replace(/\{nomor\}/gi, '001').replace(/\{bulan\}/gi, '03').replace(/\{tahun\}/gi, '2026')}
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 3 — Konten (MS-Word-like editor) ────────────────────── */}
                {step === 3 && (
          <div className="space-y-4 mb-6">
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div>
                <Label className="text-base font-medium">Insert Label Format *</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Editor seperti MS Word: Tab = indent, Shift+Tab = outdent, Ctrl+B/I/U, Ctrl+Z/Y
                </p>
              <div className="border border-amber-200 rounded-lg p-3 bg-amber-50/60 dark:bg-amber-900/10 dark:border-amber-800 space-y-2">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                  📌 Insert Placeholder: Biodata (klik untuk sisipkan ke posisi kursor):
                </p>

                {/* Default biodata placeholders */}
                <div className="flex flex-wrap gap-1">
                  {PLACEHOLDERS.map(p => (
                    <Button
                      key={p.token}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 font-mono border-amber-300 hover:bg-amber-100"
                      onMouseDown={e => {
                        e.preventDefault();
                        insertLabeledPlaceholder(p);
                      }}
                    >
                      {p.token}
                    </Button>
                  ))}
                </div>

                {/* Custom biodata fields */}
                {customBiodata.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex-1 h-px bg-amber-200 dark:bg-amber-700" />
                      <span className="text-xs text-amber-700 dark:text-amber-400 font-medium whitespace-nowrap">
                        Biodata Kustom
                      </span>
                      <div className="flex-1 h-px bg-amber-200 dark:bg-amber-700" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {customBiodata.map(field => {
                        const phObj: Placeholder = { token: field.placeholder, label: field.label };
                        return (
                          <Button
                            key={field.key}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 font-mono border-amber-400 bg-amber-100/50 hover:bg-amber-100"
                            title={`${field.label} → ${field.placeholder}`}
                            onMouseDown={e => {
                              e.preventDefault();
                              insertLabeledPlaceholder(phObj);
                            }}
                          >
                            {field.placeholder}
                          </Button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* ── Toolbar ── */}
              <div className="flex flex-wrap gap-1 p-2 border border-border rounded-lg bg-muted/40 items-center">

                {/* Font size */}
                <Select onValueChange={applyFontSize} defaultValue="12">
                  <SelectTrigger className="h-8 w-20 text-xs">
                    <SelectValue placeholder="12pt" />
                  </SelectTrigger>
                  <SelectContent>
                    {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72].map(s => (
                      <SelectItem key={s} value={String(s)}>{s}pt</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="w-px bg-border mx-1 h-6" />

                {/* Bold / Italic / Underline / Strikethrough */}
                {[
                  { cmd: 'bold', icon: <Bold className="h-4 w-4" />, title: 'Bold (Ctrl+B)' },
                  { cmd: 'italic', icon: <Italic className="h-4 w-4" />, title: 'Italic (Ctrl+I)' },
                  { cmd: 'underline', icon: <Underline className="h-4 w-4" />, title: 'Underline (Ctrl+U)' },
                  { cmd: 'strikeThrough', icon: <Strikethrough className="h-4 w-4" />, title: 'Strikethrough' },
                ].map(item => (
                  <Button
                    key={item.cmd}
                    variant="outline"
                    size="sm"
                    onMouseDown={e => { e.preventDefault(); applyFormat(item.cmd); }}
                    className="h-8 w-8 p-0"
                    title={item.title}
                  >
                    {item.icon}
                  </Button>
                ))}

                <div className="w-px bg-border mx-1 h-6" />

                {/* Alignment */}
                {[
                  { cmd: 'justifyLeft', icon: <AlignLeft className="h-4 w-4" />, title: 'Rata Kiri' },
                  { cmd: 'justifyCenter', icon: <AlignCenter className="h-4 w-4" />, title: 'Tengah' },
                  { cmd: 'justifyRight', icon: <AlignRight className="h-4 w-4" />, title: 'Rata Kanan' },
                  { cmd: 'justifyFull', icon: <AlignJustify className="h-4 w-4" />, title: 'Justify (Ctrl+J)' },
                ].map(item => (
                  <Button
                    key={item.cmd}
                    variant="outline"
                    size="sm"
                    onMouseDown={e => { e.preventDefault(); applyFormat(item.cmd); }}
                    className="h-8 w-8 p-0"
                    title={item.title}
                  >
                    {item.icon}
                  </Button>
                ))}

                <div className="w-px bg-border mx-1 h-6" />

                {/* Lists */}
                <Button variant="outline" size="sm" onMouseDown={e => { e.preventDefault(); applyFormat('insertUnorderedList'); }} className="h-8 w-8 p-0" title="Bullet List">
                  <List className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onMouseDown={e => { e.preventDefault(); applyFormat('insertOrderedList'); }} className="h-8 w-8 p-0" title="Numbered List">
                  <ListOrdered className="h-4 w-4" />
                </Button>

                <div className="w-px bg-border mx-1 h-6" />

                {/* Indent / Outdent */}
                <Button variant="outline" size="sm" onMouseDown={e => { e.preventDefault(); applyFormat('indent'); }} className="h-8 w-8 p-0" title="Indent (Tab)">
                  <Indent className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onMouseDown={e => { e.preventDefault(); applyFormat('outdent'); }} className="h-8 w-8 p-0" title="Outdent (Shift+Tab)">
                  <Outdent className="h-4 w-4" />
                </Button>

                <div className="w-px bg-border mx-1 h-6" />

                {/* Undo / Redo */}
                <Button variant="outline" size="sm" onMouseDown={e => { e.preventDefault(); applyFormat('undo'); }} className="h-8 w-8 p-0" title="Undo (Ctrl+Z)">
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onMouseDown={e => { e.preventDefault(); applyFormat('redo'); }} className="h-8 w-8 p-0" title="Redo (Ctrl+Y)">
                  <Redo2 className="h-4 w-4" />
                </Button>

                {/* Remove formatting */}
                <Button variant="outline" size="sm" onMouseDown={e => { e.preventDefault(); applyFormat('removeFormat'); }} className="h-8 px-2 text-xs" title="Hapus Pemformatan">
                  <X className="h-3 w-3 mr-1" />Format
                </Button>
              </div>

                <div className="w-px bg-border mx-1 h-6" />

                {/* Bold / Italic / Underline / Strikethrough */}
                {[
                  { cmd: 'bold', icon: <Bold className="h-4 w-4" />, title: 'Bold (Ctrl+B)' },
                  { cmd: 'italic', icon: <Italic className="h-4 w-4" />, title: 'Italic (Ctrl+I)' },
                  { cmd: 'underline', icon: <Underline className="h-4 w-4" />, title: 'Underline (Ctrl+U)' },
                  { cmd: 'strikeThrough', icon: <Strikethrough className="h-4 w-4" />, title: 'Strikethrough' },
                ].map(item => (
                  <Button
                    key={item.cmd}
                    variant="outline"
                    size="sm"
                    onMouseDown={e => { e.preventDefault(); applyFormat(item.cmd); }}
                    className="h-8 w-8 p-0"
                    title={item.title}
                  >
                    {item.icon}
                  </Button>
                ))}

                <div className="w-px bg-border mx-1 h-6" />

                {/* Alignment */}
                {[
                  { cmd: 'justifyLeft', icon: <AlignLeft className="h-4 w-4" />, title: 'Rata Kiri' },
                  { cmd: 'justifyCenter', icon: <AlignCenter className="h-4 w-4" />, title: 'Tengah' },
                  { cmd: 'justifyRight', icon: <AlignRight className="h-4 w-4" />, title: 'Rata Kanan' },
                  { cmd: 'justifyFull', icon: <AlignJustify className="h-4 w-4" />, title: 'Justify (Ctrl+J)' },
                ].map(item => (
                  <Button
                    key={item.cmd}
                    variant="outline"
                    size="sm"
                    onMouseDown={e => { e.preventDefault(); applyFormat(item.cmd); }}
                    className="h-8 w-8 p-0"
                    title={item.title}
                  >
                    {item.icon}
                  </Button>
                ))}

                <div className="w-px bg-border mx-1 h-6" />

                {/* Lists */}
                <Button variant="outline" size="sm" onMouseDown={e => { e.preventDefault(); applyFormat('insertUnorderedList'); }} className="h-8 w-8 p-0" title="Bullet List">
                  <List className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onMouseDown={e => { e.preventDefault(); applyFormat('insertOrderedList'); }} className="h-8 w-8 p-0" title="Numbered List">
                  <ListOrdered className="h-4 w-4" />
                </Button>

                <div className="w-px bg-border mx-1 h-6" />

                {/* Indent / Outdent */}
                <Button variant="outline" size="sm" onMouseDown={e => { e.preventDefault(); applyFormat('indent'); }} className="h-8 w-8 p-0" title="Indent (Tab)">
                  <Indent className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onMouseDown={e => { e.preventDefault(); applyFormat('outdent'); }} className="h-8 w-8 p-0" title="Outdent (Shift+Tab)">
                  <Outdent className="h-4 w-4" />
                </Button>

                <div className="w-px bg-border mx-1 h-6" />

                {/* Undo / Redo */}
                <Button variant="outline" size="sm" onMouseDown={e => { e.preventDefault(); applyFormat('undo'); }} className="h-8 w-8 p-0" title="Undo (Ctrl+Z)">
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onMouseDown={e => { e.preventDefault(); applyFormat('redo'); }} className="h-8 w-8 p-0" title="Redo (Ctrl+Y)">
                  <Redo2 className="h-4 w-4" />
                </Button>

                {/* Remove formatting */}
                <Button variant="outline" size="sm" onMouseDown={e => { e.preventDefault(); applyFormat('removeFormat'); }} className="h-8 px-2 text-xs" title="Hapus Pemformatan">
                  <X className="h-3 w-3 mr-1" />Format
                </Button>
              </div>

              {/* ── Editable area ── */}
              <style>{`
                .minsa-editor { 
                  outline: none; 
                  direction: ltr !important;
                  text-align: left !important;
                  max-width: 159.2mm !important;
                }
                .minsa-editor:focus { box-shadow: 0 0 0 2px hsl(var(--primary)/0.4); }
                .minsa-editor .tab-indent { 
                  display: inline-block !important; 
                  width: ${TAB_WIDTH_CM}cm !important; 
                  min-width: ${TAB_WIDTH_CM}cm !important; 
                }
                .placeholder-token {
                  background: #fffbcc;
                  border: 1px dashed #d9a600;
                  padding: 0 2px;
                  border-radius: 2px;
                  user-select: none;
                  direction: ltr;
                }
                [data-ph-label] {
                  display: inline !important;
                  white-space: normal !important;
                }
                .ph-label {
                  font-family: monospace;
                  letter-spacing: normal;
                  padding-right: 1ch;
                }
                .ph-colon {
                  display: inline-block;
                  width: 1.5ch;
                  text-align: right;
                }
                .minsa-editor span[contenteditable="false"] { cursor:default; user-select:all; }
                .minsa-editor * { user-select: text; }
              `}</style>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                spellCheck
                onInput={e => debouncedSetTemplateIsi(e.currentTarget.innerHTML)}
                onBlur={saveEditorSelection}
                onMouseUp={saveEditorSelection}
                onKeyUp={saveEditorSelection}
                onKeyDown={handleEditorKeyDown}
className="minsa-editor min-h-[320px] p-4 border border-border rounded-lg bg-white text-black leading-relaxed overflow-auto mx-auto shadow-inner"
                style={{
                  direction: 'ltr',
                  textAlign: 'left',
                  fontFamily: "'Times New Roman', Times, serif",
                  fontSize: '12pt',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  maxWidth: '159.2mm', /* A4 210mm - 2x25.4mm margins */
                  margin: '0 auto',
                  boxShadow: 'inset 0 0 0 1px #e5e7eb, 0 0 0 1px #f3f4f6',
                }}
                data-placeholder="Mulai mengetik isi surat di sini..."
              />

              <p className="text-xs text-muted-foreground">
                💡 <strong>Tab</strong> = indent 1.25cm &nbsp;|&nbsp;
                <strong>Shift+Tab</strong> = outdent &nbsp;|&nbsp;
                <strong>Ctrl+B/I/U</strong> = Bold/Italic/Underline &nbsp;|&nbsp;
                <strong>Ctrl+Z/Y</strong> = Undo/Redo
              </p>

              {/* Live A4 preview below editor */}
              <div className="border-t border-border pt-4">
                <Label className="text-sm font-medium mb-2 block">Preview A4 (real-time)</Label>
                <div className="bg-gray-100 p-3 rounded-lg overflow-auto">
                  <div style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: '210mm', pointerEvents: 'none' }}>
                    <InlineA4Preview />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4 — Kepala Madrasah ───────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4 mb-6">
            <div className="border border-border rounded-lg p-4 space-y-4">
              <Label className="text-base font-medium">Kepala Madrasah</Label>
              <p className="text-xs text-muted-foreground">
                Pilih informasi mana yang ingin ditampilkan di tanda tangan
              </p>

              {existingKepalaMadrasah.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Belum ada data Kepala Madrasah di Akun</p>
              ) : (
                <div className="space-y-4">
                  {existingKepalaMadrasah.map(km => (
                    <div key={km.id} className="border border-border rounded-lg p-4 space-y-3">
                      <p className="font-medium text-sm">{km.nama}</p>
                      <div className="flex items-center gap-3 ml-2">
                        <Checkbox
                          checked={selectedKepalaMadrasahNama}
                          onCheckedChange={c => setSelectedKepalaMadrasahNama(c as boolean)}
                          id={`nama-${km.id}`}
                        />
                        <Label htmlFor={`nama-${km.id}`} className="font-normal cursor-pointer">
                          Tampilkan Nama Kepala Madrasah
                        </Label>
                      </div>
                      <div className="flex items-center gap-3 ml-2">
                        <Checkbox
                          checked={selectedKepalaMadrasahNip}
                          onCheckedChange={c => setSelectedKepalaMadrasahNip(c as boolean)}
                          id={`nip-${km.id}`}
                        />
                        <Label htmlFor={`nip-${km.id}`} className="font-normal cursor-pointer">
                          Tampilkan NIP{km.nip ? ` (${km.nip})` : ''}
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live A4 preview reflects Step 4 editor content + kepala madrasah selection */}
            <div className="border border-border rounded-lg p-4 space-y-2">
              <Label className="text-sm font-medium">Preview A4 — {label}</Label>
              <p className="text-xs text-muted-foreground">
                Preview ini mencerminkan konten dari Step 4 dan pengaturan kepala madrasah.
              </p>
              <div className="bg-gray-100 p-3 rounded-lg overflow-auto">
                <div style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: '210mm', pointerEvents: 'none' }}>
                  <InlineA4Preview />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5 — Full A4 Preview ────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[70vh] overflow-auto">
                <div className="flex justify-center bg-gray-100 p-4">
                  <InlineA4Preview />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Navigation ─────────────────────────────────────────────── */}
        <div className="flex justify-between gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>
            <ChevronLeft className="mr-1 h-4 w-4" />Sebelumnya
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>Batal</Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceedStep()}>
                Selanjutnya<ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={!canProceedStep()}>
                Simpan &amp; Buat DOCX
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}