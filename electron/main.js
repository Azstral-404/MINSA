/**
 * MINSA Surat Manager — Electron Main Process
 * Optimized for Windows 10/11, offline-first, lightweight
 */

'use strict';

const { app, BrowserWindow, shell, ipcMain, dialog, nativeTheme, Menu } = require('electron');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

// ── App icon — must be set before app is ready ────────────────────────────────
// This prevents the default Electron icon from appearing in taskbar/title bar
if (process.platform === 'win32') {
  app.setAppUserModelId('com.azstral.minsa');
}

// ── Windows 10/11 optimizations ──────────────────────────────────────────────
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');

// ── Enable WinRT PDF support for crisp printing on Windows 10/11 ─────────────
// Required so webContents.print() generates vector PDF instead of GDI bitmap
if (app.enableWindowsRuntime) {
  try { app.enableWindowsRuntime(); } catch (_) {}
}

// ── Single instance lock ──────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

// ── App metadata ──────────────────────────────────────────────────────────────
const isDev       = !app.isPackaged;
const APP_NAME    = 'MINSA-Surat-Manager';
const APP_VERSION = app.getVersion();

// ── Data path management ──────────────────────────────────────────────────────
const DATA_PATH_CONFIG_DIR  = path.join(app.getPath('appData'), 'AZSTRAL-MINSA');
const DATA_PATH_CONFIG_FILE = path.join(DATA_PATH_CONFIG_DIR, 'data-path.txt');
let customDataPath = null;

function getEffectiveDataDir() {
  return customDataPath || path.join(app.getPath('appData'), APP_NAME);
}
function getDataFile() {
  return path.join(getEffectiveDataDir(), 'minsa-data.json');
}
function loadCustomDataPath() {
  try {
    if (fs.existsSync(DATA_PATH_CONFIG_FILE)) {
      const p = fs.readFileSync(DATA_PATH_CONFIG_FILE, 'utf8').trim();
      if (p && fs.existsSync(p)) { customDataPath = p; app.setPath('userData', p); }
    }
  } catch { /* ignore */ }
}
function saveCustomDataPath(p) {
  try {
    fs.mkdirSync(DATA_PATH_CONFIG_DIR, { recursive: true });
    fs.writeFileSync(DATA_PATH_CONFIG_FILE, p, 'utf8');
    customDataPath = p;
    app.setPath('userData', p);
  } catch { /* ignore */ }
}
loadCustomDataPath();

// ── Asset loader ──────────────────────────────────────────────────────────────
function imageToDataUrl(...candidates) {
  for (const p of candidates) {
    if (!p) continue;
    try {
      if (fs.existsSync(p)) {
        const mime = path.extname(p).toLowerCase() === '.ico' ? 'image/x-icon' : 'image/png';
        return 'data:' + mime + ';base64,' + fs.readFileSync(p).toString('base64');
      }
    } catch (e) { /* try next */ }
  }
  return '';
}

// Logo lives in electron/minsa-logo.png — always packaged via "electron/**/*"
const splashLogoDataUrl = imageToDataUrl(
  path.join(__dirname, 'minsa-logo.png'),
  path.join(__dirname, 'minsa-splash.png'),
  path.join(__dirname, '../src/assets/minsa-logo.png'),
  path.join(__dirname, '../src/assets/minsa-splash.png'),
  path.join(__dirname, '../public/minsa-logo.png')
);

// Icon path — resolved in priority order for packaged vs dev
// electron-builder puts extraResources in resources/ next to app.asar
const ICON_PATH = (() => {
  const resourcesDir = process.resourcesPath || path.join(__dirname, '../..');
  const candidates = [
    path.join(resourcesDir, 'icon.ico'),              // extraResources in packaged app
    path.join(__dirname, 'minsa-icon.ico'),            // electron/ in asar
    path.join(__dirname, '../public/minsa-icon.ico'),  // dev mode
    path.join(__dirname, '../build-resources/icon.ico'), // dev build-resources
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch { /* skip */ }
  }
  return '';
})();

// ── Window state ──────────────────────────────────────────────────────────────
let splashWin       = null;
let mainWin         = null;
let splashStartTime = 0;
const SPLASH_MS     = 2500; // logo shows for 2.5 seconds then main window opens

