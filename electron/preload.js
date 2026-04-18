/**
 * MINSA Surat Manager — Electron Preload Script
 * Bridges secure IPC from renderer to main process
 */

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Environment flag ────────────────────────────────────────────────────────
  isElectron: true,

  // ── Data path management ────────────────────────────────────────────────────
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  chooseDataPath: () => ipcRenderer.invoke('choose-data-path'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),

  // ── File-based JSON storage ─────────────────────────────────────────────────
  // These replace localStorage for reliable, persistent, file-based storage
  storageRead: () => ipcRenderer.invoke('storage-read'),
  storageWrite: (jsonString) => ipcRenderer.invoke('storage-write', jsonString),

  // ── Backup / Restore ────────────────────────────────────────────────────────
  exportData: (jsonString) => ipcRenderer.invoke('storage-export', jsonString),
  importData: () => ipcRenderer.invoke('storage-import'),

  // ── App info ────────────────────────────────────────────────────────────────
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // ── Native theme sync ───────────────────────────────────────────────────────
  setNativeTheme: (theme) => ipcRenderer.invoke('set-native-theme', theme),

  // ── Print functionality ─────────────────────────────────────────────────────

  // Returns the list of system printers
  getPrinters: () => ipcRenderer.invoke('get-printers'),

  // Prints a document — pass { htmlContent, printerName?, copies?, duplex? }
  printDocument: (options) => ipcRenderer.invoke('print-document', options),

  // Exports to PDF — pass { htmlContent, pageSize?, landscape? }
  // Returns { success, data (base64 PDF), error? }
  printToPDF: (options) => ipcRenderer.invoke('print-to-pdf', options),

  // Returns current print queue jobs for a named printer (one-shot)
  getPrinterQueue: (printerName) => ipcRenderer.invoke('get-printer-queue', printerName),

  // Start live queue monitoring — fires 'queue-update' events every 2s
  startQueueMonitor: (printerName) => ipcRenderer.send('start-queue-monitor', printerName),

  // Stop live queue monitoring
  stopQueueMonitor: () => ipcRenderer.send('stop-queue-monitor'),

  // Listen for queue-update events: callback({ printer, jobs: [{jobId, document, status, totalPages, pagesPrinted}] })
  onQueueUpdate: (callback) => ipcRenderer.on('queue-update', (_event, data) => callback(data)),

  // Remove queue-update listener
  offQueueUpdate: () => ipcRenderer.removeAllListeners('queue-update'),

  // ── Menu actions ────────────────────────────────────────────────────────────
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (_event, action) => callback(action)),

  // ── DOCX Template Management ─────────────────────────────────────────────────
  // Save a base64 docx to the data/templates/ folder
  saveTemplateDocx: (slug, base64) => ipcRenderer.invoke('save-template-docx', slug, base64),
  // Open the saved .docx in the system default app (MS Word / LibreOffice)
  openTemplateDocx: (slug) => ipcRenderer.invoke('open-template-docx', slug),
  // Read back the (possibly edited) .docx as base64
  readTemplateDocx: (slug) => ipcRenderer.invoke('read-template-docx', slug),
  // Delete the .docx template file
  deleteTemplateDocx: (slug) => ipcRenderer.invoke('delete-template-docx', slug),
});
