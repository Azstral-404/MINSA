import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { BULAN_NAMES, isInTahunAjaran } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, MoreVertical, Eye, Pencil, Trash2, Printer, FileDown, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';

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
          {printer.isDefault && (
            <span style={{ marginLeft: 6, fontSize: 10, color: '#64748b', fontWeight: 400 }}>(Default)</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: ready ? '#4ade80' : '#f87171', marginTop: 1 }}>
          {ready ? 'Siap' : 'Offline'}
        </div>
      </div>
    </button>
  );
}

const DaftarSurat = () => {
  const { jenisSlug } = useParams<{ jenisSlug: string }>();
  const { data, updateData } = useApp();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<'semua' | 'masuk' | 'keluar'>('semua');
  const [bulanFilter, setBulanFilter] = useState<string>('semua');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── Print dialog state ──────────────────────────────────────────────────
  const [printTargetId, setPrintTargetId] = useState<string | null>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [copies, setCopies] = useState<number>(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);

  const jenisSurat = data.settings.jenisSurat.find(j => j.slug === jenisSlug);
  if (!jenisSurat) return (
    <div className="text-center py-10 text-muted-foreground">Jenis surat tidak ditemukan.</div>
  );

  const activeTA = data.settings.activeTahunAjaran;
  let suratList = data.surat.filter(s => s.jenisSuratId === jenisSurat.id);
  if (activeTA) suratList = suratList.filter(s => isInTahunAjaran(s, activeTA));
  if (filter !== 'semua') suratList = suratList.filter(s => s.arah === filter);
  if (bulanFilter !== 'semua') suratList = suratList.filter(s => String(s.bulan) === bulanFilter);
  suratList.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const deleteSurat = (id: string) => {
    updateData(d => ({ ...d, surat: d.surat.filter(s => s.id !== id) }));
    toast.success('Surat dihapus');
  };

  // ── Load printers from Windows spooler ────────────────────────────────────
  const loadPrinters = useCallback(async () => {
    setIsLoadingPrinters(true);
    try {
      if (window.electronAPI?.isElectron) {
        const list: PrinterInfo[] = await window.electronAPI.getPrinters();
        setPrinters(list || []);
        const def  = list.find(p => p.isDefault);
        const idle = list.find(p => printerIsReady(p.status));
        setSelectedPrinter((def ?? idle ?? list[0])?.name ?? '');
      } else {
        setPrinters([]);
      }
    } catch (err) {
      console.error('loadPrinters:', err);
      setPrinters([]);
    } finally {
      setIsLoadingPrinters(false);
    }
  }, []);

  // ── Open print dialog for a specific surat ────────────────────────────────
  const openPrintDialog = async (suratId: string) => {
    setPrintTargetId(suratId);
    setCopies(1);
    setShowPrintDialog(true);
    await loadPrinters();
  };

  const closePrintDialog = () => {
    if (isPrinting) return;
    setShowPrintDialog(false);
    setPrintTargetId(null);
  };

  // ── Print: navigate to preview with printer pre-selected ─────────────────
  // We must navigate because buildA4Html() needs #a4-print-area in the DOM,
  // which only exists on the PreviewSurat page. We pass the choice via
  // sessionStorage so PreviewSurat auto-prints with no extra user click.
  const handlePrint = async () => {
    if (!printTargetId) return;

    if (!window.electronAPI?.isElectron) {
      navigate(`/surat/${jenisSlug}/${printTargetId}/preview?action=print`);
      setShowPrintDialog(false);
      return;
    }

    // Store choices — PreviewSurat will read these on mount
    sessionStorage.setItem('minsa_print_printer', selectedPrinter);
    sessionStorage.setItem('minsa_print_copies', String(copies));
    sessionStorage.setItem('minsa_print_auto', '1');  // flag: auto-print immediately
    setShowPrintDialog(false);
    navigate(`/surat/${jenisSlug}/${printTargetId}/preview?action=print`);
  };

  const selectedPrinterInfo = printers.find(p => p.name === selectedPrinter);
  const deleteTargetSurat = suratList.find(s => s.id === deleteId);

  return (
    <div className="space-y-4">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-foreground">{jenisSurat.label}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={bulanFilter} onValueChange={setBulanFilter}>
            <SelectTrigger className="h-8 text-xs w-[110px]">
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Bulan</SelectItem>
              {BULAN_NAMES.slice(1).map((b, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="h-8 text-xs w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua</SelectItem>
              <SelectItem value="masuk">Masuk</SelectItem>
              <SelectItem value="keluar">Keluar</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8"><Plus className="mr-1 h-4 w-4" />Buat Surat</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/surat/${jenisSlug}/tambah?arah=masuk`)}>Surat Masuk</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/surat/${jenisSlug}/tambah?arah=keluar`)}>Surat Keluar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Surat list ── */}
      {suratList.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Belum ada surat.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {suratList.map(s => {
            const isMasuk = s.arah === 'masuk';
            return (
              <Card
                key={s.id}
                className={`border-l-4 cursor-pointer hover:shadow-md transition-shadow ${isMasuk ? 'border-l-emerald-500' : 'border-l-rose-500'}`}
                onClick={() => navigate(`/surat/${jenisSlug}/${s.id}/preview`)}
              >
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">{s.nama}</div>
                    <div className="text-xs text-muted-foreground">
                      NISN: {s.nisn || '-'} · No: {s.nomorSurat || '-'} · {new Date(s.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {s.updatedAt && ` | Diedit: ${new Date(s.updatedAt).toLocaleDateString('id-ID')}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isMasuk ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                      {isMasuk ? 'MASUK' : 'KELUAR'}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/surat/${jenisSlug}/${s.id}/preview`)}>
                          <Eye className="mr-2 h-4 w-4" />Lihat
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/surat/${jenisSlug}/${s.id}/edit`)}>
                          <Pencil className="mr-2 h-4 w-4" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openPrintDialog(s.id)}>
                          <Printer className="mr-2 h-4 w-4" />Print
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/surat/${jenisSlug}/${s.id}/preview?action=pdf`)}>
                          <FileDown className="mr-2 h-4 w-4" />Export PDF
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(s.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        description={`Apakah Anda yakin ingin menghapus surat "${deleteTargetSurat?.nama || ''}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={() => { if (deleteId) { deleteSurat(deleteId); setDeleteId(null); } }}
      />

      {/* ══ Print Dialog ══════════════════════════════════════════════════════ */}
      <Dialog open={showPrintDialog} onOpenChange={open => { if (!open) closePrintDialog(); }}>
        <DialogContent style={{ maxWidth: 480, padding: 0, overflow: 'hidden', borderRadius: 16 }}>

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

            {isLoadingPrinters ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '24px 0', color: '#64748b', fontSize: 13 }}>
                <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                Memuat daftar printer…
              </div>
            ) : printers.length === 0 ? (
              <div style={{
                padding: '14px 12px', borderRadius: 8, fontSize: 13,
                background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171',
                marginBottom: 14,
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

            {/* Selected status bar */}
            {selectedPrinterInfo && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 8, marginBottom: 16,
                background: printerIsReady(selectedPrinterInfo.status) ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                border: `1px solid ${printerIsReady(selectedPrinterInfo.status) ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
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

            {/* Copies */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Label style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                Jumlah Salinan
              </Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setCopies(c => Math.max(1, c - 1))} disabled={copies <= 1} style={{
                  width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 16,
                  cursor: copies <= 1 ? 'not-allowed' : 'pointer', opacity: copies <= 1 ? 0.4 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>−</button>
                <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>{copies}</span>
                <button onClick={() => setCopies(c => Math.min(99, c + 1))} style={{
                  width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 16,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>+</button>
              </div>
            </div>
          </div>

          <DialogFooter style={{ padding: '12px 24px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', gap: 8 }}>
            <Button variant="outline" onClick={closePrintDialog} disabled={isPrinting}>Batal</Button>
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
    </div>
  );
};

export default DaftarSurat;
