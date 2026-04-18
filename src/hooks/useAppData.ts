import { useState, useCallback, useEffect, useRef } from 'react';
import { AppData, loadData, loadDataAsync, saveData, ThemeName, ColorTheme } from '@/lib/store';

export function useAppData() {
  const [data, setData] = useState<AppData>(loadData);
  const isFirstLoad = useRef(true);

  // On mount: load from Electron file storage (async) if available
  useEffect(() => {
    loadDataAsync().then((loaded) => {
      setData(loaded);
    });
  }, []);

  // Save on every change EXCEPT the very first render (avoid overwriting with empty defaults)
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    saveData(data);
  }, [data]);

  // Sync Electron native title bar with theme changes (ThemeProvider handles DOM)
  useEffect(() => {
    if (window.electronAPI?.setNativeTheme) {
      window.electronAPI.setNativeTheme(data.settings.theme === 'dark' ? 'dark' : 'light');
    }
  }, [data.settings.theme]);

  const updateData = useCallback((updater: (prev: AppData) => AppData) => {
    setData(prev => updater(prev));
  }, []);

  const setTheme = useCallback((theme: ThemeName) => {
    updateData(d => ({ ...d, settings: { ...d.settings, theme } }));
  }, [updateData]);

  const setColorTheme = useCallback((colorTheme: ColorTheme) => {
    updateData(d => ({ ...d, settings: { ...d.settings, colorTheme } }));
  }, [updateData]);

  return { data, updateData, setTheme, setColorTheme };
}
