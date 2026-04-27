/**
 * buildA4Docx
 * -----------
 * Generates a DOCX (Office Open XML) document from the live #a4-print-area DOM
 * or from template data, ready for Electron's printToPDF / print() or download.
 * 
 * This replaces the legacy buildA4Html.ts with pure XML-based DOCX generation.
 */

import {
  Document, Paragraph, TextRun, Table, TableCell, TableRow,
  AlignmentType, Packer, PageOrientation, convertInchesToTwip,
  BorderStyle, Header, Footer, PageNumber, ImageRun,
  WidthType, HeadingLevel, UnderlineType,
} from 'docx';
import type { Surat, JenisSurat, AppSettings } from './store';
import { formatNomorSurat, KELAS_OPTIONS } from './store';

/**
 * Build a complete DOCX document for a Surat
 */
export async function buildA4Docx(
  surat: Surat,
  jenisSurat: JenisSurat,
  settings: AppSettings
): Promise<Blob | null> {
  // If DOCX template exists, use it as base and inject biodata
  if (jenisSurat.templateDocxBase64) {
    try {
      return await buildFromTemplateDocx(jenisSurat.templateDocxBase64, surat, settings);
    } catch {
      // Fall through to generate from scratch
    }
  }

  // Generate DOCX from scratch using the XML-based approach
  return await buildFromScratch(surat, jenisSurat, settings);
}

/**
 * Build DOCX from existing template DOCX (inject biodata)
 */
async function buildFromTemplateDocx(
  templateBase64: string,
  surat: Surat,
  settings: AppSettings
): Promise<Blob> {
  // Decode base64 to blob
  const byteString = atob(templateBase64);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  
  // For now, return the template as-is (biodata injection would require
  // a more complex DOCX manipulation library like docxtemplater)
  // TODO: Implement proper DOCX template variable substitution
  return new Blob([bytes], { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });
}

/**
 * Build DOCX from scratch with full formatting
 */
