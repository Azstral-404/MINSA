import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { generateId, KELAS_OPTIONS, getAllBiodataFields, extractBiodataKeysFromTemplate } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

// Helper: Capitalize first letter of each word
function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

// Helper: Uppercase for Nama
function toUpperCase(str: string): string {
  return str.toUpperCase();
}

const TambahSurat = () => {
  const { jenisSlug, id: editId } = useParams<{ jenisSlug: string; id?: string }>();
  const [searchParams] = useSearchParams();
  const arahParam = searchParams.get('arah') as 'masuk' | 'keluar' | null;
  const { data, updateData } = useApp();
  const navigate = useNavigate();
  const isEdit = !!editId;
  const formRef = useRef<HTMLFormElement>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const jenisSurat = data.settings.jenisSurat.find(j => j.slug === jenisSlug);
  const existingSurat = isEdit ? data.surat.find(s => s.id === editId) : null;

  // Determine which biodata fields to show.
  // If user adds placeholders to the template (Pengaturan > Jenis Surat), the form should auto-show matching inputs.
  const allBiodata = getAllBiodataFields(data.settings);
  const templateKeys = jenisSurat
    ? extractBiodataKeysFromTemplate(data.settings, `${jenisSurat.templateJudul} ${jenisSurat.templateIsi}`)
    : [];
  const selectedKeys = templateKeys.length > 0 ? templateKeys : (jenisSurat?.selectedBiodata || []);

  const visibleFields = selectedKeys.length > 0
    ? allBiodata.filter(f => selectedKeys.includes(f.key))
    : [];

  const [form, setForm] = useState({
    nomorSurat: '',
    nama: '',
    tempatLahir: '',
    tanggalLahir: '',
    jenisKelamin: 'Laki-laki',
    kelas: '',
    noInduk: '',
    nisn: '',
    namaOrangTua: '',
    alamat: '',
    kepalaMadrasahId: '',
    arah: arahParam || 'keluar' as 'masuk' | 'keluar',
  });

  const [extraFields, setExtraFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingSurat) {
      setForm({
        nomorSurat: existingSurat.nomorSurat,
        nama: existingSurat.nama,
        tempatLahir: existingSurat.tempatLahir,
        tanggalLahir: existingSurat.tanggalLahir,
        jenisKelamin: existingSurat.jenisKelamin,
        kelas: existingSurat.kelas,
        noInduk: existingSurat.noInduk,
        nisn: existingSurat.nisn,
        namaOrangTua: existingSurat.namaOrangTua,
        alamat: existingSurat.alamat,
        kepalaMadrasahId: existingSurat.kepalaMadrasahId,
        arah: existingSurat.arah,
      });
      setExtraFields(existingSurat.extraFields || {});
    }
  }, [existingSurat]);

  if (!jenisSurat) return <div className="text-center py-10 text-muted-foreground">Jenis surat tidak ditemukan.</div>;

  const setField = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));
  const setExtra = (key: string, value: string) => setExtraFields(f => ({ ...f, [key]: value }));

  const isFieldVisible = (key: string) => selectedKeys.includes(key);
  
  // Get custom field keys for Enter key navigation
  const customFieldKeys = visibleFields.filter(f => f.isCustom).map(f => f.key);

  // Register input ref for Enter key navigation
  const registerInput = useCallback((key: string, el: HTMLInputElement | null) => {
    if (el) {
      inputRefs.current.set(key, el);
    }
  }, []);

  // Handle Enter key to move to next field
  const handleKeyDown = (e: React.KeyboardEvent, currentKey: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Get all visible field keys in order, including custom fields
      const fieldOrder = [
        'nomorSurat', 'nama', 'tempatLahir', 'tanggalLahir', 
        'jenisKelamin', 'kelas', 'noInduk', 'nisn', 
        'namaOrangTua', 'alamat', ...customFieldKeys, 'kepalaMadrasahId'
      ].filter(key => {
        // tempatLahir block contains both tempatLahir + tanggalLahir UI
        if (key === 'tanggalLahir') return isFieldVisible('tempatLahir');

        if (key === 'jenisKelamin') return isFieldVisible('jenisKelamin');
        if (key === 'kelas') return isFieldVisible('kelas');

        if (key === 'noInduk' || key === 'nisn') return isFieldVisible('noInduk') || isFieldVisible('nisn');
        if (key === 'namaOrangTua') return isFieldVisible('namaOrangTua');
        if (key === 'alamat') return isFieldVisible('alamat');
        if (customFieldKeys.includes(key)) return true;
        return key === 'nomorSurat' || key === 'nama' || key === 'kepalaMadrasahId';
      });

      const currentIndex = fieldOrder.indexOf(currentKey);
      if (currentIndex >= 0 && currentIndex < fieldOrder.length - 1) {
        const nextKey = fieldOrder[currentIndex + 1];
        const nextInput = inputRefs.current.get(nextKey);
        if (nextInput) {
          nextInput.focus();
        }
      } else if (currentIndex === fieldOrder.length - 1) {
        // Last field - submit form
        const form = e.currentTarget.closest('form');
        if (form) {
          form.requestSubmit();
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFieldVisible('nama') && !form.nama.trim()) { toast.error('Nama wajib diisi'); return; }

    const now = new Date();
    const tahunAjaran = data.settings.activeTahunAjaran || '';

    if (isEdit && existingSurat) {
      updateData(d => ({
        ...d, surat: d.surat.map(s => s.id === editId ? {
          ...s, ...form, 
          nama: form.nama.trim().toUpperCase(),
          tempatLahir: capitalizeFirst(form.tempatLahir.trim()),
          noInduk: form.noInduk.trim(), nisn: form.nisn.trim(),
          namaOrangTua: capitalizeFirst(form.namaOrangTua.trim()), 
          alamat: capitalizeFirst(form.alamat.trim()),
          nomorSurat: form.nomorSurat.trim(), tahunAjaran,
          updatedAt: now.toISOString(), extraFields,
        } : s),
      }));
      toast.success('Surat diperbarui');
    } else {
      const surat = {
        id: generateId(), jenisSuratId: jenisSurat.id,
        nomorSurat: form.nomorSurat.trim(), 
        nama: form.nama.trim().toUpperCase(),
        tempatLahir: capitalizeFirst(form.tempatLahir.trim()), 
        tanggalLahir: form.tanggalLahir,
        jenisKelamin: form.jenisKelamin, kelas: form.kelas,
        noInduk: form.noInduk.trim(), nisn: form.nisn.trim(),
        namaOrangTua: capitalizeFirst(form.namaOrangTua.trim()), 
        alamat: capitalizeFirst(form.alamat.trim()),
        tahunAjaran, bulan: now.getMonth() + 1, tahun: now.getFullYear(),
        kepalaMadrasahId: form.kepalaMadrasahId, arah: form.arah,
        createdAt: now.toISOString(), updatedAt: now.toISOString(),
        extraFields,
      };
      updateData(d => ({ ...d, surat: [...d.surat, surat] }));
      toast.success('Surat berhasil ditambahkan');
    }
    navigate(`/surat/${jenisSlug}`);
  };

  const isMasuk = form.arah === 'masuk';
  const customVisible = visibleFields.filter(f => f.isCustom);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-foreground mb-4">
        {isEdit ? 'Edit' : 'Tambah'} {jenisSurat.label}
        <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${isMasuk ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
          {isMasuk ? 'MASUK' : 'KELUAR'}
        </span>
      </h1>

      <Card>
        <CardContent className="pt-6">
          <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            {/* Always visible: Arah */}
            <div>
              <Label>Jenis Surat</Label>
              <Select value={form.arah} onValueChange={v => setField('arah', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masuk">Surat Masuk</SelectItem>
                  <SelectItem value="keluar">Surat Keluar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Always visible: Nomor Surat */}
            <div>
              <Label>Nomor Surat (opsional)</Label>
              <Input 
                value={form.nomorSurat} 
                onChange={e => setField('nomorSurat', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'nomorSurat')}
                ref={(el) => registerInput('nomorSurat', el)}
                placeholder="Kosongkan jika belum ada" 
              />
            </div>

            {/* Dynamic biodata fields */}
            {isFieldVisible('nama') && (
              <div>
                <Label>Nama Lengkap *</Label>
                <Input 
                  value={form.nama} 
                  onChange={e => setField('nama', toUpperCase(e.target.value))}
                  onKeyDown={(e) => handleKeyDown(e, 'nama')}
                  ref={(el) => registerInput('nama', el)}
                  required 
                />
              </div>
            )}

            {isFieldVisible('tempatLahir') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Tempat Lahir</Label>
                  <Input 
                    value={form.tempatLahir} 
                    onChange={e => setField('tempatLahir', capitalizeFirst(e.target.value))}
                    onKeyDown={(e) => handleKeyDown(e, 'tempatLahir')}
                    ref={(el) => registerInput('tempatLahir', el)}
                  />
                </div>
                <div>
                  <Label>Tanggal Lahir</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Day Select */}
                    <Select 
                      value={form.tanggalLahir ? form.tanggalLahir.split('-')[2] : ''} 
                      onValueChange={(day) => {
                        if (!form.tanggalLahir) {
                          const today = new Date();
                          const year = today.getFullYear().toString();
                          const month = (today.getMonth() + 1).toString().padStart(2, '0');
                          setField('tanggalLahir', `${year}-${month}-${day}`);
                        } else {
                          const parts = form.tanggalLahir.split('-');
                          setField('tanggalLahir', `${parts[0]}-${parts[1]}-${day}`);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tgl" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(day => (
                          <SelectItem key={day} value={day}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Month Select */}
                    <Select 
                      value={form.tanggalLahir ? form.tanggalLahir.split('-')[1] : ''} 
                      onValueChange={(month) => {
                        if (!form.tanggalLahir) {
                          const today = new Date();
                          const year = today.getFullYear().toString();
                          const day = today.getDate().toString().padStart(2, '0');
                          setField('tanggalLahir', `${year}-${month}-${day}`);
                        } else {
                          const parts = form.tanggalLahir.split('-');
                          setField('tanggalLahir', `${parts[0]}-${month}-${parts[2]}`);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Bln" />
                      </SelectTrigger>
                      <SelectContent>
                        {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((month, index) => (
                          <SelectItem key={month} value={month}>
                            {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][index]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Year Select */}
                    <Select 
                      value={form.tanggalLahir ? form.tanggalLahir.split('-')[0] : ''} 
                      onValueChange={(year) => {
                        if (!form.tanggalLahir) {
                          const today = new Date();
                          const month = (today.getMonth() + 1).toString().padStart(2, '0');
                          const day = today.getDate().toString().padStart(2, '0');
                          setField('tanggalLahir', `${year}-${month}-${day}`);
                        } else {
                          const parts = form.tanggalLahir.split('-');
                          setField('tanggalLahir', `${year}-${parts[1]}-${parts[2]}`);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Thn" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: new Date().getFullYear() - 1950 + 1 }, (_, i) => (new Date().getFullYear() - i).toString()).map(year => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}


                {isFieldVisible('jenisKelamin') && (
                  <div>
                    <Label>Jenis Kelamin</Label>
                    <div className="flex gap-2 mt-1">
                      {['Laki-laki', 'Perempuan'].map(jk => (
                        <Button
                          key={jk}
                          type="button"
                          variant={form.jenisKelamin === jk ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setField('jenisKelamin', jk)}
                          className="flex-1"
                        >
                          {jk}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {isFieldVisible('kelas') && (
                  <div>
                    <Label>Kelas</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-1">
                      {KELAS_OPTIONS.map(k => (
                        <Button
                          key={k.value}
                          type="button"
                          variant={form.kelas === k.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setField('kelas', k.value)}
                          className="text-xs"
                        >
                          {k.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}


            {(isFieldVisible('noInduk') || isFieldVisible('nisn')) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isFieldVisible('noInduk') && (
                  <div>
                    <Label>No. Induk</Label>
                    <Input value={form.noInduk} onChange={e => { if (/^\d*$/.test(e.target.value)) setField('noInduk', e.target.value); }}
                      onKeyDown={(e) => handleKeyDown(e, 'noInduk')}
                      ref={(el) => registerInput('noInduk', el)}
                      inputMode="numeric" placeholder="Angka saja" />
                  </div>
                )}
                {isFieldVisible('nisn') && (
                  <div>
                    <Label>NISN</Label>
                    <Input value={form.nisn} onChange={e => { if (/^\d*$/.test(e.target.value)) setField('nisn', e.target.value); }}
                      onKeyDown={(e) => handleKeyDown(e, 'nisn')}
                      ref={(el) => registerInput('nisn', el)}
                      inputMode="numeric" placeholder="Angka saja" />
                  </div>
                )}
              </div>
            )}

            {isFieldVisible('namaOrangTua') && (
              <div>
                <Label>Nama Orang Tua/Wali</Label>
                <Input 
                  value={form.namaOrangTua} 
                  onChange={e => setField('namaOrangTua', capitalizeFirst(e.target.value))}
                  onKeyDown={(e) => handleKeyDown(e, 'namaOrangTua')}
                  ref={(el) => registerInput('namaOrangTua', el)}
                />
              </div>
            )}

            {isFieldVisible('alamat') && (
              <div>
                <Label>Alamat</Label>
                <Input 
                  value={form.alamat} 
                  onChange={e => setField('alamat', capitalizeFirst(e.target.value))}
                  onKeyDown={(e) => handleKeyDown(e, 'alamat')}
                  ref={(el) => registerInput('alamat', el)}
                />
              </div>
            )}

            {/* Custom biodata fields */}
            {customVisible.map(field => (
              <div key={field.key}>
                <Label>{field.label}</Label>
                <Input 
                  value={extraFields[field.key] || ''} 
                  onChange={e => setExtra(field.key, e.target.value)} 
                  onKeyDown={(e) => handleKeyDown(e, field.key)}
                  ref={(el) => registerInput(field.key, el)}
                  placeholder={field.label} 
                />
              </div>
            ))}

            {/* Always visible: Kepala Madrasah */}
            <div>
              <Label>Kepala Madrasah</Label>
              <Select value={form.kepalaMadrasahId} onValueChange={v => {
                setField('kepalaMadrasahId', v);
                // Submit form after selection
                setTimeout(() => {
                  const formEl = formRef.current;
                  if (formEl) formEl.requestSubmit();
                }, 100);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kepala madrasah" />
                </SelectTrigger>
                <SelectContent>
                  {data.settings.kepalaMadrasah.map(k => (
                    <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit">{isEdit ? 'Simpan Perubahan' : 'Simpan Surat'}</Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Batal</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TambahSurat;
