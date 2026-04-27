// MINSA - Store & Types

export interface BiodataField {
  key: string;
  label: string;
  placeholder: string;
  inputType: 'text' | 'date' | 'select';
  isCustom?: boolean;
}

export const DEFAULT_BIODATA: BiodataField[] = [
  { key: 'nama', label: 'Nama', placeholder: '{nama}', inputType: 'text' },
  { key: 'tempatLahir', label: 'Tempat/Tanggal Lahir', placeholder: '{tempat_lahir}, {tanggal_lahir}', inputType: 'text' },
  { key: 'jenisKelamin', label: 'Jenis Kelamin', placeholder: '{jenis_kelamin}', inputType: 'select' },
  { key: 'kelas', label: 'Kelas', placeholder: '{kelas}', inputType: 'select' },
  { key: 'noInduk', label: 'No. Induk', placeholder: '{no_induk}', inputType: 'text' },
  { key: 'nisn', label: 'NISN', placeholder: '{nisn}', inputType: 'text' },
  { key: 'namaOrangTua', label: 'Nama Orang Tua/Wali', placeholder: '{nama_orang_tua}', inputType: 'text' },
  { key: 'alamat', label: 'Alamat', placeholder: '{alamat}', inputType: 'text' },
  { key: 'tahunAjaran', label: 'Tahun Ajaran', placeholder: '{tahun_ajaran}', inputType: 'text' },
];

export interface KepalaMadrasah {
  id: string;
  nip: string;
  nama: string;
}

export interface TahunAjaran {
  id: string;
  label: string;
}

export interface JenisSuratHeader {
  useGlobalHeader: boolean;
  // Per-jenis-surat custom header (optional, replaces global if provided)
  customHeaderMode?: 'text' | 'image'; // text or image mode
  customLine1?: string;
  customLine2?: string;
  customSchool?: string;
  customAddress?: string;
  customContact?: string;
  customLogoUrl?: string;
  customLogoSize?: number;
  customLine1Size?: number;
  customLine2Size?: number;
  customSchoolSize?: number;
  customAddressSize?: number;
  customContactSize?: number;
  customHeaderImageUrl?: string; // For image mode
}

export interface JenisSurat {
  id: string;
  slug: string;
  label: string;
  templateJudul: string;
  templateIsi: string;       // @deprecated Legacy HTML fallback — will be removed in future version
  templateDocxBase64?: string; // base64-encoded .docx — PRIMARY format (Office Open XML)
  templateXml?: string;      // Pure XML representation for interoperability
  nomorSuratFormat: string;   // Custom nomor surat format for this jenis surat

createdAt: string;
  updatedAt?: string;
  selectedBiodata?: string[];
  extraFields?: Record<string, string>; // Kepala madrasah config, etc.
  jenisSuratHeader?: JenisSuratHeader; // Per-jenis-surat header settings (optional)
  // Signature: uses Kepala Madrasah data (id references kepalaMadrasahId)
  signatureKepalaMadrasahId?: string;  // Reference to KepalaMadrasah
  signatureImageUrl?: string;          // Signature image (Base64)
}

export interface Surat {
  id: string;
  jenisSuratId: string;
  nomorSurat: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  kelas: string;
  noInduk: string;
  nisn: string;
  namaOrangTua: string;
  alamat: string;
  tahunAjaran: string;
  bulan: number;
  tahun: number;
  kepalaMadrasahId: string;
  arah: 'masuk' | 'keluar';
  createdAt: string;
  updatedAt?: string;
  extraFields?: Record<string, string>;
}

export type ThemeName = 'light' | 'dark';
export type ColorTheme = 'default' | 'emerald' | 'ocean' | 'sunset' | 'royal' | 'rose' | 'teal' | 'amber' | 'slate' | 'indigo' | 'cyan' | 'fuchsia' | 'lime' | 'zinc' | 'gold' | 'silver' | 'bronze' | 'magenta' | 'peach' | 'mint' | 'lavender' | 'charcoal' | 'coral' | 'olive' | 'custom';

export interface SuratHeader {
  line1: string;
  line2: string;
  school: string;
  schoolSub: string;
  address: string;
  contact: string;
  logoUrl: string;
  logoSize: number;
  line1Size?: number;
  line2Size?: number;
  schoolSize?: number;
  schoolSubSize?: number;
  addressSize?: number;
  contactSize?: number;
  headerMode?: 'text' | 'image';
  headerImageUrl?: string;
}

export interface Repository {
  id: string;
  name: string;
  description?: string;
  url?: string;
  installed: boolean;
}

