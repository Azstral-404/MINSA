/**
 * PrintDialog — Printer selection + Print / Export PDF + Live Queue Monitor
 * Works with the improved main.js IPC handlers that render a
 * dedicated hidden window so only the A4 content is captured.
 */
import { useEffect, useState, useCallback, useRef } from 'react';

interface Printer {
  name: string;
  displayName: string;
}

interface QueueJob {
  jobId: string;
  document: string;
  status: string;
  totalPages: number;
  pagesPrinted: number;
}

interface PrintDialogProps {
  /** The full HTML string of the A4 page (from buildA4Html) */
  htmlContent: string;
  onClose: () => void;
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron?: boolean;
      getPrinters: () => Promise<Printer[]>;
      printDocument: (opts: {
        htmlContent: string;
        printerName?: string;
        copies?: number;
        duplex?: boolean;
      }) => Promise<{ success: boolean; error?: string }>;
      printToPDF: (opts: {
        htmlContent: string;
        pageSize?: string;
        landscape?: boolean;
      }) => Promise<{ success: boolean; data?: string; error?: string }>;
      getPrinterQueue: (printerName: string) => Promise<QueueJob[]>;
      startQueueMonitor: (printerName: string) => void;
      stopQueueMonitor: () => void;
      onQueueUpdate: (callback: (data: { printer: string; jobs: QueueJob[] }) => void) => void;
      offQueueUpdate: () => void;
    };
  }
}

