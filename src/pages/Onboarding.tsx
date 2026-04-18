import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const Onboarding = () => {
  const { updateData } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nsm, setNsm] = useState('');
  const [npsn, setNpsn] = useState('');

  const handleSubmit = () => {
    if (!username.trim()) { toast.error('Username wajib diisi'); return; }
    if (!password.trim()) { toast.error('Password wajib diisi'); return; }
    if (password !== passwordConfirm) { toast.error('Password tidak cocok'); return; }
    if (password.length < 6) { toast.error('Password minimal 6 karakter'); return; }

    const appName = 'MANAJEMEN SURAT';
    const schoolName = username.trim();

    updateData(d => ({
      ...d,
      settings: {
        ...d.settings,
        appName,
        schoolName,
        username: username.trim(),
        password: btoa(password.trim()), // Simple base64 encoding for storage
        kabupaten: '',
        nsm: nsm.trim(),
        npsn: npsn.trim(),
        onboarded: true,
        suratHeader: {
          ...d.settings.suratHeader,
          line1: '',
          line2: '',
          school: schoolName.toUpperCase(),
          schoolSub: '',
        },
      },
    }));
    toast.success('Akun berhasil dibuat! Selamat datang.');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Selamat Datang 👋</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Buat akun untuk memulai menggunakan aplikasi.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label>Username</Label>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="cth: admin"
              className="mt-1"
              type="text"
            />
            <p className="text-xs text-muted-foreground mt-1">Username untuk login ke aplikasi. Juga digunakan sebagai nama sekolah.</p>
          </div>

          <div>
            <Label>Password</Label>
            <div className="relative mt-1">
              <Input
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                type={showPassword ? "text" : "password"}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pastikan password kuat dan aman.</p>
          </div>

          <div>
            <Label>Konfirmasi Password</Label>
            <Input
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              placeholder="Masukkan ulang password"
              type={showPassword ? "text" : "password"}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Pastikan kedua password sama.</p>
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
            Buat Akun & Mulai
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