// ── Splash — logo only, fully transparent, no chrome ─────────────────────────
function createSplash() {
  splashWin = new BrowserWindow({
    width:       400,
    height:      300,
    frame:       false,
    transparent: true,
    resizable:   false,
    movable:     false,
    alwaysOnTop: true,
    center:      true,
    skipTaskbar: true,
    show:        false,
    hasShadow:   false,
    ...(ICON_PATH ? { icon: ICON_PATH } : {}),
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      devTools:         false,
    },
  });

  splashWin.loadURL(
    'data:text/html;charset=utf-8,' + encodeURIComponent(makeSplashHtml(splashLogoDataUrl))
  );

  splashWin.once('ready-to-show', () => splashWin && splashWin.show());
  splashWin.on('closed', () => { splashWin = null; });
}

function makeSplashHtml(logo) {
  // Completely transparent page — just the logo centred, softly glowing, gently floating
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'html,body{width:400px;height:300px;background:transparent;overflow:hidden;user-select:none}' +
    'body{display:flex;align-items:center;justify-content:center}' +
    'img{' +
    '  width:320px;height:auto;' +
    '  animation:pop .5s cubic-bezier(.34,1.56,.64,1) both, float 3s ease-in-out .5s infinite;' +
    '  filter:drop-shadow(0 8px 32px rgba(160,100,255,.5)) drop-shadow(0 2px 12px rgba(100,210,255,.35));' +
    '}' +
    '@keyframes pop{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:scale(1)}}' +
    '@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}' +
    '</style></head><body>' +
    '<img src="' + logo + '" alt="MINSA">' +
    '</body></html>';
}

// ── Main window ───────────────────────────────────────────────────────────────
function createMainWindow() {
  // Set the dock/taskbar icon at the app level so it overrides Electron's default
  if (ICON_PATH) {
    try {
      const { nativeImage } = require('electron');
      const appIcon = nativeImage.createFromPath(ICON_PATH);
      if (!appIcon.isEmpty()) app.dock && app.dock.setIcon(appIcon); // macOS
      // On Windows, icon is driven by the BrowserWindow icon + AppUserModelId
    } catch { /* ignore */ }
  }

  mainWin = new BrowserWindow({
    width:     1280,
    height:    800,
    minWidth:  960,
    minHeight: 620,
    show:      false,
    backgroundColor: '#0f172a',
    roundedCorners:  true,
    ...(ICON_PATH ? { icon: ICON_PATH } : {}),
    webPreferences: {
      nodeIntegration:             false,
      contextIsolation:            true,
      preload:                     path.join(__dirname, 'preload.js'),
      devTools:                    isDev,
      webSecurity:                 true,
      allowRunningInsecureContent: false,
      experimentalFeatures:        false,
      backgroundThrottling:        false,
    },
    title: 'MINSA Surat Manager',
  });

  if (isDev) {
    mainWin.loadURL('http://localhost:8080');
    mainWin.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWin.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWin.webContents.on('will-navigate', (event, url) => {
    const base = isDev ? 'http://localhost:8080' : 'file://';
    if (!url.startsWith(base) && !url.startsWith('file://')) event.preventDefault();
  });

  mainWin.once('ready-to-show', () => {
    const elapsed   = Date.now() - splashStartTime;
    const remaining = Math.max(SPLASH_MS - elapsed, 300);
    setTimeout(() => {
      if (splashWin && !splashWin.isDestroyed()) splashWin.close();
      if (mainWin  && !mainWin.isDestroyed())   { mainWin.show(); mainWin.focus(); }
    }, remaining);
  });

  mainWin.on('closed', () => { mainWin = null; });
  setupMenu(mainWin);
}

// ── Menu (hidden, toggle with Alt) ────────────────────────────────────────────
function setupMenu(win) {
  let visible = false;
  const menu = Menu.buildFromTemplate([
    { label: 'File', submenu: [
      { label: 'New Letter', accelerator: 'CmdOrCtrl+N', click: () => win.webContents.send('menu-action', 'new-letter') },
      { type: 'separator' },
      { label: 'Export PDF', accelerator: 'CmdOrCtrl+P', click: () => win.webContents.send('menu-action', 'export-pdf') },
      { type: 'separator' },
      { label: 'Exit', accelerator: 'Alt+F4', click: () => app.quit() },
    ]},
    { label: 'Edit', submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
    ]},
    { label: 'View', submenu: [
      { role: 'reload' }, { role: 'forceReload' }, { type: 'separator' },
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' },
      { role: 'togglefullscreen' },
    ]},
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'close' }] },
    { label: 'Help', submenu: [{
      label: 'About MINSA Surat Manager',
      click: () => dialog.showMessageBox(win, {
        type: 'info', title: 'About MINSA Surat Manager',
        message: 'MINSA Surat Manager v' + APP_VERSION,
        detail: 'Aplikasi pengelola surat untuk sekolah/madrasah\n\n\u00A9 2025 AZSTRAL',
      }),
    }]},
  ]);
  Menu.setApplicationMenu(null);
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.key === 'Alt' && input.type === 'keyDown') {
      visible = !visible;
      Menu.setApplicationMenu(visible ? menu : null);
    }
  });
}

