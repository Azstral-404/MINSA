import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { A4Preview } from '@/components/A4Preview';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowLeft, MoreVertical, Printer, Trash2, Pencil, FileDown, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { buildA4Docx, downloadDocx } from '@/lib/buildA4Docx';
import { buildA4Html } from '@/lib/buildA4Html';

interface PrinterInfo {
  name: string;
  displayName: string;
  status: number;
  isDefault: boolean;
  description: string;
}

function printerIsReady(status: number): boolean {
  // WMI PrinterStatus: 3=Idle, 4=Printing, 5=Warmup = ready (green)
  // 6=StoppedPrinting, 7=Offline = not ready (red)
  // 0,1,2 = unknown/virtual printers (Print to PDF etc) = treat as ready
  return status !== 6 && status !== 7;
}

function PrinterRow({
  printer, selected, onSelect,
}: {
  printer: PrinterInfo; selected: boolean; onSelect: () => void;
}) {
  const ready = printerIsReady(printer.status);
  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 8,
        border: selected ? '2px solid #4ade80' : '2px solid transparent',
        background: selected ? 'rgba(74,222,128,0.08)' : 'transparent',
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
      }}
    >
      <span style={{
        flexShrink: 0, width: 10, height: 10, borderRadius: '50%',
        background: ready ? '#4ade80' : '#f87171',
        boxShadow: ready ? '0 0 6px rgba(74,222,128,0.7)' : '0 0 6px rgba(248,113,113,0.6)',
        display: 'inline-block',
      }} />
      <Printer style={{ flexShrink: 0, width: 16, height: 16, color: selected ? '#4ade80' : '#94a3b8' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: selected ? 700 : 500,
          color: selected ? '#f1f5f9' : '#cbd5e1',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {printer.displayName || printer.name}
          {printer.isDefault && <span style={{ marginLeft: 6, fontSize: 10, color: '#64748b', fontWeight: 400 }}>(Default)</span>}
        </div>
        <div style={{ fontSize: 11, color: ready ? '#4ade80' : '#f87171', marginTop: 1 }}>
          {ready ? 'Siap' : 'Offline'}
        </div>
      </div>
    </button>
  );
}

