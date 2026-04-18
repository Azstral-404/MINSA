import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Outlet } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import kemenagLogo from '@/assets/kemenag-logo.png';
import { detectMadrasahInfo } from '@/lib/store';

export function Layout() {
  const { data, updateData, setTheme } = useApp();
  const isDark = data.settings.theme === 'dark';

  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  const setActiveTA = (val: string) => {
    updateData(d => ({ ...d, settings: { ...d.settings, activeTahunAjaran: val } }));
  };

  const headerLogoSrc = data.settings.customKemenagLogo || kemenagLogo;
  const schoolName = data.settings.schoolName || 'NAMA SEKOLAH';
  const isDefault = schoolName === 'NAMA SEKOLAH';

  const madrasahInfo = detectMadrasahInfo(schoolName);
  const subtitleText = !isDefault && madrasahInfo
    ? (madrasahInfo.isMadrasah ? `Kementerian Agama Kota ${madrasahInfo.city}` : 'Kementerian Pendidikan')
    : '';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-3 gap-2">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              {!isDefault && <img src={headerLogoSrc} alt="Logo" className="h-8 w-8 object-contain" />}
              <div className="hidden sm:block">
                <div className="font-bold text-sm text-foreground leading-tight">{schoolName.toUpperCase()}</div>
                {subtitleText && (
                  <div className="text-[10px] text-muted-foreground leading-tight">{subtitleText}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {data.settings.tahunAjaran.length > 0 && (
                <Select value={data.settings.activeTahunAjaran || ''} onValueChange={setActiveTA}>
                  <SelectTrigger className="h-8 text-xs w-[130px]">
                    <SelectValue placeholder="Tahun Ajaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.settings.tahunAjaran.map(t => (
                      <SelectItem key={t.id} value={t.label}>TA {t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