export interface AppSettings {
  username?: string;
  password?: string;
  kepalaMadrasah: KepalaMadrasah[];
  tahunAjaran: TahunAjaran[];
  jenisSurat: JenisSurat[];
  repositories?: Repository[];
  theme: ThemeName;
  colorTheme: ColorTheme;
  activeTahunAjaran: string;
  dashboardTitle: string;
  suratHeader: SuratHeader;
  nsm: string;
  npsn: string;
  nomorSuratFormat: string;
  customBiodata?: BiodataField[];
  appName: string;
  schoolName: string;
  kabupaten: string;
  customLogo: string;
  customKemenagLogo: string;
  onboarded: boolean;
  customThemeColor?: string;
}

export interface AppData {
  settings: AppSettings;
  surat: Surat[];
}

// ── XML Document Types (Office Open XML based) ───────────────────────────────

export interface XmlDocumentNode {
  type: 'document' | 'header' | 'body' | 'paragraph' | 'run' | 'text' | 'table' | 'tableRow' | 'tableCell' | 'signature' | 'image';
  children?: XmlDocumentNode[];
  text?: string;
  style?: Record<string, string>;
  placeholder?: string;
  attributes?: Record<string, string>;
}

export interface XmlDocument {
  version: '1.0';
  encoding: 'UTF-8';
  root: XmlDocumentNode;
}

export interface DocxExportOptions {
  filename: string;
  pageSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export const DEFAULT_DOCX_OPTIONS: DocxExportOptions = {
  filename: 'document.docx',
  pageSize: 'A4',
  orientation: 'portrait',
  margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch in twips
};


const DEFAULT_HEADER: SuratHeader = {
  line1: '',
  line2: '',
  school: '',
  schoolSub: '',
  address: '',
  contact: '',
  logoUrl: '',
  logoSize: 22,
  line1Size: 16,
  line2Size: 14,
  schoolSize: 12,
  schoolSubSize: 10,
  addressSize: 11,
  contactSize: 11,
};

function detectSystemTheme(): ThemeName {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

const DEFAULT_DATA: AppData = {
  settings: {
    kepalaMadrasah: [],
    tahunAjaran: [],
    jenisSurat: [],
    repositories: [],
    theme: 'light',
    colorTheme: 'default',
    activeTahunAjaran: '',
    dashboardTitle: 'Sistem Surat',
    suratHeader: DEFAULT_HEADER,
    nsm: '',
    npsn: '',
    nomorSuratFormat: 'B. {nomor} /Mi.01.21/1/PP.01.1/{bulan}/{tahun}',
    customBiodata: [],
    appName: 'MINSA (Manajemen Surat & Informasi Nasional)',
    schoolName: 'NAMA SEKOLAH',
    kabupaten: '',
    customLogo: '',
    customKemenagLogo: '',
    onboarded: false,
  },
  surat: [],
};

const STORAGE_KEY = 'minsa-data';

// ── Electron API detection ────────────────────────────────────────────────────
declare global {
  interface Window {
    electronAPI?: {
      getPrinters(): unknown;
      printDocument(arg0: { printerName: string; copies: number; duplex: boolean; }): unknown;
      printToPDF(arg0: { pageSize: string; landscape: boolean; }): unknown;
      isElectron: boolean;
      getDataPath: () => Promise<string>;
      chooseDataPath: () => Promise<string | null>;
      openDataFolder: () => Promise<void>;
      storageRead: () => Promise<string | null>;
      storageWrite: (json: string) => Promise<boolean>;
      exportData: (json: string) => Promise<string | false>;
      importData: () => Promise<string | null>;
      getAppInfo: () => Promise<{ version: string; dataPath: string; platform: string; arch: string; osVersion: string }>;
      setNativeTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
      // DOCX template management
      saveTemplateDocx: (slug: string, base64: string) => Promise<string | false>; // returns saved path or false
      openTemplateDocx: (slug: string) => Promise<boolean>;                         // opens in default app
      readTemplateDocx: (slug: string) => Promise<string | null>;                   // reads back as base64 after editing
      deleteTemplateDocx: (slug: string) => Promise<boolean>;
    };
  }
}

export const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

// ── Parse raw JSON into typed AppData ─────────────────────────────────────────
function parseRawData(raw: string): AppData | null {
  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_DATA,
      ...parsed,
      settings: {
        ...DEFAULT_DATA.settings,
        ...parsed.settings,
        customBiodata: parsed.settings?.customBiodata || [],
        appName: parsed.settings?.appName || 'MANAJEMEN SURAT',
        schoolName: parsed.settings?.schoolName || 'NAMA SEKOLAH',
        kabupaten: parsed.settings?.kabupaten || '',
        customLogo: parsed.settings?.customLogo || '',
        customKemenagLogo: parsed.settings?.customKemenagLogo || '',
        onboarded: parsed.settings?.onboarded ?? false,
        customThemeColor: parsed.settings?.customThemeColor || '',
        suratHeader: {
          ...DEFAULT_HEADER,
          ...(parsed.settings?.suratHeader || {}),
          schoolSub: parsed.settings?.suratHeader?.schoolSub || '',
          schoolSubSize: parsed.settings?.suratHeader?.schoolSubSize || 10,
        },
      },
      surat: (parsed.surat || []).map((s: any) => ({
        ...s,
        arah: s.arah || 'keluar',
        extraFields: s.extraFields || {},
      })),
    };
  } catch {
    return null;
  }
}