const PreviewSurat = () => {
  const { jenisSlug, id } = useParams<{ jenisSlug: string; id: string }>();
  const [searchParams] = useSearchParams();
  const { data, updateData } = useApp();
  const navigate = useNavigate();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [copies, setCopies] = useState<number>(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);

  const jenisSurat = data.settings.jenisSurat.find(j => j.slug === jenisSlug);
  const surat = data.surat.find(s => s.id === id);

  useEffect(() => {
    const action = searchParams.get('action');
    if (!action || !surat) return;
    const timer = setTimeout(async () => {
      if (action === 'print') {
        const auto = sessionStorage.getItem('minsa_print_auto');
        if (auto === '1') {
          // DaftarSurat already collected printer choice — auto-print immediately
          sessionStorage.removeItem('minsa_print_auto');
          await handlePrintAuto();
        } else {
          handleOpenPrintDialog();
        }
      }
      if (action === 'pdf') handleExportPdf();
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, surat]);

  if (!jenisSurat || !surat) {
    return <div className="text-center py-10 text-muted-foreground">Surat tidak ditemukan.</div>;
  }

  const isMasuk = surat.arah === 'masuk';

  const deleteSurat = () => {
    updateData(d => ({ ...d, surat: d.surat.filter(s => s.id !== id) }));
    toast.success('Surat dihapus');
    navigate(`/surat/${jenisSlug}`);
  };

  const loadPrinters = async () => {
    setIsLoadingPrinters(true);
    try {
      if (window.electronAPI?.isElectron) {
        const list: PrinterInfo[] = await window.electronAPI.getPrinters();
        setPrinters(list || []);

        const saved = sessionStorage.getItem('minsa_print_printer');
        const savedCopies = sessionStorage.getItem('minsa_print_copies');
        sessionStorage.removeItem('minsa_print_printer');
        sessionStorage.removeItem('minsa_print_copies');

        if (saved && list.some(p => p.name === saved)) {
          setSelectedPrinter(saved);
        } else {
          const def   = list.find(p => p.isDefault);
          const idle  = list.find(p => printerIsReady(p.status));
          setSelectedPrinter((def ?? idle ?? list[0])?.name ?? '');
        }
        if (savedCopies) setCopies(Math.max(1, parseInt(savedCopies) || 1));
      } else {
        setPrinters([]);
      }
    } catch (err) {
      console.error('loadPrinters:', err);
      setPrinters([]);
    } finally {
      setIsLoadingPrinters(false);
    }
  };

  // ── Auto-print: called when navigated from DaftarSurat with pre-chosen printer ─
  const handlePrintAuto = async () => {
    if (!window.electronAPI?.isElectron) { window.print(); return; }
    const printerName = sessionStorage.getItem('minsa_print_printer') || '';
    const copiesVal   = Math.max(1, parseInt(sessionStorage.getItem('minsa_print_copies') || '1') || 1);
    sessionStorage.removeItem('minsa_print_printer');
    sessionStorage.removeItem('minsa_print_copies');

    toast.loading('Mencetak dokumen…', { id: 'auto-print' });
    try {
      const htmlContent = await buildA4Html();
      if (!htmlContent) { toast.error('Gagal membangun dokumen', { id: 'auto-print' }); return; }
      const result = await window.electronAPI.printDocument({
        htmlContent,
        printerName: printerName || undefined,
        copies: copiesVal,
        duplex: false,
      });
      if (result.success) {
        toast.success('Dokumen berhasil dikirim ke printer', { id: 'auto-print' });
      } else {
        toast.error(result.error || 'Gagal mencetak', { id: 'auto-print' });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mencetak dokumen', { id: 'auto-print' });
    }
  };

  const handleOpenPrintDialog = async () => {
    setShowPrintDialog(true);
    await loadPrinters();
  };

  const handlePrint = async () => {
    if (!window.electronAPI?.isElectron) {
      window.print();
      setShowPrintDialog(false);
      return;
    }
    setIsPrinting(true);
    try {
      const htmlContent = await buildA4Html();
      if (!htmlContent) { toast.error('Gagal membangun dokumen untuk dicetak'); return; }
      const result = await window.electronAPI.printDocument({
        htmlContent,
        printerName: selectedPrinter || undefined,
        copies,
        duplex: false,
      });
      if (result.success) {
        toast.success('Dokumen berhasil dikirim ke printer');
        setShowPrintDialog(false);
      } else {
        toast.error(result.error || 'Gagal mencetak — coba periksa koneksi printer');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mencetak dokumen');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleExportPdf = async () => {
    toast.loading('Membuat PDF…', { id: 'pdf-export' });
    try {
      const htmlContent = await buildA4Html();
      if (!htmlContent) { toast.error('Gagal membangun dokumen', { id: 'pdf-export' }); return; }

      if (window.electronAPI?.isElectron) {
        // Use the same Chromium printToPDF pipeline as printing — guaranteed WYSIWYG
        const result = await window.electronAPI.printToPDF({ htmlContent, pageSize: 'A4' });
        if (!result.success || !result.data) {
          toast.error(result.error || 'Gagal membuat PDF', { id: 'pdf-export' });
          return;
        }
        const bytes = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
        const blob  = new Blob([bytes], { type: 'application/pdf' });
        const url   = URL.createObjectURL(blob);
        const a     = document.createElement('a');
        a.href      = url;
        a.download  = `${surat.nama || 'surat'}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('PDF berhasil diunduh', { id: 'pdf-export' });
      } else {
        // Web fallback: html2canvas → jsPDF
        const el = document.getElementById('a4-print-area') as HTMLElement | null;
        if (!el) { toast.error('Gagal membuat PDF', { id: 'pdf-export' }); return; }
        const prevT = el.style.transform; const prevTr = el.style.transition;
        el.style.transform = 'none'; el.style.transition = 'none';
        const imgs = Array.from(el.querySelectorAll('img')) as HTMLImageElement[];
        const orig: string[] = [];
        await Promise.all(imgs.map(async (img, i) => {
          orig[i] = img.src;
          if (!img.src || img.src.startsWith('data:')) return;
          try { const b = await fetch(img.src).then(r => r.blob()); await new Promise<void>(res => { const rd = new FileReader(); rd.onload = () => { img.src = rd.result as string; res(); }; rd.readAsDataURL(b); }); } catch { /* ignore */ }
        }));
        await new Promise(r => setTimeout(r, 100));
        const h2c = (await import('html2canvas')).default;
        const canvas = await h2c(el, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', width: el.scrollWidth, height: el.scrollHeight, windowWidth: el.scrollWidth, windowHeight: el.scrollHeight, logging: false });
        imgs.forEach((img, i) => { img.src = orig[i]; });
        el.style.transform = prevT; el.style.transition = prevTr;
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const A4_W = 210, A4_H = 297;
        const ratio = canvas.height / canvas.width;
        let iW = A4_W, iH = A4_W * ratio;
        if (iH > A4_H) { iH = A4_H; iW = A4_H / ratio; }
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (A4_W - iW) / 2, (A4_H - iH) / 2, iW, iH);
        pdf.save(`${surat.nama || 'surat'}.pdf`);
        toast.success('PDF berhasil diunduh', { id: 'pdf-export' });
      }
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Gagal mengekspor PDF', { id: 'pdf-export' });
    }
  };

  const selectedPrinterInfo = printers.find(p => p.name === selectedPrinter);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
      </Button>

      <Card className={`border-2 border-dashed ${isMasuk ? 'border-emerald-400' : 'border-rose-400'}`}>
        <CardContent className="py-3 px-4 flex items-center justify-between">
          <div>
            <div className="font-medium text-sm text-foreground">{surat.nama}</div>
            <div className="text-xs text-muted-foreground">
              NISN: {surat.nisn || '-'} · No: {surat.nomorSurat || '-'} · {new Date(surat.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              {surat.updatedAt && ` | Diedit: ${new Date(surat.updatedAt).toLocaleDateString('id-ID')}`}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isMasuk ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
              {isMasuk ? 'SURAT MASUK' : 'SURAT KELUAR'}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/surat/${jenisSlug}/${id}/edit`)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleOpenPrintDialog}>
                  <Printer className="mr-2 h-4 w-4" /> Print
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportDocx}>
                  <FileDown className="mr-2 h-4 w-4" /> Export DOCX
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPdf}>
                  <FileDown className="mr-2 h-4 w-4" /> Export PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Hapus
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <A4Preview surat={surat} jenisSurat={jenisSurat} />

      {/* ══ Print Dialog ══════════════════════════════════════════════════════ */}
      <Dialog open={showPrintDialog} onOpenChange={open => { if (!open && !isPrinting) setShowPrintDialog(false); }}>
        <DialogContent style={{ maxWidth: 480, padding: 0, overflow: 'hidden', borderRadius: 16 }}>

          {/* Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <DialogHeader>
              <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
                <Printer style={{ width: 18, height: 18 }} />
                Cetak Dokumen
              </DialogTitle>
            </DialogHeader>
          </div>

          <div style={{ padding: '16px 24px' }}>

            {/* Printer list heading + refresh */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Label style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Pilih Printer
              </Label>
              <button
                onClick={loadPrinters}
                disabled={isLoadingPrinters}
                title="Refresh daftar printer"
                style={{
                  background: 'none', border: 'none',
                  cursor: isLoadingPrinters ? 'not-allowed' : 'pointer',
                  color: '#64748b', padding: 4, borderRadius: 6,
                  display: 'flex', alignItems: 'center',
                }}
              >
                <RefreshCw style={{ width: 13, height: 13 }} className={isLoadingPrinters ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Printer rows */}
            {isLoadingPrinters ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '24px 0', color: '#64748b', fontSize: 13 }}>
                <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                Memuat daftar printer…
              </div>
            ) : printers.length === 0 ? (
              <div style={{
                padding: '14px 12px', borderRadius: 8, fontSize: 13,
                background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171',
              }}>
                ⚠ Tidak ada printer yang ditemukan. Pastikan printer sudah terinstal dan terhubung ke Windows.
              </div>
            ) : (
              <div style={{
                maxHeight: 220, overflowY: 'auto',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                background: 'rgba(15,23,42,0.5)', padding: 4, marginBottom: 14,
              }}>
                {printers.map(p => (
                  <PrinterRow
                    key={p.name}
                    printer={p}
                    selected={selectedPrinter === p.name}
                    onSelect={() => setSelectedPrinter(p.name)}
                  />
                ))}
              </div>
            )}

            {/* Selected printer status bar */}
            {selectedPrinterInfo && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 8, marginBottom: 16,
                background: printerIsReady(selectedPrinterInfo.status)
                  ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                border: `1px solid ${printerIsReady(selectedPrinterInfo.status)
                  ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
                fontSize: 12,
                color: printerIsReady(selectedPrinterInfo.status) ? '#4ade80' : '#f87171',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: printerIsReady(selectedPrinterInfo.status) ? '#4ade80' : '#f87171',
                }} />
                {printerIsReady(selectedPrinterInfo.status)
                  ? `${selectedPrinterInfo.displayName} siap menerima dokumen`
                  : `${selectedPrinterInfo.displayName} tampaknya offline atau tidak tersedia`}
              </div>
            )}

            {/* Copies counter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Label style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                Jumlah Salinan
              </Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {[
                  { label: '−', action: () => setCopies(c => Math.max(1, c - 1)), disabled: copies <= 1 },
                  { label: '+', action: () => setCopies(c => Math.min(99, c + 1)), disabled: false },
                ].map((btn, i) => i === 0 ? (
                  <button key="minus" onClick={btn.action} disabled={btn.disabled} style={{
                    width: 28, height: 28, borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 16,
                    cursor: btn.disabled ? 'not-allowed' : 'pointer',
                    opacity: btn.disabled ? 0.4 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>−</button>
                ) : (
                  <button key="plus" onClick={btn.action} style={{
                    width: 28, height: 28, borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 16,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>+</button>
                ))}
                <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>
                  {copies}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter style={{ padding: '12px 24px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', gap: 8 }}>
            <Button variant="outline" onClick={() => setShowPrintDialog(false)} disabled={isPrinting}>
              Batal
            </Button>
            <Button
              onClick={handlePrint}
              disabled={isPrinting || isLoadingPrinters || printers.length === 0}
              style={{ minWidth: 110 }}
            >
              {isPrinting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mencetak…</>
                : <><Printer className="mr-2 h-4 w-4" />Cetak</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        description={`Apakah Anda yakin ingin menghapus surat "${surat.nama}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={deleteSurat}
      />
    </div>
  );
};

export default PreviewSurat;
