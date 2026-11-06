// Quick notes: one small floating window with several plain-text notes,
// saved to userData/notes.json as you type.
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let win = null;
let notes = [];
let pinned = true;

const file = () => path.join(app.getPath('userData'), 'notes.json');

function load() {
  try {
    const data = JSON.parse(fs.readFileSync(file(), 'utf8'));
    notes = data.notes || [];
    pinned = data.pinned !== false;
  } catch {
    notes = [];
  }
  if (!notes.length) notes.push(newNote());
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(file()), { recursive: true });
      fs.writeFileSync(file(), JSON.stringify({ notes, pinned }, null, 2));
    } catch (err) {
      console.error('[notes] save failed:', err.message);
    }
  }, 300);
}

function newNote() {
  return { id: crypto.randomUUID(), text: '', updated: Date.now() };
}

function open(create = false) {
  if (create) {
    // Reuse an empty note instead of piling them up.
    const empty = notes.find((n) => !n.text.trim());
    if (empty) {
      notes = [empty, ...notes.filter((n) => n !== empty)];
    } else {
      notes.unshift(newNote());
    }
    save();
  }
  if (win && !win.isDestroyed()) {
    win.webContents.send('notes:data', { notes, pinned, focusId: create ? notes[0].id : null });
    win.show();
    win.focus();
    return;
  }
  const area = screen.getPrimaryDisplay().workArea;
  win = new BrowserWindow({
    width: 380,
    height: 460,
    minWidth: 280,
    minHeight: 220,
    x: area.x + area.width - 380 - 24,
    y: area.y + 90,
    frame: false,
    show: false,
    alwaysOnTop: pinned,
    skipTaskbar: false,
    backgroundColor: '#1c1b17',
    title: 'Notas do Tandem',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'notes', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.removeMenu();
  win.loadFile(path.join('notes', 'index.html'));
  win.once('ready-to-show', () => {
    win.webContents.send('notes:data', { notes, pinned, focusId: create ? notes[0].id : null });
    win.show();
  });
  win.on('closed', () => { win = null; });
}

function init() {
  load();
  ipcMain.on('notes:update', (_e, { id, text }) => {
    const n = notes.find((x) => x.id === id);
    if (!n) return;
    n.text = String(text);
    n.updated = Date.now();
    save();
  });
  ipcMain.handle('notes:create', () => {
    const n = newNote();
    notes.unshift(n);
    save();
    return { notes, id: n.id };
  });
  ipcMain.handle('notes:delete', (_e, id) => {
    notes = notes.filter((n) => n.id !== id);
    if (!notes.length) notes.push(newNote());
    save();
    return notes;
  });
  ipcMain.on('notes:pin', (_e, value) => {
    pinned = !!value;
    if (win) win.setAlwaysOnTop(pinned);
    save();
  });
  ipcMain.on('notes:window', (_e, cmd) => {
    if (!win) return;
    if (cmd === 'close') win.close();
    if (cmd === 'minimize') win.minimize();
  });
}

const toggle = () => {
  if (win && !win.isDestroyed() && win.isVisible() && win.isFocused()) win.hide();
  else open(false);
};

module.exports = { init, open, toggle };
