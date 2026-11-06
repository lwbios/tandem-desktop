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

// ---------------------------------------------------------------- snippets, transforms

// {date} {time} {datetime} {clipboard} inside a snippet.
function expandSnippet(text) {
  const now = new Date();
  return text
    .replace(/\{date\}/g, now.toLocaleDateString('pt-BR'))
    .replace(/\{time\}/g, now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    .replace(/\{datetime\}/g, now.toLocaleString('pt-BR'))
    .replace(/\{clipboard\}/g, clipboard.readText());
}

const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const words = (s) => stripAccents(s).replace(/([a-z])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean);
const TRANSFORMS = {
  upper: (s) => s.toLocaleUpperCase('pt-BR'),
  lower: (s) => s.toLocaleLowerCase('pt-BR'),
  title: (s) => s.toLocaleLowerCase('pt-BR').replace(/(^|\s)(\S)/g, (_m, a, b) => a + b.toLocaleUpperCase('pt-BR')),
  camel: (s) => words(s).map((w, i) => (i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join(''),
  snake: (s) => words(s).map((w) => w.toLowerCase()).join('_'),
  kebab: (s) => words(s).map((w) => w.toLowerCase()).join('-'),
  noAccents: stripAccents,
  trim: (s) => s.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim(),
};

// ---------------------------------------------------------------- file search, apps to close

// The watcher answers "search" commands; match answers to questions by id.
const searches = new Map();
let searchId = 0;

function search(query, mode) {
  return new Promise((resolve) => {
    const id = ++searchId;
    const timer = setTimeout(() => { searches.delete(id); resolve({}); }, 4000);
    searches.set(id, (res) => { clearTimeout(timer); resolve(res); });
    const b64 = Buffer.from(query, 'utf8').toString('base64');
    deps.send(`search ${id} ${mode === 'procs' ? 'procs' : 'files'} ${b64}`);
  });
}

// Called by main.js with the watcher's {type:'search'} answer.
async function onSearchResult(msg) {
  const done = searches.get(msg.id);
  if (!done) return;
  searches.delete(msg.id);
  const procs = msg.procs || [];
  for (const p of procs) {
    if (p.path) {
      try {
        const img = await app.getFileIcon(p.path, { size: 'normal' });
        if (!img.isEmpty()) p.icon = img.toDataURL();
      } catch { /* no icon */ }
    }
  }
  done({ files: msg.files || [], procs });
}

const fileIconCache = new Map(); // extension (or the path for exe/lnk/folders) -> data URL
async function fileIcon(file) {
  const ext = path.extname(file).toLowerCase();
  const key = !ext || ['.exe', '.lnk', '.ico', '.url'].includes(ext) ? file : ext;
  if (fileIconCache.has(key)) return fileIconCache.get(key);
  let url = '';
  try {
    const img = await app.getFileIcon(file, { size: 'normal' });
    if (!img.isEmpty()) url = img.toDataURL();
  } catch { /* missing file */ }
  fileIconCache.set(key, url);
  return url;
}

// ---------------------------------------------------------------- screenshots

function screenshotFolders() {
  const pics = app.getPath('pictures');
  const home = app.getPath('home');
  return [
    path.join(pics, 'Screenshots'),
    path.join(pics, 'Capturas de Tela'),
    path.join(home, 'OneDrive', 'Pictures', 'Screenshots'),
    path.join(home, 'OneDrive', 'Imagens', 'Capturas de Tela'),
    path.join(home, 'Videos', 'Captures'),
  ];
}

const thumbCache = new Map(); // path|mtime -> data URL
function recentScreenshots() {
  const files = [];
  for (const dir of screenshotFolders()) {
    let names;
    try { names = fs.readdirSync(dir); } catch { continue; }
    for (const name of names) {
      if (!/\.(png|jpe?g|webp|bmp|gif)$/i.test(name)) continue;
      const full = path.join(dir, name);
      try { files.push({ path: full, name, mtime: fs.statSync(full).mtimeMs }); } catch { /* gone */ }
    }
  }
  files.sort((a, b) => b.mtime - a.mtime);
  return files.slice(0, 40).map((f) => {
    const key = `${f.path}|${f.mtime}`;
    if (!thumbCache.has(key)) {
      const img = nativeImage.createFromPath(f.path);
      thumbCache.set(key, img.isEmpty() ? '' : img.resize({ width: 320, quality: 'good' }).toDataURL());
    }
    return { ...f, thumb: thumbCache.get(key) };
  });
}

function pasteImage(file) {
  const img = nativeImage.createFromPath(file);
  if (img.isEmpty()) return;
  clipboard.writeImage(img);
  hide();
  setTimeout(() => deps.send('paste'), 120);
}

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
    case 'snippet':
      pasteText(expandSnippet(String(action.text)));
      break;
    case 'transform': {
      const fn = TRANSFORMS[action.id];
      const text = clipboard.readText();
      if (fn && text) pasteText(fn(text));
      else hide();
      break;
    }
    case 'open':
      hide();
      shell.openPath(resolveFolder(String(action.path)));
      break;
    case 'reveal':
      hide();
      shell.showItemInFolder(String(action.path));
      break;
    case 'pasteImage':
      pasteImage(String(action.path));
      break;
    case 'quit':
      hide();
      // Without /F Windows asks the app to close, so it can save or ask first.
      if (/^[\w .-]+$/.test(action.name)) execFile('taskkill', ['/IM', `${action.name}.exe`], { windowsHide: true }, () => {});
      break;
    case 'timer':
      hide();
      deps.startTimer(Number(action.minutes));
      break;
    case 'focus':
      hide();
      deps.startFocus(Number(action.minutes));
      break;
    case 'focusStop':
      hide();
      deps.stopFocus();
      break;
    case 'notes':
      hide();
      deps.openNotes(!!action.create);
      break;
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
    settings: launcherSettings(),
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
  ipcMain.handle('launcher:search', (_e, query, mode) => search(String(query), mode));
  ipcMain.handle('launcher:fileIcons', async (_e, paths) => {
    const out = {};
    for (const p of paths.slice(0, 30)) out[p] = await fileIcon(p);
    return out;
  });
  ipcMain.handle('launcher:screens', () => recentScreenshots());
  ipcMain.handle('launcher:clipboardText', () => clipboard.readText().slice(0, 100000));
  ipcMain.on('launcher:drag', (e, file) => {
    if (!fs.existsSync(file)) return;
    const icon = nativeImage.createFromPath(file).resize({ width: 96 });
    e.sender.startDrag({ file, icon: icon.isEmpty() ? nativeImage.createEmpty() : icon });
  });
  refreshApps();
}

// Favourite folders may use {documents}, {downloads}, {desktop}, {pictures}, {home}.
function resolveFolder(p) {
  return p.replace(/\{(documents|downloads|desktop|pictures|home|music|videos)\}/g, (_m, name) => app.getPath(name));
}

// The page gets favourite folders with their placeholders already resolved.
function launcherSettings() {
  const s = deps.settings.get().launcher;
  return { ...s, folders: s.folders.map((f) => ({ ...f, path: resolveFolder(f.path) })) };
}

function broadcastSettings() {
  if (win) win.webContents.send('launcher:settings', launcherSettings());
}

module.exports = { init, toggle, show, hide, setApps, onClipboardChanged, onSearchResult, clearHistory, broadcastSettings };
