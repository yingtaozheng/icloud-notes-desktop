const { app, BrowserWindow, Menu, shell, webFrameMain } = require('electron');
const path = require('path');
const fs = require('fs');
const buildAutofillScript = require('./autofill');

// China mainland iCloud (operated by GCBD); accounts registered in China live here, not on icloud.com.
const NOTES_URL = 'https://www.icloud.com.cn/notes';
// "persist:" keeps cookies/local storage on disk, so the iCloud session survives restarts.
const PARTITION = 'persist:icloud';
const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

// Look for config.json next to the installed .exe first (editable without rebuilding),
// then fall back to the copy bundled into the app.
function loadConfig() {
  const candidates = [
    path.join(path.dirname(process.execPath), 'config.json'),
    path.join(__dirname, 'config.json'),
  ];
  for (const file of candidates) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {}
  }
  return {};
}

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { width: 1200, height: 800 };
  }
}

function saveWindowState(win) {
  const state = { ...win.getNormalBounds(), maximized: win.isMaximized() };
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {}
}

function isAppleHost(url) {
  try {
    const { hostname } = new URL(url);
    return /(^|\.)(icloud|apple)\.com(\.cn)?$/.test(hostname);
  } catch {
    return false;
  }
}

// iCloud.com refuses "unsupported browsers"; present as plain Chrome instead of Electron.
app.userAgentFallback = app.userAgentFallback
  .replace(/\sElectron\/\S+/, '')
  .replace(/\s\S+\/[\d.]+(?= Chrome)/, '');

app.setAppUserModelId('com.yingtao.icloudnotes');

let mainWindow = null;

function createWindow() {
  const config = loadConfig();
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 600,
    minHeight: 400,
    title: 'iCloud Notes',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      partition: PARTITION,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  if (state.maximized) mainWindow.maximize();

  // Keep the window title fixed instead of following the page title.
  mainWindow.on('page-title-updated', (e) => e.preventDefault());
  mainWindow.on('close', () => saveWindowState(mainWindow));

  // Apple's sign-in form lives in a cross-origin iframe (idmsa.apple.com),
  // so inject the autofill script into that frame whenever it loads.
  if (config.appleId && config.password) {
    const script = buildAutofillScript(config.appleId, config.password);
    mainWindow.webContents.on('did-frame-finish-load', (_e, _isMain, processId, routingId) => {
      const frame = webFrameMain.fromId(processId, routingId);
      if (frame && /^https:\/\/idmsa\.apple\.com(\.cn)?\//.test(frame.url)) {
        frame.executeJavaScript(script).catch(() => {});
      }
    });
  }

  // Apple pages open in-app; everything else goes to the default browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppleHost(url)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!isAppleHost(url)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadURL(NOTES_URL);
}

const menu = Menu.buildFromTemplate([
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
  {
    label: 'Go',
    submenu: [
      { label: 'Notes Home', accelerator: 'CmdOrCtrl+H', click: () => mainWindow?.loadURL(NOTES_URL) },
      { role: 'quit' },
    ],
  },
]);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Clicking the taskbar icon again focuses the existing window instead of opening a second one.
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(menu);
    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
