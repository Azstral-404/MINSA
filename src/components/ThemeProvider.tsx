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

function generateFullPalette(h: number, s: number, l: number, isDark: boolean) {
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  
  // Primary variants
  const primaryL = isDark ? clamp(l + 25, 40, 70) : clamp(l, 40, 60);
  const primary = `${Math.round(h)} ${Math.round(s)}% ${Math.round(primaryL)}%`;
  
  // Primary foreground (contrast)
  const primaryFgL = isDark ? 98 : 10;
  const primaryFg = `${Math.round(h)} ${Math.round(s * 0.2)}% ${primaryFgL}%`;
  
  // Secondary (adjacent hue)
  const secH = (h + (isDark ? 20 : -20) + 360) % 360;
  const secL = isDark ? clamp(l - 20, 15, 25) : clamp(l + 30, 90, 98);
  const secondary = `${Math.round(secH)} ${Math.round(s * 0.6)}% ${Math.round(secL)}%`;
  const secondaryFg = isDark ? '210 40% 98%' : primary;
  
  // Muted/Accent (grayish)
  const mutedL = isDark ? clamp(l - 25, 15, 20) : clamp(l + 35, 92, 98);
  const muted = `210 40% ${Math.round(mutedL)}%`;
  const mutedFg = isDark ? '215 20% 65%' : `215 16% 47%`;
  
  // Backgrounds
  const bgL = isDark ? clamp(l - 30, 4, 8) : '100%';
  const background = `${Math.round(h * 0.1)} 10% ${bgL}`;
  const foreground = isDark ? '210 40% 98%' : `222 84% 5%`;
  
  // Card/Popover
  const cardL = isDark ? bgL : '100%';
  const card = background;
  const cardFg = foreground;
  
  // Destructive (red)
  const destructive = isDark ? '0 62.8% 30.6%' : '0 84.2% 60.2%';
  const destructiveFg = isDark ? '210 40% 98%' : '210 40% 98%';
  
  // Border/Input (subtle)
  const borderL = isDark ? clamp(l - 20, 15, 20) : clamp(l + 20, 85, 95);
  const border = `${Math.round(h * 0.2)} 32% ${Math.round(borderL)}%`;
  const input = border;
  
  // Ring (primary glow)
  const ring = primary;
  
  // Radius (fixed)
  const radius = '0.5rem';
  
  // Sidebar variants
  const sidebarBgL = isDark ? clamp(l - 10, 8, 12) : clamp(l + 20, 95, 98);
  const sidebarBg = `${Math.round(h * 0.05)} 5% ${Math.round(sidebarBgL)}%`;
  const sidebarFg = foreground;
  const sidebarPrimary = primary;
  const sidebarPrimaryFg = primaryFg;
  const sidebarAccentL = isDark ? clamp(l - 15, 12, 18) : clamp(l + 15, 90, 96);
  const sidebarAccent = `${Math.round(h * 0.1)} 4% ${Math.round(sidebarAccentL)}%`;
  const sidebarAccentFg = sidebarFg;
  const sidebarBorder = border;
  const sidebarRing = ring;
  
  return {
    '--background': background,
    '--foreground': foreground,
    '--card': card,
    '--card-foreground': cardFg,
    '--popover': card,
    '--popover-foreground': cardFg,
    '--primary': primary,
    '--primary-foreground': primaryFg,
    '--secondary': secondary,
    '--secondary-foreground': secondaryFg,
    '--muted': muted,
    '--muted-foreground': mutedFg,
    '--accent': muted,
    '--accent-foreground': mutedFg,
    '--destructive': destructive,
    '--destructive-foreground': destructiveFg,
    '--border': border,
    '--input': input,
    '--ring': ring,
    '--radius': radius,
    '--sidebar-background': sidebarBg,
    '--sidebar-foreground': sidebarFg,
    '--sidebar-primary': sidebarPrimary,
    '--sidebar-primary-foreground': sidebarPrimaryFg,
    '--sidebar-accent': sidebarAccent,
    '--sidebar-accent-foreground': sidebarAccentFg,
    '--sidebar-border': sidebarBorder,
    '--sidebar-ring': sidebarRing,
  };
}

function applyTheme(isDark: boolean, colorTheme: string, customColor?: string) {
  const root = document.documentElement;

  // 1. dark / light class on <html>
  root.classList.toggle('dark',  isDark);
  root.classList.toggle('light', !isDark);
  root.dataset.theme = colorTheme === 'custom' ? 'custom' : (colorTheme || 'default');

  // 2. color-scheme so native browser UI (scrollbars, inputs) follows
  root.style.colorScheme = isDark ? 'dark' : 'light';

  // 3. Electron native title bar
  if (window.electronAPI?.setNativeTheme) {
    window.electronAPI.setNativeTheme(isDark ? 'dark' : 'light');
  }

  // 4. Apply CSS variables
  if (colorTheme === 'custom' && customColor) {
    const hsl = hexToHsl(customColor);
    if (hsl) {
      const [hStr, sStr, lStr] = hsl.split(' ');
      const h = parseFloat(hStr);
      const s = parseFloat(sStr.replace('%', ''));
      const l = parseFloat(lStr.replace('%', ''));
      
      // Generate full palette
      const palette = generateFullPalette(h, s, l, isDark);
      
      // Apply all vars
      Object.entries(palette).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
      
      return; // Skip preset vars
    }
  }
  
  // Preset themes (partial - but CSS index.css provides full)
  const vars = COLOR_VARS[colorTheme] ?? COLOR_VARS['default'];
  root.style.setProperty('--primary', vars.primary);
  root.style.setProperty('--ring', vars.ring);
  root.style.setProperty('--sidebar-primary', vars.sidebarPrimary);
  root.style.setProperty('--sidebar-ring', vars.ring);
  
// For preset themes, reset all custom vars so CSS [data-theme=xxx] takes over
  ['--background', '--foreground', '--card', '--card-foreground', '--popover', '--popover-foreground', 
   '--primary', '--primary-foreground', '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
   '--accent', '--accent-foreground', '--destructive', '--destructive-foreground', '--border', '--input',
   '--ring', '--sidebar-background', '--sidebar-foreground', '--sidebar-primary', '--sidebar-primary-foreground',
   '--sidebar-accent', '--sidebar-accent-foreground', '--sidebar-border', '--sidebar-ring'].forEach(prop => {
    root.style.removeProperty(prop);
  });
  
  root.style.setProperty('--primary', vars.primary);
  root.style.setProperty('--ring', vars.ring);
  root.style.setProperty('--sidebar-primary', vars.sidebarPrimary);
  root.style.setProperty('--sidebar-ring', vars.ring);
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
