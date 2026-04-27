/// <reference types="vite/client" />

interface ElectronAPI {

  getDataPath: () => Promise<string>;
  chooseDataPath: () => Promise<string | null>;
  isElectron: boolean;
  getPrinters: () => Promise<PrinterInfo[]>;
  printDocument: (options: { htmlContent: string; printerName?: string; copies: number; duplex: boolean }) => Promise<{ success: boolean; error?: string }>;
  printToPDF: (options: { htmlContent: string; pageSize: string; landscape?: boolean }) => Promise<{ success: boolean; data?: string; error?: string }>;
  saveTemplateDocx: (slug: string, base64: string) => Promise<void>;
  deleteTemplateDocx: (slug: string) => Promise<void>;
  readTemplateDocx: (slug: string) => Promise<string | null>;
  openTemplateDocx: (slug: string) => Promise<boolean>;
}

interface PrinterInfo {

  name: string;
  displayName?: string;
  status?: number;
  isDefault?: boolean;
  description?: string;
}


declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