// ── Second instance ───────────────────────────────────────────────────────────
app.on('second-instance', () => {
  if (mainWin) { if (mainWin.isMinimized()) mainWin.restore(); mainWin.focus(); }
});

// ── IPC ───────────────────────────────────────────────────────────────────────
ipcMain.handle('get-data-path', () => getEffectiveDataDir());

ipcMain.handle('choose-data-path', async () => {
  if (!mainWin) return null;
  const r = await dialog.showOpenDialog(mainWin, {
    title: 'Pilih Folder Penyimpanan Data',
    defaultPath: customDataPath || app.getPath('documents'),
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Pilih Folder Ini',
  });
  if (!r.canceled && r.filePaths[0]) { saveCustomDataPath(r.filePaths[0]); return r.filePaths[0]; }
  return null;
});

ipcMain.handle('storage-read', () => {
  try { const f = getDataFile(); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; }
  catch { return null; }
});

ipcMain.handle('storage-write', (_e, json) => {
  try {
    fs.mkdirSync(getEffectiveDataDir(), { recursive: true });
    const f = getDataFile(), tmp = f + '.tmp';
    fs.writeFileSync(tmp, json, 'utf8');
    fs.renameSync(tmp, f);
    return true;
  } catch (e) { console.error('storage-write:', e); return false; }
});

ipcMain.handle('storage-export', async (_e, json) => {
  if (!mainWin) return false;
  const r = await dialog.showSaveDialog(mainWin, {
    title: 'Ekspor Data MINSA',
    defaultPath: path.join(app.getPath('documents'), 'minsa-backup-' + Date.now() + '.json'),
    filters: [{ name: 'JSON Data', extensions: ['json'] }],
    buttonLabel: 'Simpan Backup',
  });
  if (r.canceled || !r.filePath) return false;
  try { fs.writeFileSync(r.filePath, json, 'utf8'); return r.filePath; } catch { return false; }
});

ipcMain.handle('storage-import', async () => {
  if (!mainWin) return null;
  const r = await dialog.showOpenDialog(mainWin, {
    title: 'Impor Data MINSA',
    defaultPath: app.getPath('documents'),
    properties: ['openFile'],
    filters: [{ name: 'JSON Data', extensions: ['json'] }],
    buttonLabel: 'Impor File Ini',
  });
  if (r.canceled || !r.filePaths[0]) return null;
  try { return fs.readFileSync(r.filePaths[0], 'utf8'); } catch { return null; }
});

ipcMain.handle('open-data-folder', () => {
  const d = getEffectiveDataDir(); fs.mkdirSync(d, { recursive: true }); shell.openPath(d);
});

ipcMain.handle('get-app-info', () => ({
  version: APP_VERSION, dataPath: getEffectiveDataDir(),
  platform: process.platform, arch: process.arch, osVersion: os.release(),
}));

ipcMain.handle('set-native-theme', (_e, theme) => { nativeTheme.themeSource = theme; });

// ── DOCX Template Management ──────────────────────────────────────────────────
// Templates stored as .docx files in a "templates" subfolder of the data dir.
// Renderer sends/receives them as base64 strings.

function getTemplatesDir() {
  return path.join(getEffectiveDataDir(), 'templates');
}
function getTemplateFilePath(slug) {
  return path.join(getTemplatesDir(), slug + '.docx');
}

ipcMain.handle('save-template-docx', (_e, slug, base64Data) => {
  try {
    const dir = getTemplatesDir();
    fs.mkdirSync(dir, { recursive: true });
    const filePath = getTemplateFilePath(slug);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    return filePath;
  } catch (err) {
    console.error('[MINSA] save-template-docx error:', err);
    return false;
  }
});

ipcMain.handle('open-template-docx', (_e, slug) => {
  try {
    const filePath = getTemplateFilePath(slug);
    if (!fs.existsSync(filePath)) return false;
    shell.openPath(filePath);
    return true;
  } catch (err) {
    console.error('[MINSA] open-template-docx error:', err);
    return false;
  }
});