// ── Sync load (used on startup from localStorage fallback or cached value) ────
export function loadData(): AppData {
  // In Electron, we prime from localStorage cache; async refresh happens in useAppData
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = parseRawData(raw);
      if (parsed) return parsed;
    }
  } catch { /* ignore */ }
  return structuredClone({ ...DEFAULT_DATA, settings: { ...DEFAULT_DATA.settings, theme: detectSystemTheme() } });
}

// ── Async load — reads from Electron file storage when available ───────────────
export async function loadDataAsync(): Promise<AppData> {
  if (isElectron && window.electronAPI) {
    try {
      const raw = await window.electronAPI.storageRead();
      if (raw) {
        const parsed = parseRawData(raw);
        if (parsed) {
          // Keep localStorage in sync for sync reads
          localStorage.setItem(STORAGE_KEY, raw);
          return parsed;
        }
      }
    } catch { /* fallback below */ }
  }
  return loadData();
}

// ── Save — writes to Electron file AND localStorage ───────────────────────────
export function saveData(data: AppData): void {
  const json = JSON.stringify(data);
  // Always keep localStorage updated (fast sync read)
  try { localStorage.setItem(STORAGE_KEY, json); } catch { /* ignore */ }
  // Also write to file in Electron (reliable, survives cache clears)
  if (isElectron && window.electronAPI) {
    window.electronAPI.storageWrite(json).catch(() => { /* silent */ });
  }
}

// ── Backup & restore helpers ──────────────────────────────────────────────────
export async function exportDataToFile(data: AppData): Promise<string | false> {
  if (!isElectron || !window.electronAPI) return false;
  return window.electronAPI.exportData(JSON.stringify(data, null, 2));
}