export function PrintDialog({ htmlContent, onClose }: PrintDialogProps) {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [copies, setCopies] = useState(1);
  const [duplex, setDuplex] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPrinters, setLoadingPrinters] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [queueJobs, setQueueJobs] = useState<QueueJob[]>([]);
  const [monitoring, setMonitoring] = useState(false);
  const monitoringRef = useRef(false);

  const isElectron = !!window.electronAPI?.isElectron;

  useEffect(() => {
    if (!isElectron) { setLoadingPrinters(false); return; }
    window.electronAPI!.getPrinters()
      .then(list => {
        setPrinters(list);
        if (list.length > 0) setSelected(list[0].name);
      })
      .catch(() => setStatus({ type: 'error', msg: 'Gagal memuat daftar printer.' }))
      .finally(() => setLoadingPrinters(false));
  }, [isElectron]);

  // Start queue monitor after print job is submitted
  const startMonitor = useCallback((printerName: string) => {
    if (!isElectron || !window.electronAPI?.startQueueMonitor) return;
    monitoringRef.current = true;
    setMonitoring(true);
    window.electronAPI.onQueueUpdate((data) => {
      if (!monitoringRef.current) return;
      setQueueJobs(data.jobs || []);
    });
    window.electronAPI.startQueueMonitor(printerName);
  }, [isElectron]);

  const stopMonitor = useCallback(() => {
    monitoringRef.current = false;
    setMonitoring(false);
    if (isElectron && window.electronAPI?.stopQueueMonitor) {
      window.electronAPI.stopQueueMonitor();
      window.electronAPI.offQueueUpdate?.();
    }
    setQueueJobs([]);
  }, [isElectron]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopMonitor(); };
  }, [stopMonitor]);

  const handlePrint = useCallback(async () => {
    if (!isElectron) {
      window.print();
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const res = await window.electronAPI!.printDocument({
        htmlContent,
        printerName: selected || undefined,
        copies,
        duplex,
      });
      if (res.success) {
        setStatus({ type: 'success', msg: 'Dokumen berhasil dikirim ke printer.' });
        startMonitor(selected);
      } else {
        setStatus({ type: 'error', msg: res.error || 'Cetak gagal.' });
      }
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message || 'Cetak gagal.' });
    } finally {
      setLoading(false);
    }
  }, [htmlContent, selected, copies, duplex, isElectron, startMonitor]);

  const handlePDF = useCallback(async () => {
    if (!isElectron) {
      window.print();
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const res = await window.electronAPI!.printToPDF({ htmlContent, pageSize: 'A4' });
      if (res.success && res.data) {
        // decode base64 and trigger download
        const bytes = Uint8Array.from(atob(res.data), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `surat-${Date.now()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        setStatus({ type: 'success', msg: 'PDF berhasil disimpan.' });
        setTimeout(onClose, 1500);
      } else {
        setStatus({ type: 'error', msg: res.error || 'Ekspor PDF gagal.' });
      }
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message || 'Ekspor PDF gagal.' });
    } finally {
      setLoading(false);
    }
  }, [htmlContent, isElectron, onClose]);

  const jobStatusColor = (s: string) => {
    if (s === 'Mencetak...') return '#4ade80';
    if (s === 'Selesai') return '#4ade80';
    if (s === 'Error' || s === 'Printer Offline' || s === 'Kertas Habis') return '#f87171';
    return '#94a3b8';
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) { stopMonitor(); onClose(); } }}
    >
      <div style={{
        background: '#1e2635',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: '28px 32px',
        width: 440,
        maxWidth: '95vw',
        color: '#e2e8f0',
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>
            🖨️ Cetak Dokumen
          </h2>
          <button
            onClick={() => { stopMonitor(); onClose(); }}
            style={{
              background: 'none', border: 'none', color: '#94a3b8',
              cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '2px 6px',
              borderRadius: 6,
            }}
          >×</button>
        </div>

        {/* Printer selection */}
        {isElectron && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
              Pilih Printer
            </label>
            {loadingPrinters ? (
              <div style={{ fontSize: 13, color: '#64748b', padding: '10px 0' }}>
                ⏳ Memuat daftar printer…
              </div>
            ) : printers.length === 0 ? (
              <div style={{ fontSize: 13, color: '#f87171', padding: '10px 0' }}>
                ⚠️ Tidak ada printer yang terdeteksi. Akan menggunakan printer default sistem.
              </div>
            ) : (
              <select
                value={selected}
                onChange={e => { setSelected(e.target.value); stopMonitor(); }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: '#0f172a',
                  color: '#e2e8f0',
                  fontSize: 14,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {printers.map(p => (
                  <option key={p.name} value={p.name}>
                    {p.displayName || p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Copies */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
              Jumlah Salinan
            </label>
            <input
              type="number"
              min={1}
              max={99}
              value={copies}
              onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: '#0f172a',
                color: '#e2e8f0',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Duplex toggle */}
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
              Cetak Bolak-Balik
            </label>
            <button
              onClick={() => setDuplex(d => !d)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: duplex ? '#6366f1' : '#0f172a',
                color: '#e2e8f0',
                fontSize: 14,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {duplex ? '✓ Aktif' : 'Nonaktif'}
            </button>
          </div>
        </div>

        {/* Status */}
        {status && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            background: status.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            color: status.type === 'success' ? '#4ade80' : '#f87171',
            border: `1px solid ${status.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            {status.type === 'success' ? '✓ ' : '⚠ '}{status.msg}
          </div>
        )}

        {/* Live Queue Monitor */}
        {monitoring && (
          <div style={{
            marginBottom: 16,
            padding: '12px 14px',
            borderRadius: 8,
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc' }}>
                📋 Antrian Printer — {selected || 'Default'}
              </span>
              <button
                onClick={stopMonitor}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 11 }}
              >
                Tutup
              </button>
            </div>
            {queueJobs.length === 0 ? (
              <div style={{ fontSize: 12, color: '#64748b' }}>
                ⏳ Memantau antrian…
              </div>
            ) : (
              queueJobs.map(job => (
                <div key={job.jobId} style={{
                  fontSize: 12, display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '4px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <span style={{ color: '#cbd5e1', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📄 {job.document}
                  </span>
                  <span style={{ color: jobStatusColor(job.status), fontWeight: 600, fontSize: 11 }}>
                    {job.status}
                    {job.totalPages > 0 ? ` (${job.pagesPrinted}/${job.totalPages})` : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handlePrint}
            disabled={loading}
            style={{
              flex: 1,
              padding: '11px 0',
              borderRadius: 10,
              border: 'none',
              background: loading ? '#374151' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? '⏳ Memproses…' : '🖨️ Cetak'}
          </button>

          <button
            onClick={handlePDF}
            disabled={loading}
            style={{
              flex: 1,
              padding: '11px 0',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.15)',
              background: loading ? '#374151' : '#1e2635',
              color: '#e2e8f0',
              fontWeight: 700,
              fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            📄 Ekspor PDF
          </button>
        </div>
      </div>
    </div>
  );
}

