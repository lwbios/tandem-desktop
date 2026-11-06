// Persistent settings (userData/settings.json) with defaults and change listeners.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  hideInFullscreen: true,
  modules: {
    media: true,
    volume: true,
    timer: true,
    mic: true,
    camera: true,
    obs: true,
    output: true,
    battery: true,
  },
  media: { showArt: true },
  volume: { scroll: true, step: 2 },
  timer: { presets: [1, 5, 10, 25, 60], sound: true },
  mic: { discord: true },
  output: { battery: true },
  appearance: { scale: 1, topOffset: 6, reduceMotion: false },
  hyperKey: false,
  focus: {
    minutes: 25,
    mode: 'minimize', // minimize | close
    apps: ['Discord', 'Steam', 'Spotify'],
  },
  launcher: {
    clipboardHistory: true,
    clipboardMax: 200,
    fileSearch: true,
    snippets: [
      { name: 'Data de hoje', keyword: ';data', text: '{date}' },
      { name: 'Data e hora', keyword: ';agora', text: '{datetime}' },
    ],
    folders: [
      { name: 'Documentos', path: '{documents}' },
      { name: 'Downloads', path: '{downloads}' },
      { name: 'Área de Trabalho', path: '{desktop}' },
      { name: 'Imagens', path: '{pictures}' },
    ],
    quicklinks: [
      { name: 'Google', keyword: 'g', url: 'https://www.google.com/search?q={query}' },
      { name: 'YouTube', keyword: 'yt', url: 'https://www.youtube.com/results?search_query={query}' },
      { name: 'GitHub', keyword: 'gh', url: 'https://github.com/search?q={query}' },
      { name: 'Wikipédia', keyword: 'wiki', url: 'https://pt.wikipedia.org/w/index.php?search={query}' },
      { name: 'Google Tradutor', keyword: 'tr', url: 'https://translate.google.com/?sl=auto&tl=pt&text={query}' },
      { name: 'Google Maps', keyword: 'maps', url: 'https://www.google.com/maps/search/{query}' },
    ],
  },
  shortcuts: {
    openLauncher: 'Alt+Space',
    toggleIsland: 'Control+Alt+I',
    openSettings: 'Control+Alt+O',
    toggleMic: '',
    playPause: '',
    notes: 'Control+Alt+N',
  },
};

const file = () => path.join(app.getPath('userData'), 'settings.json');
const clone = (v) => JSON.parse(JSON.stringify(v));
const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Defaults filled in for anything missing, so older files keep working.
function merge(base, saved) {
  const out = clone(base);
  if (!isObject(saved)) return out;
  for (const [k, v] of Object.entries(saved)) {
    if (!(k in base)) continue;
    out[k] = isObject(base[k]) ? merge(base[k], v) : v;
  }
  return out;
}

let current = clone(DEFAULTS);
const listeners = [];

function load() {
  try {
    current = merge(DEFAULTS, JSON.parse(fs.readFileSync(file(), 'utf8')));
  } catch {
    current = clone(DEFAULTS);
  }
  return current;
}

function save() {
  try {
    fs.mkdirSync(path.dirname(file()), { recursive: true });
    fs.writeFileSync(file(), JSON.stringify(current, null, 2));
  } catch (err) {
    console.error('[settings] save failed:', err.message);
  }
}

const get = () => current;

// Set one value by dotted path, e.g. set('modules.camera', false).
function set(keyPath, value) {
  const keys = keyPath.split('.');
  let node = current;
  let def = DEFAULTS;
  for (const k of keys.slice(0, -1)) {
    if (!isObject(node[k]) || !isObject(def[k])) throw new Error(`unknown setting ${keyPath}`);
    node = node[k];
    def = def[k];
  }
  const last = keys[keys.length - 1];
  if (!(last in def)) throw new Error(`unknown setting ${keyPath}`);
  node[last] = value;
  save();
  listeners.forEach((fn) => fn(current, keyPath));
  return current;
}

function reset() {
  current = clone(DEFAULTS);
  save();
  listeners.forEach((fn) => fn(current, '*'));
  return current;
}

const onChange = (fn) => listeners.push(fn);

module.exports = { load, get, set, reset, onChange, file, DEFAULTS };