ipcMain.handle('read-template-docx', (_e, slug) => {
  try {
    const filePath = getTemplateFilePath(slug);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath).toString('base64');
  } catch (err) {
    console.error('[MINSA] read-template-docx error:', err);
    return null;
  }
});

ipcMain.handle('delete-template-docx', (_e, slug) => {
  try {
    const filePath = getTemplateFilePath(slug);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return true;
  } catch (err) {
    console.error('[MINSA] delete-template-docx error:', err);
    return false;
  }
});

ipcMain.handle('get-printers', async () => {
  const { execFile } = require('child_process');

  // ── Method 1: wmic CSV ────────────────────────────────────────────────────
  // wmic printer get ... /format:csv outputs:
  //   Node,Default,DriverName,Name,PrinterStatus,WorkOffline
  // First row = headers (starts with "Node"), subsequent rows = data
  // PrinterStatus WMI values: 1=Other,2=Unknown,3=Idle,4=Printing,5=Warmup,
  //                            6=StoppedPrinting,7=Offline
  const wmicQuery = () => new Promise((resolve) => {
    execFile('wmic', [
      'printer', 'get',
      'Name,Default,PrinterStatus,DriverName,WorkOffline',
      '/format:csv',
    ], { timeout: 6000, encoding: 'utf8', windowsHide: true }, (err, stdout) => {
      if (err || !stdout.trim()) { resolve(null); return; }
      try {
        // Split into non-empty lines, strip \r
        const lines = stdout.split('\n')
          .map(l => l.replace(/\r/g, '').trim())
          .filter(Boolean);
        if (lines.length < 2) { resolve(null); return; }

        // Header row — wmic csv always starts with "Node" as first column
        const header = lines[0].split(',').map(h => h.trim().toLowerCase());

        const printers = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          // Pad cols to header length
          while (cols.length < header.length) cols.push('');
          const row = {};
          header.forEach((h, idx) => { row[h] = (cols[idx] || '').trim(); });

          // Skip header repeat rows or empty names
          const name = row['name'] || '';
          if (!name || name === 'Name') continue;

          // WorkOffline TRUE means printer is set offline in Windows
          const offline = row['workoffline']?.toUpperCase() === 'TRUE';
          // Raw WMI PrinterStatus (1-7)
          const rawStatus = parseInt(row['printerstatus']) || 3;
          // Map to our status: 3=Idle(green), 7=Offline(red), others
          const status = offline ? 7 : rawStatus;

          printers.push({
            name,
            displayName:  name,
            status,
            // wmic Default column: "TRUE" or "FALSE"
            isDefault:    row['default']?.toUpperCase() === 'TRUE',
            description:  row['drivername'] || '',
          });
        }
        resolve(printers.length ? printers : null);
      } catch (e) {
        console.error('wmic parse error:', e);
        resolve(null);
      }
    });
  });

  // ── Method 2: reg query fallback ─────────────────────────────────────────
  const regQuery = () => new Promise((resolve) => {
    execFile('reg', [
      'query', 'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Windows',
      '/v', 'Device',
    ], { timeout: 3000, encoding: 'utf8', windowsHide: true }, (err, defOut) => {
      const defMatch = (defOut || '').match(/Device\s+REG_SZ\s+(.+)/);
      const defaultPrinter = defMatch ? defMatch[1].trim().split(',')[0].trim() : '';

      execFile('reg', [
        'query', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Print\\Printers',
      ], { timeout: 3000, encoding: 'utf8', windowsHide: true }, (err2, out) => {
        if (err2 || !out.trim()) { resolve([]); return; }
        const names = out.trim().split('\n')
          .map(l => l.trim())
          .filter(l => l.match(/\\Printers\\.+$/) && !l.endsWith('\\Printers'))
          .map(l => l.split('\\').pop().trim())
          .filter(Boolean);
        resolve(names.map(name => ({
          name,
          displayName: name,
          status:    3,  // reg doesn't give us live status
          isDefault: name === defaultPrinter,
          description: '',
        })));
      });
    });
  });

  // Virtual/software printers that cannot print physical documents
  const VIRTUAL_PRINTERS = [
    'microsoft print to pdf', 'microsoft xps document writer',
    'onenote', 'fax', 'adobe pdf', 'cutepdf', 'dopdf', 'nitro pdf',
    'pdf24', 'pdfcreator', 'bullzip', 'foxit pdf', 'biztalk',
    'send to onenote', 'xps', 'microsoft office',
  ];
  const isVirtual = (name) => {
    const n = name.toLowerCase();
    return VIRTUAL_PRINTERS.some(v => n.includes(v));
  };

  try {
    const wmicResult = await wmicQuery();
    const list = (wmicResult && wmicResult.length > 0) ? wmicResult : await regQuery();
    // Filter: remove virtual printers, keep real physical ones
    // Show offline printers too (user may want to see them) but mark clearly
    return list.filter(p => !isVirtual(p.name));
  } catch (err) {
    console.error('get-printers failed:', err);
    return [];
  }
});

