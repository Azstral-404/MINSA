import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BULAN_NAMES, isInTahunAjaran } from '@/lib/store';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, Plus, Pencil, Check } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Index = () => {
  const { data, updateData } = useApp();
  const navigate = useNavigate();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(data.settings.dashboardTitle);

  const saveTitle = () => {
    updateData(d => ({ ...d, settings: { ...d.settings, dashboardTitle: titleDraft.trim() || 'Sistem Surat' } }));
    setEditingTitle(false);
  };

  const { jenisSurat } = data.settings;
  const activeTA = data.settings.activeTahunAjaran;

  const filteredSurat = activeTA
    ? data.surat.filter(s => isInTahunAjaran(s, activeTA))
    : data.surat;

  const masukTotal = filteredSurat.filter(s => s.arah === 'masuk').length;
  const keluarTotal = filteredSurat.filter(s => s.arah === 'keluar').length;
  const masukBulan = filteredSurat.filter(s => s.arah === 'masuk' && s.bulan === currentMonth && s.tahun === currentYear).length;
  const keluarBulan = filteredSurat.filter(s => s.arah === 'keluar' && s.bulan === currentMonth && s.tahun === currentYear).length;

  const recentSurat = [...filteredSurat].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);

  const handleAddSurat = (arah: 'masuk' | 'keluar') => {
    if (jenisSurat.length === 0) {
      navigate('/pengaturan?tab=surat');
    } else if (jenisSurat.length === 1) {
      navigate(`/surat/${jenisSurat[0].slug}/tambah?arah=${arah}`);
    }
    // For 2+, the DropdownMenu handles it
  };

  const SuratButton = ({ arah, className, label }: { arah: 'masuk' | 'keluar'; className: string; label: string }) => {
    if (jenisSurat.length >= 2) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className={`h-12 flex items-center gap-2 ${className}`}>
              <Plus className="h-4 w-4" />
              <span className="text-xs">{label}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {jenisSurat.map(js => (
              <DropdownMenuItem key={js.id} onClick={() => navigate(`/surat/${js.slug}/tambah?arah=${arah}`)}>
                {js.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    return (
      <Button className={`h-12 flex items-center gap-2 ${className}`} onClick={() => handleAddSurat(arah)}>
        <Plus className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Editable Title */}
      <div>
        <div className="flex items-center gap-2">
          {editingTitle ? (
            <>
              <Input
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                className="text-2xl font-bold h-10 w-auto max-w-xs"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && saveTitle()}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={saveTitle}>
                <Check className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground">{data.settings.dashboardTitle}</h1>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setTitleDraft(data.settings.dashboardTitle); setEditingTitle(true); }}>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{data.settings.schoolName} — NSM: {data.settings.nsm} · NPSN: {data.settings.npsn}{activeTA ? ` — TA ${activeTA}` : ''}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 overflow-hidden">
          <CardContent className="p-0 h-full">
            <div className="grid grid-cols-2 h-full">
              <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 p-5 flex flex-col justify-center items-center border-r border-border">
                <ArrowDownLeft className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mb-1" />
                <span className="text-xs text-muted-foreground">{activeTA || `${currentYear}`}</span>
                <span className="text-3xl font-bold text-foreground">{masukTotal}</span>
                <span className="text-xs text-muted-foreground font-medium">TOTAL MASUK</span>
              </div>
              <div className="bg-gradient-to-br from-rose-500/20 to-rose-600/10 p-5 flex flex-col justify-center items-center">
                <ArrowUpRight className="h-5 w-5 text-rose-600 dark:text-rose-400 mb-1" />
                <span className="text-xs text-muted-foreground">{activeTA || `${currentYear}`}</span>
                <span className="text-3xl font-bold text-foreground">{keluarTotal}</span>
                <span className="text-xs text-muted-foreground font-medium">TOTAL KELUAR</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-2">
                <div className="bg-gradient-to-br from-emerald-500/15 to-transparent p-4 flex flex-col justify-center items-center border-r border-border">
                  <span className="text-xs text-muted-foreground uppercase">{BULAN_NAMES[currentMonth]}</span>
                  <span className="text-2xl font-bold text-foreground">{masukBulan}</span>
                  <span className="text-[10px] text-muted-foreground">MASUK</span>
                </div>
                <div className="bg-gradient-to-br from-rose-500/15 to-transparent p-4 flex flex-col justify-center items-center">
                  <span className="text-xs text-muted-foreground uppercase">{BULAN_NAMES[currentMonth]}</span>
                  <span className="text-2xl font-bold text-foreground">{keluarBulan}</span>
                  <span className="text-[10px] text-muted-foreground">KELUAR</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-2">
            <SuratButton arah="masuk" className="bg-emerald-600 hover:bg-emerald-700 text-white" label="Surat Masuk" />
            <SuratButton arah="keluar" className="bg-rose-600 hover:bg-rose-700 text-white" label="Surat Keluar" />
          </div>
        </div>
      </div>

      {/* Riwayat Terakhir */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Riwayat Terakhir</h2>
        {recentSurat.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Belum ada surat. Silakan tambahkan jenis surat di{' '}
              <Link to="/pengaturan?tab=surat" className="text-primary underline">Pengaturan</Link>.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentSurat.map(s => {
              const js = jenisSurat.find(j => j.id === s.jenisSuratId);
              const isMasuk = s.arah === 'masuk';
              return (
                <Link to={js ? `/surat/${js.slug}/${s.id}/preview` : '#'} key={s.id}>
                  <Card className={`hover:shadow-md transition-shadow cursor-pointer border-l-4 ${isMasuk ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm text-foreground">{s.nama}</div>
                        <div className="text-xs text-muted-foreground">
                          {js?.label} · {new Date(s.createdAt).getDate()} {BULAN_NAMES[s.bulan]} {s.tahun}
                          {s.updatedAt && <span className="ml-1 text-muted-foreground/70">| last edit</span>}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isMasuk ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                        {isMasuk ? 'MASUK' : 'KELUAR'}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
