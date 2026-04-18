import React, { createContext, useContext } from 'react';
import { AppData, ThemeName, ColorTheme } from '@/lib/store';
import { useAppData } from '@/hooks/useAppData';

interface AppContextType {
  data: AppData;
  updateData: (updater: (prev: AppData) => AppData) => void;
  setTheme: (theme: ThemeName) => void;
  setColorTheme: (colorTheme: ColorTheme) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data, updateData, setTheme, setColorTheme } = useAppData();
  return (
    <AppContext.Provider value={{ data, updateData, setTheme, setColorTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
