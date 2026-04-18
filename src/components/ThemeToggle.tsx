/**
 * ThemeToggle — simple dark/light button using AppContext directly.
 * Drop it anywhere: <ThemeToggle />
 */
import { useApp } from '@/contexts/AppContext';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { data, setTheme } = useApp();
  const isDark = data.settings.theme !== 'light';

  return (
    <Button
      variant="ghost"
      size="icon"
      title="Ganti tema"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
