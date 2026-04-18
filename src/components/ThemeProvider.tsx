/**
 * ThemeProvider
 * ─────────────
 * Reads theme state directly from AppContext (data.settings.theme and
 * data.settings.colorTheme) and applies them to the DOM.
 *
 * This is the correct approach because Pengaturan.tsx already calls
 * setTheme() / setColorTheme() from AppContext — those save to the store.
 * This component just watches the store and reacts.
 *
 * No next-themes needed — we own the DOM directly.
 */

import { useEffect, type ReactNode } from 'react';
import { useApp } from '@/contexts/AppContext';

// ── Color palette CSS variables per theme ─────────────────────────────────────
// Each entry maps a colorTheme value → its primary HSL numbers (H S% L%)
const COLOR_VARS: Record<string, { primary: string; ring: string; sidebarPrimary: string }> = {
  default:  { primary: '221.2 83.2% 53.3%', ring: '221.2 83.2% 53.3%', sidebarPrimary: '224.3 76.3% 48%' },
  slate:    { primary: '215.3 25% 46.9%',   ring: '215.3 25% 46.9%',   sidebarPrimary: '215.3 25% 40%'   },
  zinc:     { primary: '240 5.2% 50%',    ring: '240 5.2% 50%',    sidebarPrimary: '240 5.2% 43%'    },
  indigo:   { primary: '243.4 75.4% 58.6%', ring: '243.4 75.4% 58.6%', sidebarPrimary: '243.4 75.4% 50%' },
  cyan:     { primary: '188.7 94.5% 42.7%', ring: '188.7 94.5% 42.7%', sidebarPrimary: '188.7 94.5% 36%' },
  amber:    { primary: '37.7 92.1% 50.2%',  ring: '37.7 92.1% 50.2%',  sidebarPrimary: '37.7 92.1% 44%'  },
  sunset:   { primary: '24.6 95% 53.1%',    ring: '24.6 95% 53.1%',    sidebarPrimary: '24.6 95% 46%'    },
  rose:     { primary: '346.8 77.2% 49.8%', ring: '346.8 77.2% 49.8%', sidebarPrimary: '346.8 77.2% 43%' },
  emerald:  { primary: '160.1 84.1% 39.4%', ring: '160.1 84.1% 39.4%', sidebarPrimary: '160.1 84.1% 33%' },
  teal:     { primary: '172.5 66% 50.4%',   ring: '172.5 66% 50.4%',   sidebarPrimary: '172.5 66% 43%'   },
  lime:     { primary: '84.5 81.6% 44.3%',  ring: '84.5 81.6% 44.3%',  sidebarPrimary: '84.5 81.6% 37%'  },
  royal:    { primary: '271.5 91.7% 65.1%', ring: '271.5 91.7% 65.1%', sidebarPrimary: '271.5 91.7% 56%' },
  fuchsia:  { primary: '292.2 84.1% 60.6%', ring: '292.2 84.1% 60.6%', sidebarPrimary: '292.2 84.1% 52%' },
  ocean:    { primary: '199.4 94% 47.8%',   ring: '199.4 94% 47.8%',   sidebarPrimary: '199.4 94% 40%'   },
  gold:     { primary: '45.7 72% 52.7%',    ring: '45.7 72% 52.7%',    sidebarPrimary: '45.7 72% 45%'    },
  silver:   { primary: '0 0% 75.3%',        ring: '0 0% 75.3%',        sidebarPrimary: '0 0% 66%'        },
  bronze:   { primary: '29.2 42.9% 50.2%',  ring: '29.2 42.9% 50.2%',  sidebarPrimary: '29.2 42.9% 43%'  },
  magenta:  { primary: '300 100% 50%',      ring: '300 100% 50%',      sidebarPrimary: '300 100% 42%'    },
  peach:    { primary: '22.8 100% 73.3%',   ring: '22.8 100% 73.3%',   sidebarPrimary: '22.8 100% 63%'   },
  mint:     { primary: '120 100% 68.2%',    ring: '120 100% 68.2%',    sidebarPrimary: '120 100% 55%'    },
  lavender: { primary: '281.8 62.2% 67.1%', ring: '281.8 62.2% 67.1%', sidebarPrimary: '281.8 62.2% 58%' },
  charcoal: { primary: '0 0% 20%',          ring: '0 0% 20%',          sidebarPrimary: '0 0% 14%'        },
  coral:    { primary: '16.1 100% 65.9%',   ring: '16.1 100% 65.9%',   sidebarPrimary: '16.1 100% 55%'   },
  olive:    { primary: '78.2 26.5% 35.3%',  ring: '78.2 26.5% 35.3%',  sidebarPrimary: '78.2 26.5% 28%'  },
};

/** Convert a hex color to HSL string like "H S% L%" */
function hexToHsl(hex: string): string | null {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m || m.length < 3) return null;
  const r = parseInt(m[0], 16) / 255;
  const g = parseInt(m[1], 16) / 255;
  const b = parseInt(m[2], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyTheme(isDark: boolean, colorTheme: string, customColor?: string) {
  const root = document.documentElement;

  // 1. dark / light class on <html>
  root.classList.toggle('dark',  isDark);
  root.classList.toggle('light', !isDark);
  root.dataset.theme = colorTheme || 'default';

  // 2. color-scheme so native browser UI (scrollbars, inputs) follows
  root.style.colorScheme = isDark ? 'dark' : 'light';

  // 3. Electron native title bar
  window.electronAPI?.setNativeTheme?.(isDark ? 'dark' : 'light');

  // 4. Apply color theme CSS variables
  let vars = COLOR_VARS[colorTheme] ?? COLOR_VARS['default'];
  
  if (colorTheme === 'custom' && customColor) {
    const hsl = hexToHsl(customColor);
    if (hsl) {
      // Darken slightly for sidebar
      const parts = hsl.split(' ');
      const l = parseFloat(parts[2]);
      const darkerL = Math.max(l - 8, 5);
      const sidebarHsl = `${parts[0]} ${parts[1]} ${darkerL}%`;
      vars = { primary: hsl, ring: hsl, sidebarPrimary: sidebarHsl };
    }
  }
  root.style.setProperty('--primary',         vars.primary);
  root.style.setProperty('--ring',            vars.ring);
  root.style.setProperty('--sidebar-primary', vars.sidebarPrimary);
  // sidebar-ring matches ring
  root.style.setProperty('--sidebar-ring',    vars.ring);
}

// ── Scrollbar fade-on-scroll ──────────────────────────────────────────────────
function useScrollbarFade() {
  useEffect(() => {
    const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>();

    const onScroll = (e: Event) => {
      const el = e.target as Element;
      if (!el || el instanceof Document || el === document.body) return;
      el.classList.add('scrolling');
      const prev = timers.get(el);
      if (prev) clearTimeout(prev);
      timers.set(el, setTimeout(() => {
        el.classList.remove('scrolling');
        timers.delete(el);
      }, 800));
    };

    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', onScroll, { capture: true });
  }, []);
}

// ── Inner component — needs to be inside AppProvider ─────────────────────────
function ThemeApplier() {
  const { data } = useApp();
  const isDark = data.settings.theme !== 'light';
  const colorTheme = (data.settings.colorTheme as string) || 'default';
  const customColor = data.settings.customThemeColor || '';

  useEffect(() => {
    applyTheme(isDark, colorTheme, customColor);
  }, [isDark, colorTheme, customColor]);

  useScrollbarFade();
  return null;
}

// ── Public ThemeProvider ──────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <ThemeApplier />
      {children}
    </>
  );
}
