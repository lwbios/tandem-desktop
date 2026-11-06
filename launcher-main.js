// Launcher (Alt+Space): window, installed apps, clipboard history and the actions
// the launcher page asks for. Runs in the main process.
const { app, BrowserWindow, ipcMain, screen, shell, clipboard, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execFile } = require('child_process');

let win = null;
let deps = null; // { send(cmd), settings }

// ---------------------------------------------------------------- window

function createWindow() {
  win = new BrowserWindow({
    width: 760,
    height: 480,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#18181b',
    title: 'Tandem',
    webPreferences: {
      preload: path.join(__dirname, 'launcher', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join('launcher', 'index.html'));
  win.on('blur', () => hide());
}

function show() {
  if (!win) return;
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { x, y, width, height } = display.workArea;
  const [w] = win.getSize();
  win.setPosition(Math.round(x + (width - w) / 2), Math.round(y + height * 0.2));
  win.webContents.send('launcher:open');
  win.show();
  win.focus();
  if (!apps.length || Date.now() - appsAt > 10 * 60 * 1000) refreshApps();
}

function hide() {
  if (win && win.isVisible()) win.hide();
}

function toggle() {
  if (win && win.isVisible()) hide();
  else show();
}

// ---------------------------------------------------------------- apps

let apps = [];
let appsAt = 0;
const iconCache = new Map(); // app name -> data URL ('' when none)
let startMenuLinks = null; // lower-cased .lnk name -> full path

function refreshApps() {
  appsAt = Date.now();
  deps.send('apps');
}

function scanStartMenu() {
  const roots = [
    path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
  ];
  const links = new Map();
  const walk = (dir, depth) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && depth < 4) walk(full, depth + 1);
      else if (/\.(lnk|url)$/i.test(e.name)) links.set(e.name.replace(/\.(lnk|url)$/i, '').toLowerCase(), full);
    }
  };
  roots.forEach((r) => walk(r, 0));
  return links;
}

// Called by main.js when the watcher answers the "apps" command.
function setApps(list) {
  const seen = new Set();
  apps = list
    .filter((a) => {
      const key = a.name.toLowerCase();
      if (seen.has(key) || /^(uninstall|desinstalar)/i.test(a.name)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  startMenuLinks = scanStartMenu();
  if (win) win.webContents.send('launcher:apps', apps);
}

async function iconFor(appEntry) {
  if (iconCache.has(appEntry.name)) return iconCache.get(appEntry.name);
  // Prefer what the shortcut points to (resolved by the watcher): a .lnk's own icon
  // is a generic page with an arrow.
  let file = null;
  if (appEntry.icon && fs.existsSync(appEntry.icon)) file = appEntry.icon;
  else if (/^[a-z]:\\/i.test(appEntry.id) && fs.existsSync(appEntry.id)) file = appEntry.id;
  else if (startMenuLinks) file = startMenuLinks.get(appEntry.name.toLowerCase()) || null;
  let url = '';
  if (file) {
    try {
      const img = await app.getFileIcon(file, { size: 'normal' });
      if (!img.isEmpty()) url = img.toDataURL();
    } catch { /* no icon */ }
  }
  iconCache.set(appEntry.name, url);
  return url;
}

function openApp(id) {
  if (/^[a-z]:\\/i.test(id)) return shell.openPath(id);
  execFile('explorer.exe', [`shell:AppsFolder\\${id}`], { windowsHide: true }, () => {});
}

// ---------------------------------------------------------------- clipboard history

const historyDir = () => path.join(app.getPath('userData'), 'clipboard');
const historyFile = () => path.join(historyDir(), 'history.json');
let history = [];
const MAX_IMAGES = 25;

function loadHistory() {
  try { history = JSON.parse(fs.readFileSync(historyFile(), 'utf8')); } catch { history = []; }
}

let saveTimer = null;
function saveHistory() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(historyDir(), { recursive: true });
      fs.writeFileSync(historyFile(), JSON.stringify(history));
    } catch (err) {
      console.error('[clipboard] save failed:', err.message);
    }
  }, 500);
}

// Password managers mark secrets so clipboard tools skip them.
function isConcealed() {
  try {
    if (clipboard.readBuffer('ExcludeClipboardContentFromMonitorProcessing').length) return true;
    if (clipboard.readBuffer('Clipboard Viewer Ignore').length) return true;
    const allow = clipboard.readBuffer('CanIncludeInClipboardHistory');
    if (allow.length >= 4 && allow.readUInt32LE(0) === 0) return true;
  } catch { /* format not present */ }
  return false;
}

