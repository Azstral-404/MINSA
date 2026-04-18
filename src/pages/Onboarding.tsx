import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { expandSchoolName, buildLine2, buildSchoolSub, parseMadrasahName } from '@/lib/store';
import { KABUPATEN_LIST } from '@/lib/kabupaten';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const Onboarding = () => {
  const { updateData } = useApp();
  const navigate = useNavigate();
  const [appName, setAppName] = useState('MANAJEMEN SURAT');
  const [schoolName, setSchoolName] = useState('');
  const [kabupatenInput, setKabupatenInput] = useState('');
  const [kabupatenSearch, setKabupatenSearch] = useState('');
  const [showKabupatenList, setShowKabupatenList] = useState(false);
  const [nsm, setNsm] = useState('');
  const [npsn, setNpsn] = useState('');

  const madrasahInfo = parseMadrasahName(schoolName);

  const filteredKabupaten = useMemo(() => {
    const q = kabupatenSearch.toLowerCase();
    if (!q) return KABUPATEN_LIST.slice(0, 20);
    return KABUPATEN_LIST.filter(k => k.toLowerCase().includes(q)).slice(0, 30);
  }, [kabupatenSearch]);

  const handleSelectKabupaten = (k: string) => {
    setKabupatenInput(k);
    setKabupatenSearch(k);
    setShowKabupatenList(false);
  };

  const handleSubmit = () => {
    if (!appName.trim()) { toast.error('Nama aplikasi wajib diisi'); return; }
    if (!schoolName.trim()) { toast.error('Nama sekolah wajib diisi'); return; }

    const kabupaten = kabupatenInput.trim();
    const expandedSchool = expandSchoolName(schoolName.trim());
    const line2 = kabupaten ? buildLine2(kabupaten) : '';
    const schoolSub = kabupaten ? buildSchoolSub(kabupaten) : '';

    const headerDefaults = madrasahInfo.isMadrasah ? {
      line1: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
      line2,
      school: expandedSchool,
      schoolSub,
    } : {
      line1: '',
      line2,
      school: schoolName.trim().toUpperCase(),
      schoolSub,
    };

    updateData(d => ({
      ...d,
      settings: {
        ...d.settings,
        appName: appName.trim(),
        schoolName: schoolName.trim(),
        kabupaten,
        nsm: nsm.trim(),
        npsn: npsn.trim(),
        onboarded: true,
        suratHeader: {
          ...d.settings.suratHeader,
          ...headerDefaults,
        },
      },
    }));
    toast.success('Selamat datang!');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Selamat Datang 👋</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Atur identitas aplikasi Anda untuk memulai.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label>Nama Aplikasi (Sidebar)</Label>
            <Input
              value={appName}
              onChange={e => setAppName(e.target.value)}
              placeholder="cth: MANAJEMEN SURAT"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Akan ditampilkan di sidebar sebagai judul aplikasi.</p>
          </div>

          <div>
            <Label>Nama Sekolah</Label>
            <Input
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              placeholder="cth: MIN 1 Langsa"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Akan ditampilkan di header dan dashboard.</p>
            {madrasahInfo.isMadrasah && schoolName.trim() && (
              <div className="mt-2 p-2 rounded-md bg-primary/10 border border-primary/20">
                <p className="text-xs font-mono text-primary">{expandSchoolName(schoolName)}</p>
                <p className="text-xs text-muted-foreground">Nama lengkap otomatis</p>
              </div>
            )}
          </div>

          {/* Kabupaten picker */}
          <div className="relative">
            <Label>Kabupaten / Kota</Label>
            <Input
              value={kabupatenSearch}
              onChange={e => { setKabupatenSearch(e.target.value); setKabupatenInput(e.target.value); setShowKabupatenList(true); }}
              onFocus={() => setShowKabupatenList(true)}
              placeholder="cth: Kota Langsa"
              className="mt-1"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground mt-1">Digunakan sebagai placeholder {'{kabupaten}'} di template.</p>
            {showKabupatenList && filteredKabupaten.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {filteredKabupaten.map(k => (
                  <button
                    key={k}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onMouseDown={() => handleSelectKabupaten(k)}
                  >
                    {k}
                  </button>
                ))}
              </div>
            )}
            {kabupatenInput && (
              <div className="mt-1 p-2 rounded-md bg-muted/50 text-xs space-y-0.5">
                <div><span className="text-muted-foreground">Header baris 2:</span> <span className="font-medium">{buildLine2(kabupatenInput)}</span></div>
                <div><span className="text-muted-foreground">Sub header:</span> <span className="font-medium">{buildSchoolSub(kabupatenInput)}</span></div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>NSM</Label>
              <Input
                value={nsm}
                onChange={e => { if (/^\d*$/.test(e.target.value)) setNsm(e.target.value); }}
                placeholder="Opsional"
                inputMode="numeric"
                className="mt-1"
              />
            </div>
            <div>
              <Label>NPSN</Label>
              <Input
                value={npsn}
                onChange={e => { if (/^\d*$/.test(e.target.value)) setNpsn(e.target.value); }}
                placeholder="Opsional"
                inputMode="numeric"
                className="mt-1"
              />
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full" size="lg">
            Mulai Menggunakan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