async function buildFromScratch(
  surat: Surat,
  jenisSurat: JenisSurat,
  settings: AppSettings
): Promise<Blob> {
  const header = settings.suratHeader;
  const kabupaten = settings.kabupaten || '';
  
  // Build header section
  const headerChildren: (Paragraph | Table)[] = [];
  
  if (header.headerMode === 'image' && header.headerImageUrl) {
    // Image header - would need to fetch and convert to ImageRun
    headerChildren.push(new Paragraph({
      children: [new TextRun({ text: '[Header Image]' })],
    }));
  } else {
    // Text header with logo
    const headerTable = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: header.logoUrl ? [
                  // Would need ImageRun for actual image
                  new TextRun({ text: '[Logo]' })
                ] : [],
              })],
              width: { size: 20, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                header.line1 ? new Paragraph({
                  children: [new TextRun({ text: header.line1, bold: true, size: 32 })],
                  alignment: AlignmentType.CENTER,
                }) : new Paragraph({ children: [] }),
                header.line2 ? new Paragraph({
                  children: [new TextRun({ text: header.line2, bold: true, size: 28 })],
                  alignment: AlignmentType.CENTER,
                }) : new Paragraph({ children: [] }),
                header.school ? new Paragraph({
                  children: [new TextRun({ text: header.school, bold: true, size: 24 })],
                  alignment: AlignmentType.CENTER,
                }) : new Paragraph({ children: [] }),
                (header.address || header.contact) ? new Paragraph({
                  children: [new TextRun({ 
                    text: `${header.address}${header.contact ? ` ${header.contact}` : ''}`,
                    size: 22 
                  })],
                  alignment: AlignmentType.CENTER,
                }) : new Paragraph({ children: [] }),
              ],
              width: { size: 80, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });
    
    headerChildren.push(headerTable);
    
    // Add border line
    headerChildren.push(new Paragraph({
      border: {
        bottom: {
          color: '000000',
          space: 1,
          style: BorderStyle.SINGLE,
          size: 12,
        },
      },
      spacing: { after: 240 },
    }));
  }

  // Build title and number
  const titleParagraphs: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({
        text: jenisSurat.templateJudul || jenisSurat.label.toUpperCase(),
        bold: true,
        size: 28,
        underline: { type: UnderlineType.SINGLE },
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: `NOMOR : ${formatNomorSurat(
          surat.nomorSurat,
          surat.bulan,
          surat.tahun,
          settings.nomorSuratFormat
        )}`,
        bold: true,
        size: 24,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
    }),
  ];

  // Build content from template
  const contentParagraphs = parseTemplateContent(jenisSurat.templateIsi, surat, kabupaten, settings);

  // Build signature
  const signatureParagraphs: Paragraph[] = [];
  const kepala = settings.kepalaMadrasah.find(k => k.id === surat.kepalaMadrasahId);
  
  if (kepala) {
    const showKepalaNama = jenisSurat.extraFields?.showKepalaNama === 'true';
    const showKepalaNip = jenisSurat.extraFields?.showKepalaNip === 'true';
    const showTtd = showKepalaNama || showKepalaNip;
    
    if (showTtd) {
      const cityForTtd = kabupaten ? kabupaten.replace(/^(Kota|Kabupaten)\s+/i, '').trim() : 'Langsa';
      const suratDate = surat.createdAt ? new Date(surat.createdAt) : new Date();
      const formattedDate = `${String(suratDate.getDate()).padStart(2,'0')} ${['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][suratDate.getMonth()]} ${suratDate.getFullYear()}`;

      signatureParagraphs.push(new Paragraph({ spacing: { before: 480 } }));
      signatureParagraphs.push(new Paragraph({
        children: [new TextRun({ text: `${cityForTtd}, ${formattedDate}` })],
        alignment: AlignmentType.RIGHT,
        indent: { left: 4320 }, // ~7.5cm
      }));
      signatureParagraphs.push(new Paragraph({
        children: [new TextRun({ text: 'Kepala Madrasah,' })],
        alignment: AlignmentType.RIGHT,
        indent: { left: 4320 },
      }));
      signatureParagraphs.push(new Paragraph({ spacing: { before: 720 } })); // Space for signature
      
      if (jenisSurat.signatureImageUrl) {
        // Would need ImageRun for actual signature image
        signatureParagraphs.push(new Paragraph({
          children: [new TextRun({ text: '[Tanda Tangan]' })],
          alignment: AlignmentType.RIGHT,
          indent: { left: 4320 },
        }));
      }
      
      if (showKepalaNama) {
        signatureParagraphs.push(new Paragraph({
          children: [new TextRun({ text: kepala.nama, bold: true })],
          alignment: AlignmentType.RIGHT,
          indent: { left: 4320 },
        }));
      }
      
      if (showKepalaNip && kepala.nip && !jenisSurat.signatureImageUrl) {
        signatureParagraphs.push(new Paragraph({
          children: [new TextRun({ text: `NIP. ${kepala.nip}` })],
          alignment: AlignmentType.RIGHT,
          indent: { left: 4320 },
        }));
      }
    }
  }

  // Combine all sections
  const allChildren = [
    ...headerChildren,
    ...titleParagraphs,
    ...contentParagraphs,
    ...signatureParagraphs,
  ];

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
          },
          size: {
            orientation: PageOrientation.PORTRAIT,
          },
        },
      },
      children: allChildren,
    }],
  });

  return Packer.toBlob(doc);
}

/**
 * Parse template content and inject biodata
 */
