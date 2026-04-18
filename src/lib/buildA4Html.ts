/**
 * buildA4Html
 * -----------
 * Captures the live #a4-print-area DOM, inlines ALL computed text colors
 * (so Tailwind classes like text-black don't need to be loaded in the
 * print window), resets the transform scale, and produces a complete
 * standalone HTML document ready for Electron's printToPDF / print().
 */

export async function buildA4Html(): Promise<string | null> {
  const area = document.getElementById('a4-print-area') as HTMLElement | null;
  if (!area) return null;

  // ── 1. Remove scale transform so layout is at true A4 size ──────────────
  const saved = {
    transform:       area.style.transform,
    transition:      area.style.transition,
    transformOrigin: area.style.transformOrigin,
    width:           area.style.width,
    minHeight:       area.style.minHeight,
    maxHeight:       area.style.maxHeight,
    maxWidth:        area.style.maxWidth,
  };

  area.style.transform       = 'none';
  area.style.transition      = 'none';
  area.style.transformOrigin = 'top left';
  area.style.width           = '210mm';
  area.style.minHeight       = '297mm';
  area.style.maxHeight       = 'none';
  area.style.maxWidth        = 'none';

  // Let the browser reflow with no transform
  await new Promise(r => setTimeout(r, 80));

  // ── 2. Inline computed color on every element before cloning ────────────
  // Tailwind classes (text-black, etc.) won't be available in the standalone
  // print window — we must bake the computed colors into inline styles now.
  const allEls = Array.from(area.querySelectorAll('*')) as HTMLElement[];
  allEls.unshift(area);
  const savedColors: Array<{ el: HTMLElement; color: string }> = [];

  allEls.forEach(el => {
    const computed = window.getComputedStyle(el);
    const color = computed.color; // e.g. "rgb(0, 0, 0)"
    savedColors.push({ el, color: el.style.color });
    // Only override if the element doesn't already have an explicit inline color
    // AND the computed color is not already black
    if (!el.style.color) {
      el.style.color = '#000000';
    }
  });

  // ── 3. Deep clone ────────────────────────────────────────────────────────
  const clone = area.cloneNode(true) as HTMLElement;

  // ── 4. Restore live element ──────────────────────────────────────────────
  Object.assign(area.style, saved);
  // Restore individual element colors
  savedColors.forEach(({ el, color }) => { el.style.color = color; });

  // ── 5. Fix clone root styles ─────────────────────────────────────────────
  clone.style.transform       = 'none';
  clone.style.transformOrigin = 'top left';
  clone.style.transition      = 'none';
  clone.style.width           = '210mm';
  clone.style.minHeight       = '297mm';
  clone.style.maxHeight       = 'none';
  clone.style.maxWidth        = 'none';
  clone.style.boxSizing       = 'border-box';
  clone.style.color           = '#000000';
  clone.style.background      = '#ffffff';
  clone.style.fontFamily      = "'Times New Roman', Times, serif";

  // Remove Tailwind/utility classes that won't resolve in standalone HTML
  clone.removeAttribute('class');
  // Also remove class from all children that might have Tailwind classes
  Array.from(clone.querySelectorAll('[class]')).forEach(el => {
    // Keep class only if it's used by our own CSS (underline-with-gap, logo)
    const cls = el.getAttribute('class') || '';
    const keep = cls.split(' ').filter(c =>
      c === 'underline-with-gap' || c === 'logo'
    ).join(' ');
    if (keep) el.setAttribute('class', keep);
    else el.removeAttribute('class');
  });

  // ── 6. Inline every <img> as base64 ─────────────────────────────────────
  const imgs = Array.from(clone.querySelectorAll('img')) as HTMLImageElement[];
  await Promise.all(imgs.map(async img => {
    const src = img.getAttribute('src') || '';
    if (!src || src.startsWith('data:')) return;
    try {
      const dataUrl = await fetchAsDataUrl(src);
      img.setAttribute('src', dataUrl);
    } catch { /* leave as-is */ }
  }));

  const innerHtml = clone.outerHTML;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      color: #000 !important;
    }

    @page { size: 210mm 297mm; margin: 0; }

    /* Explicitly prevent any print-specific hiding of text (doc recommendation) */
    @media print {
      body * { visibility: visible !important; }
      body   { zoom: 100%; transform: none !important; }
    }

    html, body {
      width: 210mm;
      height: 297mm;
      background: #fff;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
    }

    #a4-print-area {
      width: 210mm !important;
      min-height: 297mm !important;
      max-height: none !important;
      max-width: none !important;
      padding-top: 4.2mm !important;
      padding-bottom: 25.4mm !important;
      padding-left: 25.4mm !important;
      padding-right: 25.4mm !important;
      font-family: 'Times New Roman', Times, serif !important;
      font-size: 12pt !important;
      line-height: 1.5 !important;
      color: #000 !important;
      background: #fff !important;
      transform: none !important;
      box-sizing: border-box !important;
    }

    /* Every element: force black text, white background */
    #a4-print-area * {
      color: #000 !important;
    }

    #a4-print-area img.logo,
    #a4-print-area img[alt="Logo"] {
      width: 22mm !important;
      height: 22mm !important;
      min-width: 22mm !important;
      max-width: 22mm !important;
      object-fit: contain !important;
      flex-shrink: 0 !important;
    }

    #a4-print-area [style*="border-bottom"] {
      border-bottom: 3px solid #000 !important;
    }

    .underline-with-gap { position: relative; display: inline-block; }
    .underline-with-gap::after {
      content: ''; position: absolute;
      left: 0; right: 0; bottom: -3px;
      height: 1.5px; background: #000; border-radius: 1px;
    }

    #a4-isi-content p   { margin-top: 0; margin-bottom: 0; min-height: 1.5em; line-height: 1.5; font-family: 'Times New Roman', Times, serif; font-size: 12pt; text-align: justify; word-break: break-word; }
    #a4-isi-content div { margin-top: 0; margin-bottom: 0; line-height: 1.5; font-family: 'Times New Roman', Times, serif; font-size: 12pt; text-align: justify; }
    #a4-isi-content br  { line-height: 1.5; }
    #a4-isi-content *   { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #000 !important; }
    #a4-isi-content .tab-indent,
    #a4-isi-content span[style*="width:2cm"] { display: inline-block !important; width: 2cm !important; min-width: 2cm !important; max-width: 2cm !important; white-space: pre; overflow: hidden; vertical-align: baseline; }
    #a4-isi-content span[style*="min-width:10cm"] { display: inline-block !important; min-width: 10cm !important; }
    b, strong { font-weight: bold !important; }
    u { text-decoration: underline !important; }
    i, em { font-style: italic !important; }
  </style>
</head>
<body style="color:#000;background:#fff;">
  ${innerHtml}
</body>
</html>`;
}

async function fetchAsDataUrl(src: string): Promise<string> {
  const res  = await fetch(src);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
