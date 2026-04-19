import { useApp } from '@/contexts/AppContext';
import { Surat, JenisSurat, formatNomorSurat, KELAS_OPTIONS } from '@/lib/store';
import kemnogLogo from '@/assets/kemenag-logo.png';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

const underlineWithGapStyle = `
.underline-with-gap { position: relative; display: inline-block; }
.underline-with-gap::after {
  content: ''; position: absolute;
  left: 0; right: 0; bottom: -3px;
  height: 1.5px; background: currentColor; border-radius: 1px;
}
@media print { .underline-with-gap::after { background: #000 !important; } }
`;

function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${String(parseInt(parts[2])).padStart(2,'0')} ${months[parseInt(parts[1])-1] || ''} ${parts[0]}`;
}

import type { JenisSuratHeader } from '@/lib/store';

interface A4PreviewProps {
  surat: Surat;
  jenisSurat: JenisSurat;
}

function getEffectiveHeader(
  jenisSuratHeader: JenisSuratHeader | undefined,
  globalHeader: any,
  globalSettings: any
): any {
  if (jenisSuratHeader && !jenisSuratHeader.useGlobalHeader) {
    // Per-surat custom header takes priority
    const customMode = jenisSuratHeader.customHeaderMode || 'text';
    if (customMode === 'image' && jenisSuratHeader.customHeaderImageUrl) {
      return {
        ...globalHeader,
        headerMode: 'image' as const,
        headerImageUrl: jenisSuratHeader.customHeaderImageUrl,
      };
    } else {
      // Text mode with custom fields
      return {
        headerMode: 'text' as const,
        line1: jenisSuratHeader.customLine1 || '',
        line2: jenisSuratHeader.customLine2 || '',
        school: jenisSuratHeader.customSchool || '',
        address: jenisSuratHeader.customAddress || '',
        contact: jenisSuratHeader.customContact || '',
        logoUrl: jenisSuratHeader.customLogoUrl || globalSettings.customKemenagLogo || '',
        logoSize: (jenisSuratHeader.customLogoSize || 22),
        line1Size: jenisSuratHeader.customLine1Size || 16,
        line2Size: jenisSuratHeader.customLine2Size || 14,
        schoolSize: jenisSuratHeader.customSchoolSize || 12,
        addressSize: jenisSuratHeader.customAddressSize || 11,
        contactSize: jenisSuratHeader.customContactSize || 11,
      };
    }
  }
  // Fallback to global
  return globalHeader;
}


// ── DOCX renderer — converts base64 docx → HTML via mammoth, then injects biodata ──
function useDocxHtml(jenisSurat: JenisSurat, surat: Surat, kabupaten: string, customBiodata: any[]) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevBase64 = useRef<string | null>(null);

  const convert = useCallback(async (base64: string) => {
    setLoading(true);
    setError(null);
    try {
      const mammoth = await import('mammoth');
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
      let converted = result.value;

      // Inject biodata placeholders into converted HTML
      converted = converted
        .replace(/\{nama\}/gi, '<b>' + surat.nama.toUpperCase() + '</b>')
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

      for (const field of customBiodata) {
        const regex = new RegExp(field.placeholder.replace(/[{}]/g, '\\$&'), 'gi');
        converted = converted.replace(regex, (surat.extraFields || {})[field.key] || '');
      }

      setHtml(converted);
    } catch (e: any) {
      setError('Gagal memuat DOCX: ' + e.message);
      setHtml(null);
    } finally {
      setLoading(false);
    }
  }, [surat, kabupaten, customBiodata]);

  useEffect(() => {
    const base64 = jenisSurat.templateDocxBase64;
    if (!base64) { setHtml(null); return; }
    // Re-convert only if base64 changed
    if (base64 === prevBase64.current) return;
    prevBase64.current = base64;
    convert(base64);
  }, [jenisSurat.templateDocxBase64, convert]);

  return { html, loading, error };
}

export function A4Preview({ surat, jenisSurat }: A4PreviewProps) {
  const { data } = useApp();
  

  // Use per-surat signature override if available
  const effectiveKepalaId = jenisSurat.signatureKepalaMadrasahId || surat.kepalaMadrasahId;
  const kepala = data.settings.kepalaMadrasah.find(k => k.id === effectiveKepalaId);
  
  // Kepala madrasah visibility from wizard checkboxes
  const showKepalaNama = jenisSurat.extraFields?.showKepalaNama === 'true';
  const showKepalaNip = jenisSurat.extraFields?.showKepalaNip === 'true';
  const showTtd = showKepalaNama || showKepalaNip;
  
  const hasSignatureImage = !!jenisSurat.signatureImageUrl;

  
  // Determine effective header: per-surat custom > global
  const globalHeader = data.settings.suratHeader;
  const jenisHeader = jenisSurat.jenisSuratHeader;
  const h = getEffectiveHeader(jenisHeader, globalHeader, data.settings);

  const kabupaten = data.settings.kabupaten || '';
  const customBiodata = data.settings.customBiodata || [];

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const A4_WIDTH = 794;
      const A4_HEIGHT = 1123;
      const padding = 32;
      const availableWidth = wrapper.offsetWidth - padding;
      const availableHeight = wrapper.offsetHeight - padding;
      const scaleW = availableWidth / A4_WIDTH;
      const scaleH = availableHeight / A4_HEIGHT;
      const newScale = Math.min(1, scaleW, scaleH);
      setScale(newScale > 0 ? newScale : 1);
    }
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // DOCX mode: convert base64 → HTML
  const hasDocx = !!jenisSurat.templateDocxBase64;
  const { html: docxHtml, loading: docxLoading, error: docxError } = useDocxHtml(
    jenisSurat, surat, kabupaten, customBiodata
  );

  // HTML template mode (legacy / fallback)
  const parseTemplate = (template: string) => {
    let result = template
      .replace(/\{nama\}/gi, '<b>' + surat.nama.toUpperCase() + '</b>')
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
    for (const field of customBiodata) {
      const regex = new RegExp(field.placeholder.replace(/[{}]/g, '\\$&'), 'gi');
      result = result.replace(regex, (surat.extraFields || {})[field.key] || '');
    }
    return result;
  };

  const parsedIsi = hasDocx ? (docxHtml || '') : parseTemplate(jenisSurat.templateIsi);
  const logoSrc = h.logoUrl || (data.settings.customKemenagLogo || kemnogLogo);
  const cityForTtd = kabupaten ? kabupaten.replace(/^(Kota|Kabupaten)\s+/i, '').trim() : 'Langsa';
  const suratDate = surat.createdAt ? new Date(surat.createdAt) : new Date();
  const formattedDate = `${String(suratDate.getDate()).padStart(2,'0')} ${['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][suratDate.getMonth()]} ${suratDate.getFullYear()}`;

  return (
    <>
      <style>{underlineWithGapStyle}</style>
      <div
        ref={wrapperRef}
        style={{
          width: '100%', height: '100%', minHeight: 500, minWidth: 350,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          overflow: 'auto', background: '#f3f4f600', position: 'relative',
        }}
      >
        <div style={{ width: 794, height: 1123, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div
            id="a4-print-area"
            className="bg-white text-black shadow-lg mx-auto"
            style={{
              width: '210mm', minHeight: '297mm', maxWidth: '210mm', maxHeight: '297mm',
              paddingTop: '4.2mm', paddingBottom: '25.4mm', paddingLeft: '25.4mm', paddingRight: '25.4mm',
              fontFamily: "'Times New Roman', serif", fontSize: '12pt', lineHeight: '1.0',
              boxSizing: 'border-box', color: '#000000', background: '#ffffff',
              transform: `scale(${scale})`, transformOrigin: 'top center', transition: 'transform 0.3s',
            }}
          >
            {/* Header / KOP */}
            <div style={{ borderBottom: '3px solid black', paddingBottom: '10px', marginBottom: '24px' }}>
              {h.headerMode === 'image' && h.headerImageUrl ? (
                <img src={h.headerImageUrl} alt="Header KOP" style={{ width: '100%', display: 'block' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                  {logoSrc && (
                    <img 
                      src={logoSrc} 
                      alt="Logo" 
                      className="logo"
                      style={{ 
                        width: `${h.logoSize || 22}mm`, 
                        height: `${h.logoSize || 22}mm`, 
                        minWidth: `${h.logoSize || 22}mm`, 
                        maxWidth: `${h.logoSize || 22}mm`, 
                        objectFit: 'contain', 
                        flexShrink: 0 
                      }}
                    />
                  )}
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    {h.line1 && <div style={{ fontSize: `${h.line1Size||16}pt`, fontWeight: 'bold', lineHeight: '1.2', margin: 0, padding: 0 }}>{h.line1}</div>}
                    {h.line2 && <div style={{ fontSize: `${h.line2Size||14}pt`, fontWeight: 'bold', lineHeight: '1.2', margin: 0, padding: 0 }}>{h.line2}</div>}
                    {h.school && <div style={{ fontSize: `${h.schoolSize||12}pt`, fontWeight: 'bold', lineHeight: '1.2', margin: 0, padding: 0 }}>{h.school}</div>}
                    {(h.address || h.contact) && <div style={{ fontSize: `${h.addressSize||11}pt`, lineHeight: '1.2', margin: 0, padding: 0 }}>{h.address}{h.contact ? ` ${h.contact}` : ''}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* DOCX mode: render full docx content (includes its own title/nomor/body/TTD) */}
            {hasDocx ? (
              <>
                {docxLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888', fontSize: '11pt', padding: '20px 0' }}>
                    <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                    Memuat dokumen...
                  </div>
                )}
                {docxError && (
                  <div style={{ color: '#e11d48', fontSize: '11pt', padding: '12px 0' }}>{docxError}</div>
                )}
                {!docxLoading && !docxError && (
                  <>
                    <style>{`
                      #a4-docx-content { font-family:'Times New Roman',Times,serif; font-size:12pt; line-height:1.5; color:#000; }
                      #a4-docx-content p { margin-top:0; margin-bottom:0; line-height:1.5; font-family:'Times New Roman',Times,serif; font-size:12pt; color:#000; text-align:justify; min-height:1.5em; }
                      #a4-docx-content table { border-collapse:collapse; width:100%; }
                      #a4-docx-content td, #a4-docx-content th { border:1px solid #000; padding:2px 4px; font-family:'Times New Roman',Times,serif; font-size:12pt; }
                      #a4-docx-content b, #a4-docx-content strong { font-weight:bold !important; }
                      #a4-docx-content i, #a4-docx-content em { font-style:italic !important; }
                      #a4-docx-content u { text-decoration:underline !important; }
                      #a4-docx-content * { color:#000 !important; }
                      @keyframes spin { to { transform: rotate(360deg); } }
                    `}</style>
                    <div id="a4-docx-content" dangerouslySetInnerHTML={{ __html: parsedIsi }} />
                  </>
                )}
              </>
            ) : (
              /* Legacy HTML template mode */
              <>
                {/* Judul */}
                <div style={{ textAlign: 'center', marginBottom: '6px', marginTop: '12px' }}>
                  <div style={{ fontWeight: 'bold', textDecoration: 'underline', fontSize: '14pt', textUnderlineOffset: '4px' }}>
                    {jenisSurat.templateJudul || jenisSurat.label.toUpperCase()}
                  </div>
                </div>
                {/* Nomor */}
                <div style={{ textAlign: 'center', marginTop: '0', marginBottom: '36px', fontSize: '12pt', fontWeight: 'bold', lineHeight: '1.0' }}>
                  NOMOR : {(() => {
                    const fallbackDate = surat.createdAt ? new Date(surat.createdAt) : new Date();
                    const bulan = surat.bulan || (fallbackDate.getMonth() + 1);
                    const tahun = surat.tahun || fallbackDate.getFullYear();
                    return formatNomorSurat(surat.nomorSurat, bulan, tahun, data.settings.nomorSuratFormat);
                  })()}
                </div>
                {/* Isi */}
                <style>{`
                  #a4-isi-content { font-family:'Times New Roman',Times,serif; font-size:12pt; line-height:1.5; color:#000; text-align:justify; word-break:break-word; }
                  #a4-isi-content p { margin-top:0; margin-bottom:0; line-height:1.5; font-family:'Times New Roman',Times,serif; font-size:12pt; color:#000 !important; text-align:justify; min-height:1.5em; }
                  #a4-isi-content div { margin-top:0; margin-bottom:0; line-height:1.5; font-family:'Times New Roman',Times,serif; font-size:12pt; color:#000 !important; text-align:justify; }
                  #a4-isi-content br { line-height:1.5; }
                  #a4-isi-content .tab-indent, #a4-isi-content span[style*="width:2cm"] { display:inline-block !important; width:2cm !important; min-width:2cm !important; max-width:2cm !important; overflow:hidden !important; white-space:pre; vertical-align:baseline; }
                  #a4-isi-content span[style*="min-width:10cm"] { display:inline-block !important; min-width:10cm !important; font-family:'Times New Roman',Times,serif !important; font-size:12pt !important; }
                  #a4-isi-content * { color:#000 !important; font-family:'Times New Roman',Times,serif; font-size:12pt; line-height:1.5; }
                  #a4-isi-content b, #a4-isi-content strong { font-weight:bold !important; }
                  #a4-isi-content i, #a4-isi-content em { font-style:italic !important; }
                  #a4-isi-content u { text-decoration:underline !important; }
                `}</style>
                <div id="a4-isi-content" style={{ textAlign: 'justify' }} dangerouslySetInnerHTML={{ __html: parsedIsi }} />
                {/* TTD - conditional based on wizard checkboxes */}
                {kepala && showTtd && (
                  <div style={{ marginTop: '40px', paddingLeft: '100mm' }}>
                    <div>{cityForTtd}, {formattedDate}</div>
                    <div>Kepala Madrasah,</div>
                    {hasSignatureImage ? (
                      <div style={{ marginTop: '60px' }}>
                        <img 
                          src={jenisSurat.signatureImageUrl!} 
                          alt="Tanda Tangan" 
                          style={{ 
                            height: '60px', 
                            width: 'auto', 
                            maxWidth: '120px',
                            verticalAlign: 'bottom'
                          }} 
                        />
                        {showKepalaNama && <div style={{ fontWeight: 'bold', marginTop: '8px' }}>{kepala.nama}</div>}
                      </div>
                    ) : (
                      <div style={{ marginTop: '60px', fontWeight: 'bold', display: 'inline-block', position: 'relative', minWidth: '120px', marginBottom: showKepalaNip ? '4px' : '3px' }}>
                        {showKepalaNama ? (
                          <span style={{ display: 'inline-block', borderBottom: '1px solid black', paddingBottom: '2px' }}>{kepala.nama}</span>
                        ) : '_____________________'}
                      </div>
                    )}
                    {showKepalaNip && kepala.nip && !hasSignatureImage && <div style={{ marginTop: '2px' }}>NIP. {kepala.nip}</div>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
