/**
 * DOCX Builder - Office Open XML document generation utilities
 * Converts XML document structure to DOCX format using the docx library
 */

import {
  Document, Paragraph, TextRun, Table, TableCell, TableRow,
  AlignmentType, HeadingLevel, Packer, PageOrientation,
  convertInchesToTwip, BorderStyle, Header, Footer, ImageRun,
  SectionType, VerticalAlign, WidthType,
} from 'docx';
import type { XmlDocumentNode, DocxExportOptions, Surat, JenisSurat } from './store';
import { DEFAULT_DOCX_OPTIONS } from './store';

/**
 * Convert XML document nodes to DOCX Paragraph or Table elements
 */
function nodesToParagraphs(nodes: XmlDocumentNode[]): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case 'paragraph':
      case 'header':
      case 'body':
        elements.push(...nodeToParagraphs(node));
        break;
      case 'text':
        elements.push(new Paragraph({
          children: [new TextRun({ text: node.text || '' })],
        }));
        break;
      case 'table':
        elements.push(nodeToTable(node));
        break;
      default:
        // Recursively process children
        if (node.children) {
          elements.push(...nodesToParagraphs(node.children));
        }
    }
  }

  return elements;
}

/**
 * Convert a single XML node to DOCX paragraphs or tables
 */
function nodeToParagraphs(node: XmlDocumentNode): (Paragraph | Table)[] {
  if (node.type === 'text') {
    return [new Paragraph({
      children: [new TextRun({ text: node.text || '' })],
    })];
  }

  if (node.children) {
    const children = node.children.flatMap(child => nodeToParagraphs(child));
    return children;
  }

  return [];
}

/**
 * Convert XML table node to DOCX Table
 */
function nodeToTable(node: XmlDocumentNode): Table {
  if (!node.children) {

    return new Table({
      rows: [],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });
  }


  const rows: TableRow[] = [];
  for (const child of node.children) {
    if (child.type === 'tableRow' && child.children) {
      const cells: TableCell[] = [];
      for (const cell of child.children) {
        if (cell.type === 'tableCell') {
          const cellParagraphs = cell.children ? nodesToParagraphs(cell.children) : [];
          cells.push(new TableCell({
            children: cellParagraphs.length > 0 ? cellParagraphs : [new Paragraph({ children: [] })],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            },
          }));
        }
      }
      rows.push(new TableRow({ children: cells }));
    }
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

/**
 * Build a DOCX document from XML nodes
 */
export async function buildDocxFromXml(
  nodes: XmlDocumentNode[],
  options: Partial<DocxExportOptions> = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_DOCX_OPTIONS, ...options };

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: opts.margins?.top || convertInchesToTwip(1),
            right: opts.margins?.right || convertInchesToTwip(1),
            bottom: opts.margins?.bottom || convertInchesToTwip(1),
            left: opts.margins?.left || convertInchesToTwip(1),
          },
          size: {
            orientation: opts.orientation === 'landscape'
              ? PageOrientation.LANDSCAPE
              : PageOrientation.PORTRAIT,
          },
        },
      },
      children: nodesToParagraphs(nodes),
    }],
  });

  return Packer.toBlob(doc);
}

/**
 * Build a DOCX document for a Surat (letter)
 */
export async function buildSuratDocx(
  surat: Surat,
  jenisSurat: JenisSurat,
  contentXml?: string
): Promise<Blob> {
  // If DOCX template exists, decode and modify it
  if (jenisSurat.templateDocxBase64) {
    try {
      const byteString = atob(jenisSurat.templateDocxBase64);
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        bytes[i] = byteString.charCodeAt(i);
      }
      return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    } catch {
      // Fall through to generate from XML
    }
  }

  // Generate from XML content or fallback
  let nodes: XmlDocumentNode[] = [];
  if (contentXml) {
    try {
      nodes = parseXmlContent(contentXml);
    } catch {
      // Fall through to empty document
    }
  }

  return buildDocxFromXml(nodes, {
    filename: `${surat.nama || 'surat'}.docx`,
  });
}

/**
 * Parse XML content string to document nodes
 */
function parseXmlContent(xml: string): XmlDocumentNode[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const root = doc.documentElement;

  return Array.from(root.childNodes)
    .map(node => domNodeToXmlNode(node))
    .filter(Boolean) as XmlDocumentNode[];
}

/**
 * Convert DOM node to XML document node
 */
function domNodeToXmlNode(node: Node): XmlDocumentNode | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim();
    if (!text) return null;
    return { type: 'text', text };
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const children = Array.from(el.childNodes)
      .map(domNodeToXmlNode)
      .filter(Boolean) as XmlDocumentNode[];

    return {
      type: mapElementType(el.tagName),
      children: children.length > 0 ? children : undefined,
      attributes: getElementAttributes(el),
    };
  }

  return null;
}

/**
 * Map XML element tag to document node type
 */
function mapElementType(tag: string): XmlDocumentNode['type'] {
  const mapping: Record<string, XmlDocumentNode['type']> = {
    document: 'document',
    header: 'header',
    body: 'body',
    p: 'paragraph',
    paragraph: 'paragraph',
    span: 'run',
    run: 'run',
    text: 'text',
    table: 'table',
    tr: 'tableRow',
    td: 'tableCell',
    cell: 'tableCell',
    img: 'image',
    image: 'image',
    signature: 'signature',
  };
  return mapping[tag.toLowerCase()] || 'paragraph';
}

/**
 * Get attributes from XML element
 */
function getElementAttributes(el: Element): Record<string, string> | undefined {
  const attrs: Record<string, string> = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    attrs[attr.name] = attr.value;
  }
  return Object.keys(attrs).length > 0 ? attrs : undefined;
}

/**
 * Download a DOCX blob as a file
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

/**
 * Convert base64 DOCX to Blob
 */
export function base64ToDocxBlob(base64: string): Blob {
  const byteString = atob(base64);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

/**
 * Convert Blob to base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Extract text content from DOCX blob for preview
 */
export async function extractDocxText(blob: Blob): Promise<string> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const mammoth = await import('mammoth');
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting DOCX text:', error);
    return '';
  }
}