/**
 * printDocument
 * -------------
 * Full pipeline:
 *   1. Write HTML to a temp file (file:// avoids data: URI rendering bugs)
 *   2. Load in a real off-screen BrowserWindow
 *   3. printToPDF() → get raw PDF bytes (Chromium renders everything perfectly)
 *   4. Write PDF to temp file
 *   5. Send to Windows Spooler via winspool.drv using Node's child_process
 *      calling a tiny C-level Win32 RAW-mode print job
 *
 * Why not webContents.print() directly?
 *   - data: URIs don't render text in Electron 36-40 print mode (Chromium bug)
 *   - webContents.print() on file:// works but requires the window to be
 *     fully visible AND focused — unreliable in background windows
 *   - printToPDF → spooler is the only path that is 100% reliable on all
 *     Windows 10/11 versions with any printer driver
 */

function writeHtmlToTempFile(htmlContent) {
  const tmpHtml = path.join(os.tmpdir(), `minsa-doc-${Date.now()}.html`);
  // Write with UTF-8 BOM so Windows opens it correctly
  fs.writeFileSync(tmpHtml, '\uFEFF' + htmlContent, 'utf8');
  return tmpHtml;
}

function renderHtmlFileToPdf(htmlFilePath) {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      show:        false,
      width:       794,
      height:      1123,
      frame:       false,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration:      false,
        contextIsolation:     true,
        javascript:           true,
        images:               true,
        backgroundThrottling: false,
        webSecurity:          false, // needed to load local file:// images
      },
    });
    win.setMenu(null);

    const cleanup = () => {
      try { fs.unlinkSync(htmlFilePath); } catch { /* ignore */ }
      setTimeout(() => { try { if (!win.isDestroyed()) win.close(); } catch { /* ignore */ } }, 500);
    };

    win.webContents.once('did-finish-load', () => {
      // Give Chromium time to fully render fonts and layout
      setTimeout(async () => {
        try {
          const pdfBuf = await win.webContents.printToPDF({
            printBackground:     true,
            pageSize:            'A4',
            landscape:           false,
            margins:             { marginType: 'none' },
            displayHeaderFooter: false,
            preferCSSPageSize:   true,
          });
          cleanup();
          resolve(pdfBuf);
        } catch (err) {
          cleanup();
          reject(err);
        }
      }, 600);
    });

    win.webContents.once('did-fail-load', (_e, code, desc) => {
      cleanup();
      reject(new Error(`HTML render failed: ${desc} (${code})`));
    });

    // Load via file:// — full font + text rendering, no data: URI issues
    win.loadFile(htmlFilePath);
  });
}

/**
 * sendPdfToWindowsSpooler
 * -----------------------
 * Sends the PDF to a named Windows printer using the Win32 Spooler API
 * called from PowerShell via System.Drawing.Printing.PrintDocument.
 *
 * This is the exact same API that Word, Acrobat, and all Windows apps use.
 * It calls OpenPrinter → StartDocPrinter → WritePrinter → ClosePrinter
 * directly — guaranteed to appear in Print Queue.
 *
 * For PDF rendering we use Chromium's printToPDF which produces a proper
 * PDF, then we use PowerShell's .NET PrintDocument to send it page by page.
 *
 * PIPELINE:
 *   HTML file → printToPDF (Chromium) → PDF buffer
 *   PDF buffer → temp file
 *   PowerShell: Load PDF with iTextSharp / Windows.Data.Pdf / fallback
 *   → System.Drawing.Printing.PrintDocument → Win32 Spooler → Print Queue
 */
/**
 * printViaElectron
 * ----------------
 * Uses Electron's built-in webContents.print() which calls the Windows
 * GDI print path directly — guaranteed to reach the spooler for ANY driver.
 *
 * Pipeline:
 *   HTML content → hidden BrowserWindow → webContents.print({ deviceName }) → Windows Spooler
 *
 * This is more reliable than PowerShell because:
 *   - Chromium handles all rendering natively
 *   - No PDF intermediate — goes directly to GDI/EMF which every driver accepts
 *   - Works with USB, network, Bluetooth, virtual printers
 */