export async function importDataFromFile(): Promise<AppData | null> {
  if (!isElectron || !window.electronAPI) return null;
  const raw = await window.electronAPI.importData();
  if (!raw) return null;
  return parseRawData(raw);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const BULAN_NAMES = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const KELAS_OPTIONS = [
  { value: 'I', label: 'I (Satu)' },
  { value: 'II', label: 'II (Dua)' },
  { value: 'III', label: 'III (Tiga)' },
  { value: 'IV', label: 'IV (Empat)' },
  { value: 'V', label: 'V (Lima)' },
  { value: 'VI', label: 'VI (Enam)' },
];

export const COLOR_THEMES: { value: ColorTheme; label: string; color: string }[] = [
  { value: 'default',  label: 'Default',  color: '#1e293b' },
  { value: 'emerald',  label: 'Emerald',  color: '#059669' },
  { value: 'ocean',    label: 'Ocean',    color: '#0284c7' },
  { value: 'sunset',   label: 'Sunset',   color: '#ea580c' },
  { value: 'royal',    label: 'Royal',    color: '#7c3aed' },
  { value: 'rose',     label: 'Rose',     color: '#e11d48' },
  { value: 'teal',     label: 'Teal',     color: '#0d9488' },
  { value: 'amber',    label: 'Amber',    color: '#d97706' },
  { value: 'slate',    label: 'Slate',    color: '#475569' },
  { value: 'indigo',   label: 'Indigo',   color: '#4f46e5' },
  { value: 'cyan',     label: 'Cyan',     color: '#06b6d4' },
  { value: 'fuchsia',  label: 'Fuchsia',  color: '#d946ef' },
  { value: 'lime',     label: 'Lime',     color: '#84cc16' },
  { value: 'zinc',     label: 'Zinc',     color: '#71717a' },
  { value: 'gold',     label: 'Gold',     color: '#d4af37' },
  { value: 'silver',   label: 'Silver',   color: '#c0c0c0' },
  { value: 'bronze',   label: 'Bronze',   color: '#cd7f32' },
  { value: 'magenta',  label: 'Magenta',  color: '#ff00ff' },
  { value: 'peach',    label: 'Peach',    color: '#ffb07c' },
  { value: 'mint',     label: 'Mint',     color: '#98ff98' },
  { value: 'lavender', label: 'Lavender', color: '#b57edc' },
  { value: 'charcoal', label: 'Charcoal', color: '#333333' },
  { value: 'coral',    label: 'Coral',    color: '#ff7f50' },
  { value: 'olive',    label: 'Olive',    color: '#708238' },
  { value: 'custom',   label: 'Custom',   color: '#000000' },
];

/** Validate tahun ajaran format: must be YYYY/YYYY+1, e.g. 2025/2026 */
export function isValidTahunAjaran(label: string): boolean {
  const m = label.trim().match(/^(\d{4})\/(\d{4})$/);
  if (!m) return false;
  const y1 = parseInt(m[1], 10);
  const y2 = parseInt(m[2], 10);
  return y2 === y1 + 1;
}

export function isInTahunAjaran(surat: Pick<Surat, 'bulan' | 'tahun'>, taLabel: string): boolean {
  const parts = taLabel.split('/');
  if (parts.length !== 2) return false;
  const startYear = parseInt(parts[0], 10);
  const endYear = parseInt(parts[1], 10);
  if (isNaN(startYear) || isNaN(endYear)) return false;
  return (surat.tahun === startYear && surat.bulan >= 7) || (surat.tahun === endYear && surat.bulan <= 6);
}

export function formatNomorSurat(nomorSurat: string, bulan: number, tahun: number, format?: string): string {
  const bulanStr = String(bulan).padStart(2, '0');
  const template = format || 'B. {nomor} /Mi.01.21/1/PP.01.1/{bulan}/{tahun}';
  // When nomor is empty, replace with 7 non-breaking spaces to keep the slot visible
  const nomorValue = nomorSurat && nomorSurat.trim() ? nomorSurat.trim() : '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';
  const result = template
    .replace(/\{nomor\}/gi, nomorValue)
    .replace(/\{bulan\}/gi, bulanStr)
    .replace(/\{tahun\}/gi, String(tahun));
  return result;
}

export function getAllBiodataFields(settings: AppSettings): BiodataField[] {
  return [...DEFAULT_BIODATA, ...(settings.customBiodata || []).map(f => ({ ...f, isCustom: true }))];
}

export function getAllBiodataPlaceholders(settings: AppSettings): { key: string; label: string; placeholder: string }[] {
  return getAllBiodataFields(settings).map(f => ({
    key: f.key,
    label: f.label,
    placeholder: f.placeholder,
  }));
}


export function extractBiodataKeysFromTemplate(settings: AppSettings, template: string): string[] {
  if (!template) return [];

  // Extract tokens like {nama} or {no_induk} from template HTML/text
  const tokens = new Set<string>();
  const re = /\{([a-zA-Z0-9_]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(template)) !== null) {
    tokens.add(match[1].trim().toLowerCase());
  }

  // Map template tokens → form keys
  const tokenToKey: Record<string, string> = {
    // default biodata tokens
    nama: 'nama',
    tempat_lahir: 'tempatLahir',
    tanggal_lahir: 'tempatLahir',
    jenis_kelamin: 'jenisKelamin',
    kelas: 'kelas',
    no_induk: 'noInduk',
    nisn: 'nisn',
    nama_orang_tua: 'namaOrangTua',
    alamat: 'alamat',
    tahun_ajaran: 'tahunAjaran',

    // nomor surat formatting tokens (not biodata)
    nomor: '',
    bulan: '',
    tahun: '',
  };

  const customKeys = new Set((settings.customBiodata || []).map(f => f.key.toLowerCase()));

  const keys: string[] = [];
  for (const token of tokens) {
    const mapped = tokenToKey[token];
    if (mapped === '') continue; // explicitly ignored tokens
    if (mapped) {
      keys.push(mapped);
      continue;
    }
    // custom biodata uses {key}
    if (customKeys.has(token)) keys.push(token);
  }

  // De-duplicate, preserve insertion order
  const unique = [...new Set(keys)];
  return unique.filter(k => k !== 'tahunAjaran'); // tahun ajaran is auto-filled, no input needed
}

export function generateBiodataTableHtml(selectedKeys: string[], allFields: BiodataField[]): string {
  const selected = selectedKeys.map(key => allFields.find(f => f.key === key)).filter(Boolean) as BiodataField[];
  if (selected.length === 0) return '';

  // Use fixed pixel width for label column — consistent ruler regardless of font size
  // 40% of A4 text width ≈ label column; colon separator; right side = placeholder
  // Wrapped in <p> to match the editor's paragraph model (insertParagraph creates <p>)
  let html = '';
  for (const field of selected) {
    // Label in a fixed-width inline-block, colon, then placeholder
    // style matches .template-editor p exactly
    html += `<p style="margin:0;line-height:1.5;font-family:'Times New Roman',Times,serif;font-size:12pt;text-align:justify;">` +
      `<span style="display:inline-block;min-width:10cm;font-family:'Times New Roman',Times,serif;font-size:12pt;">${field.label}</span>` +
      `<span style="font-family:'Times New Roman',Times,serif;font-size:12pt;">: ${field.placeholder}</span>` +
      `</p>`;
  }
  return html;
}

// ── XML Document Utilities ───────────────────────────────────────────────────

/**
 * Create a pure XML document string from structured nodes
 */
export function createXmlDocument(root: XmlDocumentNode): string {
  const declaration = '<?xml version="1.0" encoding="UTF-8"?>';
  const body = serializeXmlNode(root);
  return `${declaration}\n${body}`;
}

function serializeXmlNode(node: XmlDocumentNode): string {
  const attrs = node.attributes
    ? Object.entries(node.attributes).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(' ')
    : '';
  const openTag = attrs ? `<${node.type} ${attrs}>` : `<${node.type}>`;
  const closeTag = `</${node.type}>`;

  if (node.text !== undefined) {
    return `${openTag}${escapeXml(node.text)}${closeTag}`;
  }

  if (node.children && node.children.length > 0) {
    const children = node.children.map(serializeXmlNode).join('\n');
    return `${openTag}\n${children}\n${closeTag}`;
  }

  return `<${node.type}${attrs ? ' ' + attrs : ''} />`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;');
}

/**
 * Convert legacy HTML template to XML document structure
 * @deprecated Use DOCX-based templates instead
 */
export function htmlToXmlDocument(html: string): XmlDocumentNode {
  // Parse HTML and convert to XML structure
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  return {
    type: 'document',
    children: Array.from(body.childNodes).map(node => domNodeToXmlNode(node)).filter(Boolean) as XmlDocumentNode[],
  };
}

function domNodeToXmlNode(node: Node): XmlDocumentNode | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim();
    if (!text) return null;
    return { type: 'text', text };
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const type = mapHtmlTagToXmlType(el.tagName.toLowerCase());
    const children = Array.from(el.childNodes)
      .map(domNodeToXmlNode)
      .filter(Boolean) as XmlDocumentNode[];

    return {
      type,
      children: children.length > 0 ? children : undefined,
      style: el.getAttribute('style') ? parseStyle(el.getAttribute('style')!) : undefined,
      attributes: el.className ? { class: el.className } : undefined,
    };
  }

  return null;
}