function parseTemplateContent(
  template: string,
  surat: Surat,
  kabupaten: string,
  settings: AppSettings
): (Paragraph | Table)[] {

  if (!template) return [];

  // Inject biodata
  let content = template
    .replace(/\{nama\}/gi, surat.nama.toUpperCase())
    .replace(/\{tempat_lahir\}/gi, surat.tempatLahir)
    .replace(/\{tanggal_lahir\}/gi, formatIndonesianDate(surat.tanggalLahir))
    .replace(/\{jenis_kelamin\}/gi, surat.jenisKelamin)
    .replace(/\{kelas\}/gi, () => {
      const opt = KELAS_OPTIONS.find(o => o.value === surat.kelas);
      return opt ? opt.label : surat.kelas;
    })
    .replace(/\{no_induk\}/gi, surat.noInduk)
    .replace(/\{nisn\}/gi, surat.nisn)
    .replace(/\{nama_orang_tua\}/gi, surat.namaOrangTua)
    .replace(/\{alamat\}/gi, surat.alamat)
    .replace(/\{tahun_ajaran\}/gi, surat.tahunAjaran)
    .replace(/\{kabupaten\}/gi, kabupaten);

  // Inject custom biodata
  for (const field of (settings.customBiodata || [])) {
    const regex = new RegExp(field.placeholder.replace(/[{}]/g, '\\$&'), 'gi');
    content = content.replace(regex, (surat.extraFields || {})[field.key] || '');
  }

  // Convert HTML to paragraphs (simplified)
  return htmlToDocxParagraphs(content);
}

/**
 * Convert simple HTML to DOCX paragraphs
 */
function htmlToDocxParagraphs(html: string): (Paragraph | Table)[] {

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const paragraphs: (Paragraph | Table)[] = [];


  const processNode = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text })],
        }));
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      
      switch (el.tagName.toLowerCase()) {
        case 'p':
        case 'div':
          const runs: TextRun[] = [];
          processInlineElements(el, runs);
          paragraphs.push(new Paragraph({
            children: runs,
            alignment: getAlignmentFromStyle(el.style.textAlign),
            spacing: { line: 360, after: 120 },
          }));
          break;
          
        case 'br':
          paragraphs.push(new Paragraph({ children: [] }));
          break;
          
        case 'table':
          // Simplified table handling
          const tableRows: TableRow[] = [];
          el.querySelectorAll('tr').forEach(tr => {
            const cells: TableCell[] = [];
            tr.querySelectorAll('td, th').forEach(td => {
              const cellRuns: TextRun[] = [];
              processInlineElements(td as HTMLElement, cellRuns);

              cells.push(new TableCell({
                children: [new Paragraph({ children: cellRuns })],
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                  left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                  right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                },
              }));
            });
            if (cells.length > 0) {
              tableRows.push(new TableRow({ children: cells }));
            }
          });
          
          if (tableRows.length > 0) {
            paragraphs.push(new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }));
          }
          break;
          
        default:
          // Process children
          Array.from(node.childNodes).forEach(processNode);
      }
    }
  };

  Array.from(doc.body.childNodes).forEach(processNode);
  
  return paragraphs.length > 0 ? paragraphs : [new Paragraph({ children: [] })];
}

/**
 * Process inline elements (span, b, i, u, etc.)
 */
function processInlineElements(el: HTMLElement, runs: TextRun[]): void {
  Array.from(el.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text) {
        runs.push(new TextRun({ text }));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const childEl = node as HTMLElement;
      const options: Record<string, unknown> = {};
      
      switch (childEl.tagName.toLowerCase()) {
        case 'b':
        case 'strong':
          options.bold = true;
          break;
        case 'i':
        case 'em':
          options.italics = true;
          break;
        case 'u':
          options.underline = { type: UnderlineType.SINGLE };
          break;
        case 'span':
          // Handle inline styles
          if (childEl.style.fontSize) {
            const size = parseInt(childEl.style.fontSize, 10);
            if (!isNaN(size)) options.size = size * 2;
          }
          break;
      }
      
      const text = childEl.textContent || '';
      if (text) {
        runs.push(new TextRun({ ...options, text } as any));
      }
    }
  });
}

/**
 * Get alignment from CSS style
 */
function getAlignmentFromStyle(textAlign: string) {
  switch (textAlign) {
    case 'left': return AlignmentType.LEFT;
    case 'center': return AlignmentType.CENTER;
    case 'right': return AlignmentType.RIGHT;
    case 'justify': return AlignmentType.JUSTIFIED;
    default: return AlignmentType.JUSTIFIED;
  }
}

/**
 * Format Indonesian date
 */
function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${String(parseInt(parts[2])).padStart(2,'0')} ${months[parseInt(parts[1])-1] || ''} ${parts[0]}`;
}

/**
 * Download DOCX blob
 */
export function downloadDocx(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
