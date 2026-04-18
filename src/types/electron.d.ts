/// <reference types="vite/client" />

export interface ElectronAPI {
  getDataPath: () => Promise<string>;
  chooseDataPath: () => Promise<string | null>;
  isElectron: boolean;
  getPrinters: () => Promise<PrinterInfo[]>;
  printDocument: (options: { printerName: string; copies: number; duplex: boolean }) => Promise<boolean>;
  printToPDF: (options: { pageSize: string; landscape: boolean }) => Promise<string | null>;
  saveTemplateDocx: (slug: string, base64: string) => Promise<void>;
  deleteTemplateDocx: (slug: string) => Promise<void>;
  readTemplateDocx: (slug: string) => Promise<string | null>;
  openTemplateDocx: (slug: string) => Promise<boolean>;
}

export interface PrinterInfo {
  name: string;
  description?: string;
  isDefault?: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