function printViaElectron(htmlContent, printerName, copies) {
  return new Promise((resolve, reject) => {
    const htmlFilePath = path.join(os.tmpdir(), 'minsa-print-' + Date.now() + '.html');
    fs.writeFileSync(htmlFilePath, '\uFEFF' + htmlContent, 'utf8');

    // Step 1: Render HTML to PDF using a hidden BrowserWindow
    // The window must be visible-sized even if show:false, so Chromium
    // does a full vector layout (not a GDI raster fallback)
    const win = new BrowserWindow({
      show:        false,
      width:       794,
      height:      1123,
      frame:       false,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration:      false,
        contextIsolation:     true,
        javascript:           true,
        images:               true,
        backgroundThrottling: false,
        webSecurity:          false,
        offscreen:            false,
      },
    });
    win.setMenu(null);

    const cleanup = (delay) => {
      setTimeout(() => {
        try { if (!win.isDestroyed()) win.close(); } catch (_) {}
        try { fs.unlinkSync(htmlFilePath); } catch (_) {}
      }, delay || 4000);
    };

    win.webContents.once('did-finish-load', () => {
      // Wait for fonts + images to fully load
      setTimeout(async () => {
        try {
          // Step 2: Generate perfect vector PDF via Chromium's built-in PDF renderer
          const pdfBuffer = await win.webContents.printToPDF({
            printBackground:     true,
            pageSize:            'A4',
            landscape:           false,
            margins:             { marginType: 'none' },
            displayHeaderFooter: false,
            preferCSSPageSize:   true,
          });
          cleanup(500);

          // Step 3: Write PDF to temp file
          const pdfPath = path.join(os.tmpdir(), 'minsa-out-' + Date.now() + '.pdf');
          fs.writeFileSync(pdfPath, pdfBuffer);

          const pdfCleanup = () => {
            setTimeout(() => { try { fs.unlinkSync(pdfPath); } catch (_) {} }, 20000);
          };

          const pName   = (printerName || '').trim();
          const nCopies = Math.max(1, parseInt(copies) || 1);

          // Step 4: Try Electron's native print() with the PDF content
          // We load the PDF into another window and print from there
          // This avoids GDI raster because PDF is already vector
          const pdfWin = new BrowserWindow({
            show:        false,
            width:       794,
            height:      1123,
            frame:       false,
            skipTaskbar: true,
            webPreferences: {
              nodeIntegration:      false,
              contextIsolation:     true,
              plugins:              true,  // needed to render PDF
              backgroundThrottling: false,
              webSecurity:          false,
            },
          });
          pdfWin.setMenu(null);

          const pdfCleanup2 = (d) => {
            setTimeout(() => {
              try { if (!pdfWin.isDestroyed()) pdfWin.close(); } catch (_) {}
            }, d || 3000);
            pdfCleanup();
          };

          pdfWin.webContents.once('did-finish-load', () => {
            setTimeout(() => {
              pdfWin.webContents.print({
                silent:          true,
                printBackground: true,
                deviceName:      pName,
                copies:          nCopies,
                margins:         { marginType: 'none' },
                pageSize:        'A4',
                landscape:       false,
                scaleFactor:     100,
              }, (success, reason) => {
                pdfCleanup2(3000);
                if (success) resolve(true);
                else reject(new Error('PDF print failed: ' + (reason || 'unknown') + ' (printer: ' + (pName || 'default') + ')'));
              });
            }, 800);
          });

          pdfWin.webContents.once('did-fail-load', (_e, code, desc) => {
            pdfCleanup2(0);
            reject(new Error('PDF window load failed: ' + desc));
          });

          // Load PDF via file:// — Chromium's PDF plugin renders it vector
          pdfWin.loadFile(pdfPath);

        } catch (err) {
          cleanup(0);
          reject(new Error('printToPDF failed: ' + err.message));
        }
      }, 1500);
    });

    win.webContents.once('did-fail-load', (_e, code, desc) => {
      cleanup(0);
      reject(new Error('HTML render failed: ' + desc + ' (code ' + code + ')'));
    });

    win.loadFile(htmlFilePath);
  });
}


