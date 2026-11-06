const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeTheme, globalShortcut, shell, dialog } = require('electron');
const path = require('path');
const readline = require('readline');
const fs = require('fs');
const { spawn, execFile, execFileSync } = require('child_process');
const settings = require('./settings');
const launcher = require('./launcher-main');
const notes = require('./notes-main');

const WIDTH = 520;
const HEIGHT = 240;

let win = null;
let settingsWin = null;
let tray = null;
let media = null;
let quitting = false;

if (!app.requestSingleInstanceLock()) {
  app.quit();
}
// Launching Tandem again while it runs opens the settings window.
app.on('second-instance', () => openSettings());

function createWindow() {
  const { bounds } = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    x: Math.round(bounds.x + (bounds.width - WIDTH) / 2),
    y: bounds.y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    hasShadow: false,
    focusable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required', // timer alarm sound
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  // Clicks pass through the transparent area; mouse moves are still forwarded
  // so the page can tell when the cursor is over the island.
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile('index.html');
  // A page reload forgets the icons it was sent, so send the cached ones again.
  win.webContents.on('did-finish-load', () => {
    for (const [name, dataUrl] of appIcons) {
      if (dataUrl) win.webContents.send('app-icon', { name, dataUrl });
    }
    if (outputs) win.webContents.send('output', { ...outputs, initial: true, changed: false });
    obs.sent = ''; // resend OBS state on the next poll
    win.webContents.send('settings', settings.get());
  });
  win.webContents.on('console-message', (_e, level, message, line, source) => {
    if (level >= 2) console.error(`[renderer] ${message} (${source}:${line})`);
  });
}

