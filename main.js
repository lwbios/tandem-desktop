const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeTheme } = require('electron');
const path = require('path');
const readline = require('readline');
const { spawn, execFileSync } = require('child_process');

const WIDTH = 520;
const HEIGHT = 240;

let win = null;
let tray = null;
let media = null;
let quitting = false;

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

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
  });
  win.webContents.on('console-message', (_e, level, message, line, source) => {
    if (level >= 2) console.error(`[renderer] ${message} (${source}:${line})`);
  });
}

function startMediaWatcher() {
  media = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', path.join(__dirname, 'media.ps1'),
  ], { windowsHide: true });

  media.stdout.setEncoding('utf8');
  readline.createInterface({ input: media.stdout }).on('line', (line) => {
    line = line.replace(/^\uFEFF/, '').trim();
    if (process.env.ISLAND_DEBUG) console.log('[media]', line.slice(0, 160));
    if (!line.startsWith('{') || !win || win.isDestroyed()) return;
    try {
      const msg = JSON.parse(line);
      if (msg.type === 'mic' && msg.paths) loadAppIcons(msg.paths);
      win.webContents.send(['volume', 'mic'].includes(msg.type) ? msg.type : 'media', msg);
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
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Iniciar com o Windows',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    },
    { label: 'Recarregar', click: () => win && win.reload() },
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

const TIMER_PRESETS = [1, 5, 10, 25, 60];

function timerMenuItems(timerActive) {
  const send = (action, minutes) => win && win.webContents.send('timer', { action, minutes });
  if (timerActive) {
    return [
      { label: 'Pausar/retomar timer', click: () => send('pause') },
      { label: 'Cancelar timer', click: () => send('cancel') },
    ];
  }
  return TIMER_PRESETS.map((m) => ({
    label: m === 60 ? 'Timer de 1 hora' : `Timer de ${m} min`,
    click: () => send('start', m),
  }));
}

ipcMain.on('context-menu', (_e, { timerActive, micMuted }) => {
  Menu.buildFromTemplate([
    ...timerMenuItems(timerActive),
    { type: 'separator' },
    { label: 'Som mudo', click: () => media && media.stdin.write('mute\n') },
    {
      label: micMuted ? 'Desmutar microfone' : 'Mutar microfone',
      click: () => media && media.stdin.write('micmute\n'),
    },
    { type: 'separator' },
    { label: 'Sair', click: () => app.quit() },
  ]).popup({ window: win });
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  startMediaWatcher();

  screen.on('display-metrics-changed', () => {
    const { bounds } = screen.getPrimaryDisplay();
    win.setPosition(Math.round(bounds.x + (bounds.width - WIDTH) / 2), bounds.y);
  });
});

app.on('before-quit', () => {
  quitting = true;
  if (media) media.kill();
});