/**
 * sendPdfToWindowsSpooler (legacy fallback)
 * ------------------------------------------
 * Used only when printViaElectron fails.
 * Writes PDF to temp file and tries SumatraPDF.
 */
async function sendPdfToWindowsSpooler(pdfBuffer, printerName, copies) {
  const { execFile } = require('child_process');
  const ts     = Date.now();
  const tmpPdf = path.join(os.tmpdir(), 'minsa-' + ts + '.pdf');
  const pName  = (printerName || '').trim();
  const nCopies = Math.max(1, parseInt(copies) || 1);

  fs.writeFileSync(tmpPdf, pdfBuffer);
  const cleanup = () => { setTimeout(() => { try { fs.unlinkSync(tmpPdf); } catch (_) {} }, 12000); };

  // SumatraPDF search order:
  //   1. Bundled in app resources (extraResources via electron-builder)
  //   2. Next to main.js (dev)
  //   3. NSIS-installed to LocalAppData
  //   4. System-wide installs
  const resourcesDir = process.resourcesPath || path.join(__dirname, '../..');
  const sumatraCandidates = [
    path.join(resourcesDir, 'SumatraPDF.exe'),
    path.join(__dirname, 'SumatraPDF.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'SumatraPDF', 'SumatraPDF.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'SumatraPDF', 'SumatraPDF.exe'),
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'SumatraPDF', 'SumatraPDF.exe'),
    path.join((process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)'), 'SumatraPDF', 'SumatraPDF.exe'),
  ];
  const sumatraExe = sumatraCandidates.find(p => { try { return fs.existsSync(p); } catch (_) { return false; } });

  if (sumatraExe) {
    return new Promise((resolve, reject) => {
      execFile(sumatraExe,
        ['-print-to', pName, '-print-settings', 'copies=' + nCopies + ',fit', '-silent', tmpPdf],
        { timeout: 25000, windowsHide: true },
        (err) => { cleanup(); if (err && err.code !== 0 && err.code !== null) reject(new Error('SumatraPDF: ' + err.message)); else resolve(true); }
      );
    });
  }

  cleanup();
  throw new Error('SumatraPDF tidak ditemukan. Pastikan MINSA sudah diinstall dengan benar, atau install SumatraPDF secara manual dari https://www.sumatrapdfreader.org');
}