function startMediaWatcher() {
  media = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    // In the installed app the script lives outside the asar archive, where PowerShell can read it.
    '-File', path.join(__dirname, 'media.ps1').replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`),
  ], { windowsHide: true });

  media.stdin.write(`ownpid ${process.pid}\napps\nhyper ${settings.get().hyperKey ? 'on' : 'off'}\n`);
  media.stdout.setEncoding('utf8');
  readline.createInterface({ input: media.stdout }).on('line', (line) => {
    line = line.replace(/^\uFEFF/, '').trim();
    if (process.env.ISLAND_DEBUG) console.log('[media]', line.slice(0, 160));
    if (!line.startsWith('{') || !win || win.isDestroyed()) return;
    try {
      const msg = JSON.parse(line);
      if (msg.paths) loadAppIcons(msg.paths);
      if (msg.type === 'output') outputs = msg;
      if (msg.type === 'apps') return launcher.setApps(msg.apps || []);
      if (msg.type === 'clipboard') return launcher.onClipboardChanged();
      if (msg.type === 'search') return launcher.onSearchResult(msg);
      if (msg.type === 'foreground') return onForeground(msg.name);
      if (msg.type === 'fullscreen') {
        setFullscreen(msg.active);
        return;
      }
      const channels = ['volume', 'mic', 'camera', 'output'];
      win.webContents.send(channels.includes(msg.type) ? msg.type : 'media', msg);
    } catch {
      // ignore malformed line
    }
  });
  media.stderr.on('data', (d) => console.error('[media]', d.toString()));
  media.on('exit', () => {
    media = null;
    if (!quitting) setTimeout(startMediaWatcher, 2000);
  });
}

// ---------------------------------------------------------------- focus mode
// A focus session runs the island timer and keeps distracting apps out of the way.
let focus = null; // { until }
let foregroundApp = '';

function notifyIsland(text, kind = 'info') {
  if (win && !win.isDestroyed()) win.webContents.send('notify', { text, kind });
}

function startTimer(minutes) {
  if (win && minutes > 0) win.webContents.send('timer', { action: 'start', minutes });
}

function startFocus(minutes) {
  if (!(minutes > 0)) minutes = settings.get().focus.minutes;
  focus = { until: Date.now() + minutes * 60000 };
  if (win) win.webContents.send('timer', { action: 'start', minutes, focus: true });
  onForeground(foregroundApp);
}

function stopFocus(fromIsland = false) {
  if (!focus) return;
  focus = null;
  if (!fromIsland && win) win.webContents.send('timer', { action: 'cancel' });
}

const isBlocked = (name) => !!name && settings.get().focus.apps
  .some((a) => a.toLowerCase().replace(/\.exe$/, '') === name.toLowerCase());

function onForeground(name) {
  foregroundApp = name || '';
  if (!focus) return;
  if (Date.now() > focus.until) { focus = null; return; }
  if (!isBlocked(foregroundApp)) return;
  const label = foregroundApp.charAt(0).toUpperCase() + foregroundApp.slice(1);
  if (settings.get().focus.mode === 'close') {
    execFile('taskkill', ['/IM', `${foregroundApp}.exe`], { windowsHide: true }, () => {});
    notifyIsland(`Foco: ${label} foi fechado`, 'focus');
  } else {
    if (media) media.stdin.write('minimizefg\n');
    notifyIsland(`Foco: ${label} está bloqueado`, 'focus');
  }
}

ipcMain.on('focus:ended', () => stopFocus(true));

// Latest audio output info from the watcher (current device + list for the menu).
let outputs = null;

// The island hides for a fullscreen app or game on the primary monitor (if enabled)
// and when the user hides it with the shortcut.
let fullscreen = false;
let userHidden = false;

function updateVisibility() {
  if (!win) return;
  const hide = userHidden || (fullscreen && settings.get().hideInFullscreen);
  if (hide && win.isVisible()) {
    setInteractive(false);
    win.hide();
  } else if (!hide && !win.isVisible()) {
    win.showInactive();
    win.setAlwaysOnTop(true, 'screen-saver');
  }
}

function setFullscreen(active) {
  if (active === fullscreen) return;
  fullscreen = active;
  if (process.env.ISLAND_DEBUG) console.log('[fullscreen]', active ? 'hide' : 'show');
  updateVisibility();
}

// OBS writes "==== Recording Start/Stop" (and Streaming) lines to its log, so we can
// follow it without the websocket plugin or any password.
const OBS_LOGS = process.env.TANDEM_OBS_LOGS || path.join(process.env.APPDATA || '', 'obs-studio', 'logs');
const obs = { file: null, pos: 0, recording: null, streaming: null, sent: '' };

function parseObsTime(hms) {
  const [h, m, s] = hms.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, Math.floor(s), Math.round((s % 1) * 1000));
  if (d.getTime() > Date.now() + 60000) d.setDate(d.getDate() - 1); // started before midnight
  return d.getTime();
}

function readObsLog() {
  let files;
  try {
    files = fs.readdirSync(OBS_LOGS)
      .filter((f) => f.endsWith('.txt'))
      .map((f) => ({ f, t: fs.statSync(path.join(OBS_LOGS, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
  } catch {
    return; // OBS not installed
  }
  if (!files.length) return;
  const file = path.join(OBS_LOGS, files[0].f);
  if (file !== obs.file) Object.assign(obs, { file, pos: 0, recording: null, streaming: null });

  const size = fs.statSync(file).size;
  if (size <= obs.pos) return;
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(size - obs.pos);
  fs.readSync(fd, buf, 0, buf.length, obs.pos);
  fs.closeSync(fd);
  obs.pos = size;

  const re = /^\uFEFF?(\d\d:\d\d:\d\d(?:\.\d+)?): ==== (Recording|Streaming) (Start|Stop)/gm;
  for (const m of buf.toString('utf8').matchAll(re)) {
    const key = m[2] === 'Recording' ? 'recording' : 'streaming';
    obs[key] = m[3] === 'Start' ? parseObsTime(m[1]) : null;
  }
}

// A crash never logs "Stop", so double-check OBS is still running while live.
function obsRunning() {
  return new Promise((resolve) => {
    execFile('tasklist', ['/FI', 'IMAGENAME eq obs64.exe', '/NH'], { windowsHide: true }, (err, out) => {
      resolve(!err && /obs64\.exe/i.test(out));
    });
  });
}

let obsTicks = 0;
async function pollObs() {
  readObsLog();
  if ((obs.recording || obs.streaming) && obsTicks++ % 5 === 0 && !(await obsRunning())) {
    obs.recording = obs.streaming = null;
  }
  const state = { recording: obs.recording, streaming: obs.streaming };
  const key = JSON.stringify(state);
  if (key !== obs.sent && win && !win.isDestroyed()) {
    obs.sent = key;
    win.webContents.send('obs', state);
  }
}

// Icons of apps using the microphone, pulled from their .exe (cached by app name).
const appIcons = new Map();

function loadAppIcons(paths) {
  for (const [name, exePath] of Object.entries(paths)) {
    if (appIcons.has(name) || !exePath) continue;
    appIcons.set(name, null); // mark as in-flight
    app.getFileIcon(exePath, { size: 'large' })
      .then((icon) => {
        if (icon.isEmpty()) return;
        const dataUrl = icon.toDataURL();
        appIcons.set(name, dataUrl);
        if (win && !win.isDestroyed()) win.webContents.send('app-icon', { name, dataUrl });
      })
      .catch(() => {});
  }
}

// Tray icon follows the taskbar: white logo on a dark taskbar, dark logo on a light one.
// Windows keeps the taskbar theme apart from the app theme (SystemUsesLightTheme).
function taskbarIsDark() {
  try {
    const out = execFileSync('reg', [
      'query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize',
      '/v', 'SystemUsesLightTheme',
    ], { encoding: 'utf8', windowsHide: true });
    return /0x0\b/.test(out);
  } catch {
    return true; // value missing on older builds: taskbar is dark
  }
}

function trayIconPath() {
  return path.join(__dirname, 'assets', taskbarIsDark() ? 'tray-dark.ico' : 'tray-light.ico');
}

function createTray() {
  tray = new Tray(trayIconPath());
  nativeTheme.on('updated', () => tray && tray.setImage(trayIconPath()));
  tray.setToolTip('Tandem');
  tray.on('double-click', () => openSettings());
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir o lançador', click: () => launcher.show() },
    { label: 'Notas', click: () => notes.open() },
    { label: 'Iniciar foco', click: () => startFocus() },
    { label: 'Configurações…', click: () => openSettings() },
    { label: 'Mostrar/ocultar a ilha', click: () => toggleIsland() },
    { label: 'Recarregar a ilha', click: () => win && win.reload() },
    { type: 'separator' },
    { label: 'Sair', click: () => app.quit() },
  ]));
}

// A fast flick out of the window can skip the page's mouseleave, so while the
// window is interactive we also watch the cursor and tell the page when it left.
let leaveWatch = null;

function setInteractive(interactive) {
  if (!win) return;
  clearInterval(leaveWatch);
  leaveWatch = null;
  if (interactive) {
    win.setIgnoreMouseEvents(false);
    leaveWatch = setInterval(() => {
      const p = screen.getCursorScreenPoint();
      const b = win.getBounds();
      const inside = p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height;
      if (!inside) {
        win.webContents.send('mouse-left');
        setInteractive(false);
      }
    }, 120);
  } else {
    win.setIgnoreMouseEvents(true, { forward: true });
  }
}

ipcMain.on('set-interactive', (_e, interactive) => setInteractive(interactive));

ipcMain.on('media-cmd', (_e, cmd) => {
  if (media && /^(toggle|next|prev|mute|micmute|vol (0|1|0?\.\d+))$/.test(cmd)) media.stdin.write(cmd + '\n');
});

function timerMenuItems(timerActive) {
  if (!settings.get().modules.timer) return [];
  if (focus) return [{ label: 'Encerrar foco', click: () => stopFocus() }];
  const send = (action, minutes) => win && win.webContents.send('timer', { action, minutes });
  if (timerActive) {
    return [
      { label: 'Pausar/retomar timer', click: () => send('pause') },
      { label: 'Cancelar timer', click: () => send('cancel') },
    ];
  }
  return settings.get().timer.presets.map((m) => ({
    label: m >= 60 && m % 60 === 0 ? `Timer de ${m / 60} h` : `Timer de ${m} min`,
    click: () => send('start', m),
  }));
}

function outputMenuItems() {
  if (!settings.get().modules.output) return [];
  if (!outputs || !outputs.devices || outputs.devices.length < 2) return [];
  return [
    { label: 'Saída de áudio', enabled: false },
    ...outputs.devices.map((d) => ({
      label: d.name,
      type: 'radio',
      checked: d.id === outputs.id,
      click: () => media && media.stdin.write(`output ${d.id}\n`),
    })),
    { type: 'separator' },
  ];
}

ipcMain.on('set-output', (_e, id) => {
  if (media && outputs && outputs.devices.some((d) => d.id === id)) media.stdin.write(`output ${id}\n`);
});

ipcMain.on('context-menu', (_e, { timerActive, micMuted }) => {
  const timer = timerMenuItems(timerActive);
  Menu.buildFromTemplate([
    ...timer,
    ...(timer.length ? [{ type: 'separator' }] : []),
    ...outputMenuItems(),
    { label: 'Som mudo', click: () => media && media.stdin.write('mute\n') },
    ...(settings.get().modules.mic ? [{
      label: micMuted ? 'Desmutar microfone' : 'Mutar microfone',
      click: () => media && media.stdin.write('micmute\n'),
    }] : []),
    { type: 'separator' },
    { label: 'Configurações…', click: () => openSettings() },
    { label: 'Sair', click: () => app.quit() },
  ]).popup({ window: win });
});

// ---------------------------------------------------------------- settings window

function settingsInfo() {
  return {
    version: app.getVersion(),
    electron: process.versions.electron,
    versionLine: `Versão ${app.getVersion()} · Windows`,
    settingsFile: settings.file(),
    obsLogs: OBS_LOGS,
    launchAtLogin: app.getLoginItemSettings().openAtLogin,
  };
}

function openSettings(page) {
  if (settingsWin && !settingsWin.isDestroyed()) {
    if (settingsWin.isMinimized()) settingsWin.restore();
    settingsWin.show();
    settingsWin.focus();
    if (page) settingsWin.webContents.send('settings:navigate', page);
    return;
  }
  settingsWin = new BrowserWindow({
    width: 880,
    height: 600,
    minWidth: 720,
    minHeight: 480,
    frame: false,
    show: false,
    backgroundColor: '#141416',
    title: 'Configurações do Tandem',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'settings', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWin.removeMenu();
  settingsWin.loadFile(path.join('settings', 'index.html'));
  settingsWin.once('ready-to-show', () => {
    settingsWin.show();
    if (page) settingsWin.webContents.send('settings:navigate', page);
  });
  settingsWin.on('closed', () => {
    settingsWin = null;
    shortcutsPaused = false; // in case the window closed while recording a shortcut
    applyShortcuts();
  });
}

function broadcastSettings() {
  const s = settings.get();
  if (win && !win.isDestroyed()) win.webContents.send('settings', s);
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send('settings', s, settingsInfo());
}

function onSettingsChanged(_s, key) {
  if ((key === '*' || key === 'hyperKey') && media) media.stdin.write(`hyper ${settings.get().hyperKey ? 'on' : 'off'}\n`);
  if (key === '*' || key.startsWith('launcher')) launcher.broadcastSettings();
  if (key === '*' || key.startsWith('shortcuts')) applyShortcuts();
  if (key === '*' || key === 'hideInFullscreen') updateVisibility();
  broadcastSettings();
}

ipcMain.handle('settings:get', () => ({ settings: settings.get(), info: settingsInfo() }));

ipcMain.handle('settings:set', (_e, key, value) => {
  if (key === '$launchAtLogin') {
    app.setLoginItemSettings({ openAtLogin: !!value });
    broadcastSettings();
  } else {
    settings.set(key, value);
  }
  return { settings: settings.get(), info: settingsInfo() };
});

ipcMain.handle('settings:action', (_e, name) => {
  switch (name) {
    case 'clearClipboard':
      launcher.clearHistory();
      return { message: 'Histórico apagado' };
    case 'openLauncher':
      launcher.show();
      return {};
    case 'openNotes':
      notes.open();
      return {};
    case 'pickFolder': {
      const picked = dialog.showOpenDialogSync(settingsWin, { properties: ['openDirectory'] });
      return { path: picked ? picked[0] : null };
    }
    case 'reloadIsland':
      if (win) win.reload();
      return { message: 'Ilha recarregada' };
    case 'openSettingsFolder':
      shell.showItemInFolder(settings.file());
      return {};
    case 'openRepo':
      shell.openExternal('https://github.com/lwbios/tandem-desktop');
      return {};
    case 'reset':
      settings.reset();
      return { settings: settings.get(), info: settingsInfo(), message: 'Configurações restauradas' };
    default:
      return {};
  }
});

ipcMain.on('settings:window', (_e, cmd) => {
  if (!settingsWin) return;
  if (cmd === 'minimize') settingsWin.minimize();
  if (cmd === 'close') settingsWin.close();
});

// The island page asks for settings when it loads.
ipcMain.handle('island:settings', () => settings.get());

// ---------------------------------------------------------------- global shortcuts

function toggleIsland() {
  userHidden = !userHidden;
  updateVisibility();
}

const SHORTCUT_ACTIONS = {
  openLauncher: () => launcher.toggle(),
  toggleIsland: () => toggleIsland(),
  openSettings: () => openSettings(),
  toggleMic: () => media && media.stdin.write('micmute\n'),
  playPause: () => media && media.stdin.write('toggle\n'),
  notes: () => notes.toggle(),
};

let shortcutsPaused = false;

function applyShortcuts() {
  globalShortcut.unregisterAll();
  if (shortcutsPaused) return;
  for (const [name, accel] of Object.entries(settings.get().shortcuts)) {
    if (!accel || !SHORTCUT_ACTIONS[name]) continue;
    try {
      if (!globalShortcut.register(accel, SHORTCUT_ACTIONS[name])) console.error(`[shortcut] taken: ${accel}`);
    } catch (err) {
      console.error(`[shortcut] invalid: ${accel}`, err.message);
    }
  }
}

// Paused while the settings window records a new combination.
ipcMain.on('shortcuts:pause', (_e, paused) => {
  shortcutsPaused = !!paused;
  applyShortcuts();
});

ipcMain.handle('settings:shortcut', (_e, name, accel) => {
  if (!(name in SHORTCUT_ACTIONS)) return { ok: false, error: 'Atalho desconhecido.' };
  if (accel) {
    const usedBy = Object.entries(settings.get().shortcuts).find(([n, a]) => n !== name && a === accel);
    if (usedBy) return { ok: false, error: 'Esse atalho já está sendo usado em outra ação.' };
    // Probe: if Windows or another app owns the combination, registration fails.
    let free = false;
    try {
      free = globalShortcut.register(accel, () => {});
      if (free) globalShortcut.unregister(accel);
    } catch {
      return { ok: false, error: 'Combinação inválida.' };
    }
    if (!free) return { ok: false, error: 'Esse atalho já está em uso por outro app.' };
  }
  settings.set(`shortcuts.${name}`, accel);
  return { ok: true, settings: settings.get() };
});

app.whenReady().then(() => {
  settings.load();
  settings.onChange(onSettingsChanged);
  createWindow();
  launcher.init({
    send: (cmd) => media && media.stdin.write(cmd + '\n'),
    settings,
    openSettings: (page) => openSettings(page),
    startTimer,
    startFocus,
    stopFocus: () => stopFocus(),
    openNotes: (create) => notes.open(create),
  });
  notes.init();
  applyShortcuts();
  createTray();
  startMediaWatcher();
  setInterval(pollObs, 1000);

  screen.on('display-metrics-changed', () => {
    const { bounds } = screen.getPrimaryDisplay();
    win.setPosition(Math.round(bounds.x + (bounds.width - WIDTH) / 2), bounds.y);
  });
});

app.on('before-quit', () => {
  quitting = true;
  if (media) media.stdin.write('hyper off\n');
  globalShortcut.unregisterAll();
  if (media) media.kill();
});

// The island is the app: closing the settings window must not quit.
app.on('window-all-closed', (e) => e.preventDefault());