let lastHash = '';
// Called by main.js when the watcher reports a clipboard change.
function onClipboardChanged() {
  const s = deps.settings.get().launcher;
  if (!s.clipboardHistory || isConcealed()) return;

  let entry = null;
  const formats = clipboard.availableFormats();
  if (formats.some((f) => f.startsWith('image/'))) {
    const img = clipboard.readImage();
    if (!img.isEmpty()) {
      const hash = crypto.createHash('sha1').update(img.toBitmap()).digest('hex');
      const { width, height } = img.getSize();
      const thumb = img.resize({ width: Math.min(360, width), quality: 'good' });
      const file = path.join(historyDir(), `${hash}.png`);
      try {
        fs.mkdirSync(historyDir(), { recursive: true });
        if (!fs.existsSync(file)) fs.writeFileSync(file, img.toPNG());
      } catch { /* keep the thumbnail only */ }
      entry = { kind: 'image', hash, width, height, file, thumb: thumb.toDataURL() };
    }
  }
  if (!entry) {
    const text = clipboard.readText();
    if (!text || !text.trim()) return;
    entry = { kind: 'text', text: text.slice(0, 20000), hash: crypto.createHash('sha1').update(text).digest('hex') };
  }
  if (entry.hash === lastHash) return;
  lastHash = entry.hash;

  // Copying something again moves it to the top.
  history = history.filter((h) => h.hash !== entry.hash);
  history.unshift({ ...entry, id: crypto.randomUUID(), at: Date.now() });
  let images = 0;
  const kept = history.filter((h) => (h.kind === 'image' ? ++images <= MAX_IMAGES : true)).slice(0, s.clipboardMax);
  history.filter((h) => !kept.includes(h)).forEach(removeFile);
  history = kept;
  saveHistory();
  if (win) win.webContents.send('launcher:history', history);
}

function removeFile(item) {
  if (item.file) fs.rm(item.file, { force: true }, () => {});
}

function clearHistory() {
  history.forEach(removeFile);
  history = [];
  saveHistory();
  if (win) win.webContents.send('launcher:history', history);
}

// ---------------------------------------------------------------- actions

const SYSTEM = {
  lock: () => execFile('rundll32.exe', ['user32.dll,LockWorkStation']),
  sleep: () => execFile('rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0']),
  restart: () => execFile('shutdown', ['/r', '/t', '0']),
  shutdown: () => execFile('shutdown', ['/s', '/t', '0']),
  logoff: () => execFile('shutdown', ['/l']),
  emptyBin: () => execFile('powershell.exe', ['-NoProfile', '-Command', 'Clear-RecycleBin -Force -ErrorAction SilentlyContinue'], { windowsHide: true }),
  settings: () => shell.openExternal('ms-settings:'),
  taskManager: () => execFile('taskmgr.exe'),
  explorer: () => execFile('explorer.exe'),
  downloads: () => shell.openPath(app.getPath('downloads')),
  mute: () => deps.send('mute'),
  playPause: () => deps.send('toggle'),
  nextTrack: () => deps.send('next'),
  micMute: () => deps.send('micmute'),
  darkMode: () => {
    const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize';
    execFile('reg', ['query', key, '/v', 'AppsUseLightTheme'], (err, out) => {
      const light = err ? 1 : /0x1\b/.test(out) ? 0 : 1; // flip
      for (const v of ['AppsUseLightTheme', 'SystemUsesLightTheme']) {
        execFile('reg', ['add', key, '/v', v, '/t', 'REG_DWORD', '/d', String(light), '/f']);
      }
    });
  },
};

function pasteText(text) {
  clipboard.writeText(text);
  hide();
  setTimeout(() => deps.send('paste'), 120);
}

function run(action) {
  switch (action.kind) {
    case 'app':
      hide();
      openApp(action.id);
      break;
    case 'url':
      hide();
      shell.openExternal(action.url);
      break;
    case 'system':
      hide();
      if (SYSTEM[action.id]) SYSTEM[action.id]();
      break;
    case 'window':
      hide();
      setTimeout(() => deps.send(`window ${action.id}`), 80);
      break;
    case 'copy':
      clipboard.writeText(String(action.text));
      hide();
      break;
    case 'paste':
      pasteText(String(action.text));
      break;
    case 'pasteHistory': {
      const item = history.find((h) => h.id === action.id);
      if (!item) break;
      if (item.kind === 'text') pasteText(item.text);
      else {
        const full = item.file && fs.existsSync(item.file) ? nativeImage.createFromPath(item.file) : null;
        clipboard.writeImage(full && !full.isEmpty() ? full : nativeImage.createFromDataURL(item.thumb));
        hide();
        setTimeout(() => deps.send('paste'), 120);
      }
      break;
    }
    case 'deleteHistory':
      history.filter((h) => h.id === action.id).forEach(removeFile);
      history = history.filter((h) => h.id !== action.id);
      saveHistory();
      if (win) win.webContents.send('launcher:history', history);
      break;
    case 'clearHistory':
      clearHistory();
      break;
    case 'settings':
      hide();
      deps.openSettings(action.page);
      break;
    case 'hide':
      hide();
      break;
  }
}

// ---------------------------------------------------------------- setup

function init(options) {
  deps = options;
  loadHistory();
  lastHash = history[0] ? history[0].hash : '';
  createWindow();
  ipcMain.handle('launcher:init', () => ({
    apps,
    history,
    settings: deps.settings.get().launcher,
  }));
  ipcMain.handle('launcher:icons', async (_e, names) => {
    const out = {};
    for (const name of names.slice(0, 40)) {
      const entry = apps.find((a) => a.name === name);
      if (entry) out[name] = await iconFor(entry);
    }
    return out;
  });
  ipcMain.on('launcher:run', (_e, action) => run(action));
  refreshApps();
}

function broadcastSettings() {
  if (win) win.webContents.send('launcher:settings', deps.settings.get().launcher);
}

module.exports = { init, toggle, show, hide, setApps, onClipboardChanged, clearHistory, broadcastSettings };