ipcMain.handle('print-document', async (_e, opts) => {
  try {
    const htmlContent = opts.htmlContent || '';
    if (!htmlContent) return { success: false, error: 'No HTML content provided' };

    // Primary: Electron native webContents.print() — direct GDI path, works with all drivers
    try {
      await printViaElectron(htmlContent, opts.printerName || '', opts.copies || 1);
      return { success: true };
    } catch (primaryErr) {
      console.warn('printViaElectron failed, trying PDF fallback:', primaryErr.message);
    }

    // Fallback: render to PDF first, then try SumatraPDF spooler
    const tmpHtml   = writeHtmlToTempFile(htmlContent);
    const pdfBuffer = await renderHtmlFileToPdf(tmpHtml);
    await sendPdfToWindowsSpooler(pdfBuffer, opts.printerName, opts.copies || 1);
    return { success: true };
  } catch (e) {
    console.error('print-document:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('print-to-pdf', async (_e, opts) => {
  try {
    const htmlContent = opts.htmlContent || '';
    if (!htmlContent) return { success: false, error: 'No HTML content provided' };
    const tmpHtml  = writeHtmlToTempFile(htmlContent);
    const pdfBuffer = await renderHtmlFileToPdf(tmpHtml);
    return { success: true, data: pdfBuffer.toString('base64') };
  } catch (e) {
    console.error('print-to-pdf:', e);
    return { success: false, error: e.message };
  }
});

/**
 * get-printer-queue
 * -----------------
 * Returns live print queue jobs for a named printer using wmic.
 * Compatible with Windows 10/11 without any extra dependencies.
 */
ipcMain.handle('get-printer-queue', async (_e, printerName) => {
  const { execFile } = require('child_process');
  return new Promise((resolve) => {
    execFile('wmic', [
      'printjob', 'where', `Name like "${(printerName || '').replace(/"/g, '')}%"`,
      'get', 'Name,JobId,Document,StatusMask,TotalPages,PagesPrinted',
      '/format:csv',
    ], { timeout: 5000, encoding: 'utf8', windowsHide: true }, (err, stdout) => {
      if (err || !stdout.trim()) { resolve([]); return; }
      try {
        const lines = stdout.split('\n').map(l => l.replace(/\r/g, '').trim()).filter(Boolean);
        if (lines.length < 2) { resolve([]); return; }
        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const jobs = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          while (cols.length < header.length) cols.push('');
          const row = {};
          header.forEach((h, idx) => { row[h] = (cols[idx] || '').trim(); });
          if (!row['jobid'] || row['jobid'] === 'JobId') continue;
          // StatusMask bits: 0=Paused,1=Error,2=Deleting,3=Spooling,4=Printing,5=Offline,6=Paperout,7=Printed,8=Deleted
          const mask = parseInt(row['statusmask']) || 0;
          let statusText = 'Antri';
          if (mask & (1 << 4)) statusText = 'Mencetak...';
          else if (mask & (1 << 3)) statusText = 'Spooling';
          else if (mask & (1 << 7)) statusText = 'Selesai';
          else if (mask & (1 << 1)) statusText = 'Error';
          else if (mask & (1 << 5)) statusText = 'Printer Offline';
          else if (mask & (1 << 6)) statusText = 'Kertas Habis';
          jobs.push({
            jobId:       row['jobid'],
            document:    row['document'] || 'MINSA Surat',
            status:      statusText,
            totalPages:  parseInt(row['totalpages']) || 0,
            pagesPrinted: parseInt(row['pagesprinted']) || 0,
          });
        }
        resolve(jobs);
      } catch { resolve([]); }
    });
  });
});

/**
 * start-queue-monitor / stop-queue-monitor
 * ----------------------------------------
 * Starts/stops a polling loop that pushes queue updates to the renderer
 * every 2 seconds via 'queue-update' IPC event. Matches the pattern from
 * the node-printer approach but uses built-in wmic — no extra deps needed.
 */
let queueMonitorInterval = null;
let queueMonitorPrinter  = '';

ipcMain.on('start-queue-monitor', (event, printerName) => {
  // Clear any existing monitor
  if (queueMonitorInterval) { clearInterval(queueMonitorInterval); queueMonitorInterval = null; }
  queueMonitorPrinter = printerName || '';

  const { execFile } = require('child_process');
  const poll = () => {
    execFile('wmic', [
      'printjob', 'where', `Name like "${queueMonitorPrinter.replace(/"/g, '')}%"`,
      'get', 'Name,JobId,Document,StatusMask,TotalPages,PagesPrinted',
      '/format:csv',
    ], { timeout: 4000, encoding: 'utf8', windowsHide: true }, (err, stdout) => {
      const jobs = [];
      if (!err && stdout.trim()) {
        try {
          const lines = stdout.split('\n').map(l => l.replace(/\r/g, '').trim()).filter(Boolean);
          if (lines.length >= 2) {
            const header = lines[0].split(',').map(h => h.trim().toLowerCase());
            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(',');
              while (cols.length < header.length) cols.push('');
              const row = {};
              header.forEach((h, idx) => { row[h] = (cols[idx] || '').trim(); });
              if (!row['jobid'] || row['jobid'] === 'JobId') continue;
              const mask = parseInt(row['statusmask']) || 0;
              let statusText = 'Antri';
              if (mask & (1 << 4)) statusText = 'Mencetak...';
              else if (mask & (1 << 3)) statusText = 'Spooling';
              else if (mask & (1 << 7)) statusText = 'Selesai';
              else if (mask & (1 << 1)) statusText = 'Error';
              else if (mask & (1 << 5)) statusText = 'Printer Offline';
              else if (mask & (1 << 6)) statusText = 'Kertas Habis';
              jobs.push({
                jobId: row['jobid'],
                document: row['document'] || 'MINSA Surat',
                status: statusText,
                totalPages: parseInt(row['totalpages']) || 0,
                pagesPrinted: parseInt(row['pagesprinted']) || 0,
              });
            }
          }
        } catch { /* ignore parse errors */ }
      }
      // Send update to all windows
      BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) {
          win.webContents.send('queue-update', { printer: queueMonitorPrinter, jobs });
        }
      });
    });
  };

  poll(); // immediate first poll
  queueMonitorInterval = setInterval(poll, 2000);
});

ipcMain.on('stop-queue-monitor', () => {
  if (queueMonitorInterval) { clearInterval(queueMonitorInterval); queueMonitorInterval = null; }
});

// ── Lifecycle ─────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  splashStartTime = Date.now();
  createSplash();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('web-contents-created', (_e, contents) => {
  contents.on('will-attach-webview', e => e.preventDefault());
});