function mapHtmlTagToXmlType(tag: string): XmlDocumentNode['type'] {
  const mapping: Record<string, XmlDocumentNode['type']> = {
    p: 'paragraph',
    div: 'paragraph',
    span: 'run',
    b: 'run',
    strong: 'run',
    i: 'run',
    em: 'run',
    u: 'run',
    table: 'table',
    tr: 'tableRow',
    td: 'tableCell',
    th: 'tableCell',
    img: 'image',
    br: 'paragraph',
  };
  return mapping[tag] || 'paragraph';
}

function parseStyle(styleStr: string): Record<string, string> {
  const styles: Record<string, string> = {};
  styleStr.split(';').forEach(rule => {
    const [key, value] = rule.split(':').map(s => s.trim());
    if (key && value) styles[key] = value;
  });
  return styles;
}

/**
 * Check if a jenis surat uses the new DOCX-based format
 */
export function isDocxTemplate(jenisSurat: JenisSurat): boolean {
  return !!jenisSurat.templateDocxBase64 && jenisSurat.templateDocxBase64.length > 0;
}

/**
 * Check if a jenis surat uses the legacy HTML format
 * @deprecated
 */
export function isLegacyHtmlTemplate(jenisSurat: JenisSurat): boolean {
  return !isDocxTemplate(jenisSurat) && !!jenisSurat.templateIsi;
}

/**
 * Get the effective template content type for a jenis surat
 */
export function getTemplateType(jenisSurat: JenisSurat): 'docx' | 'xml' | 'html' {
  if (isDocxTemplate(jenisSurat)) return 'docx';
  if (jenisSurat.templateXml) return 'xml';
  return 'html';
}
