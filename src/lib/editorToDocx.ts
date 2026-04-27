/**
 * Convert TipTap editor content to DOCX format
 * Handles TipTap JSON/HTML → Office Open XML conversion
 */

import {
  Document, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Packer, PageOrientation, convertInchesToTwip, UnderlineType,
  Header, Footer, PageNumber,
} from 'docx';
import type { DocxExportOptions } from './store';
import { DEFAULT_DOCX_OPTIONS } from './store';

// TipTap node types
interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  text?: string;
  marks?: Array<{
    type: string;
    attrs?: Record<string, unknown>;
  }>;
}

interface TipTapDoc {
  type: 'doc';
  content: TipTapNode[];
}

/**
 * Convert TipTap JSON document to DOCX Blob
 */
export async function tipTapToDocx(
  json: TipTapDoc | string,
  options: Partial<DocxExportOptions> = {}
): Promise<Blob> {
  const doc = typeof json === 'string' ? JSON.parse(json) : json;
  const opts = { ...DEFAULT_DOCX_OPTIONS, ...options };

  const paragraphs = doc.content.flatMap(node => convertNode(node));

  const document = new Document({
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
      children: paragraphs,
    }],
  });

  return Packer.toBlob(document);
}

/**
 * Convert a single TipTap node to DOCX elements
 */
function convertNode(node: TipTapNode): Paragraph[] {
  switch (node.type) {
    case 'paragraph':
      return [convertParagraph(node)];
    case 'heading':
      return [convertHeading(node)];
    case 'bulletList':
    case 'orderedList':
      return convertList(node);
    case 'horizontalRule':
      return [new Paragraph({ text: '─────────────────' })];
    case 'hardBreak':
      return [new Paragraph({ children: [] })];
    default:
      if (node.content) {
        return node.content.flatMap(child => convertNode(child));
      }
      return [];
  }
}

/**
 * Convert paragraph node
 */
function convertParagraph(node: TipTapNode): Paragraph {
  const alignment = getAlignment(node.attrs?.textAlign as string);

  return new Paragraph({
    children: convertInlineContent(node.content || []),
    alignment,
    spacing: { line: 360, after: 120 },
  });
}

/**
 * Convert heading node
 */
function convertHeading(node: TipTapNode): Paragraph {
  const level = (node.attrs?.level as number) || 1;
  const headingMap = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6,
  };

  return new Paragraph({
    children: convertInlineContent(node.content || []),
    heading: headingMap[level as keyof typeof headingMap] || HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
  });
}


/**
 * Convert list nodes
 */
function convertList(node: TipTapNode): Paragraph[] {
  const isOrdered = node.type === 'orderedList';
  const paragraphs: Paragraph[] = [];

  (node.content || []).forEach((item, index) => {
    if (item.type === 'listItem' && item.content) {
      item.content.forEach(child => {
        if (child.type === 'paragraph') {
          const runs = convertInlineContent(child.content || []);
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({
                text: isOrdered ? `${index + 1}. ` : '• ',
                bold: true,
              }),
              ...runs,
            ],
            indent: { left: 720 },
            spacing: { after: 60 },
          }));
        }
      });
    }
  });

  return paragraphs;
}


/**
 * Convert inline content (text with marks)
 */
function convertInlineContent(content: TipTapNode[]): TextRun[] {
  const runs: TextRun[] = [];

  for (const node of content) {
    if (node.type === 'text' && node.text !== undefined) {
      const marks = node.marks || [];
      const options: Record<string, unknown> = { text: node.text };

      for (const mark of marks) {
        switch (mark.type) {
          case 'bold':
            options.bold = true;
            break;
          case 'italic':
            options.italics = true;
            break;
          case 'underline':
            options.underline = { type: UnderlineType.SINGLE };
            break;
          case 'strike':
            options.strike = true;
            break;
          case 'link':
            // Links are not directly supported in DOCX via docx library
            // We could add them as styled text
            options.color = '0563C1';
            options.underline = { type: UnderlineType.SINGLE };
            break;
          case 'superscript':
            options.superScript = true;
            break;
          case 'subscript':
            options.subScript = true;
            break;
          case 'textStyle':
            if (mark.attrs?.fontSize) {
              options.size = parseFontSize(mark.attrs.fontSize as string);
            }
            if (mark.attrs?.fontFamily) {
              options.font = mark.attrs.fontFamily as string;
            }
            break;
          case 'fontSize':
            if (mark.attrs?.fontSize) {
              options.size = parseFontSize(mark.attrs.fontSize as string);
            }
            break;
        }
      }

      runs.push(new TextRun(options as any));
    } else if (node.type === 'hardBreak') {
      runs.push(new TextRun({ text: '', break: 1 }));
    }
  }

  return runs;
}

/**
 * Parse font size string (e.g., "12pt", "14px") to half-points
 */
function parseFontSize(sizeStr: string): number {
  const match = sizeStr.match(/^(\d+)/);
  if (!match) return 24; // Default 12pt
  const size = parseInt(match[1], 10);
  return size * 2; // Convert to half-points
}

/**
 * Get alignment from textAlign attribute
 */
function getAlignment(align?: string) {
  switch (align) {
    case 'left': return AlignmentType.LEFT;
    case 'center': return AlignmentType.CENTER;
    case 'right': return AlignmentType.RIGHT;
    case 'justify': return AlignmentType.JUSTIFIED;
    default: return undefined;
  }
}


/**
 * Download TipTap content as DOCX file
 */
export async function downloadTipTapAsDocx(
  json: TipTapDoc | string,
  filename: string = 'document.docx'
): Promise<void> {
  const blob = await tipTapToDocx(json, { filename });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
