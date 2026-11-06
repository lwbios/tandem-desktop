const api = window.launcher;
const $ = (sel, root = document) => root.querySelector(sel);

// ---------------------------------------------------------------- icons
const PATHS = {
  clipboard: 'M16 3h-1.2A3 3 0 0 0 12 1a3 3 0 0 0-2.8 2H8a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm3 15H9v-2h6v2Zm0-4H9v-2h6v2Zm0-4H9V8h6v2Z',
  smile: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-3.5 6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 18a5.5 5.5 0 0 1-5-3.2h10A5.5 5.5 0 0 1 12 18Z',
  gear: 'M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1L15 3.5h-4L10.7 6a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.7 1.7 1l.3 2.5h4l.3-2.5c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.4ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z',
  lock: 'M17 9V7A5 5 0 0 0 7 7v2a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2ZM9 7a3 3 0 0 1 6 0v2H9V7Zm4 9.7V18h-2v-1.3a2 2 0 1 1 2 0Z',
  moon: 'M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z',
  power: 'M13 3h-2v10h2V3Zm4.8 2.2-1.4 1.4A7 7 0 1 1 7.6 6.6L6.2 5.2A9 9 0 1 0 17.8 5.2Z',
  restart: 'M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z',
  logout: 'M10 17l1.4-1.4L8.8 13H20v-2H8.8l2.6-2.6L10 7l-5 5 5 5ZM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5Z',
  trash: 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z',
  windows: 'M3 5.5 10 4.5v7H3v-6Zm8-1.2L21 3v8.5H11V4.3ZM3 12.5h7v7L3 18.5v-6Zm8 0h10V21l-10-1.4v-7.1Z',
  tasks: 'M3 3h18v2H3V3Zm0 4h18v14H3V7Zm4 3v8h2v-8H7Zm4 3v5h2v-5h-2Zm4-2v7h2v-7h-2Z',
  folder: 'M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2Z',
  download: 'M5 20h14v-2H5v2ZM19 9h-4V3H9v6H5l7 7 7-7Z',
  volume: 'M3 9v6h4l5 5V4L7 9H3Zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4Z',
  play: 'M7 4.5v15L20 12 7 4.5Z',
  next: 'M16 5h2v14h-2V5ZM4 5v14l10.5-7L4 5Z',
  mic: 'M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2Z',
  contrast: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18V4a8 8 0 0 1 0 16Z',
  winLeft: 'M3 4h8v16H3V4Zm10 0h8v16h-8V4Zm2 2v12h4V6h-4Z',
  winRight: 'M3 4h8v16H3V4Zm2 2v12h4V6H5Zm8-2h8v16h-8V4Z',
  winTop: 'M3 3h18v8H3V3Zm0 10h18v8H3v-8Zm2 2v4h14v-4H5Z',
  winBottom: 'M3 3h18v8H3V3Zm2 2v4h14V5H5Zm-2 8h18v8H3v-8Z',
  winMax: 'M3 3h18v18H3V3Z',
  winCenter: 'M3 3h18v18H3V3Zm2 2v14h14V5H5Zm2 2h10v10H7V7Z',
  winRestore: 'M5 7h12v12H5V7Zm2 2v8h8V9H7Zm2-6h12v12h-2V5H9V3Z',
  search: 'M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 14 15.5l.3.3v.8l5 5 1.5-1.5-5-5Zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z',
  link: 'M3.9 12a3.1 3.1 0 0 1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7A3.1 3.1 0 0 1 3.9 12ZM8 13h8v-2H8v2Zm9-6h-4v1.9h4a3.1 3.1 0 0 1 0 6.2h-4V17h4a5 5 0 0 0 0-10Z',
  calc: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm0 2v4h10V4H7Zm0 6v2h2v-2H7Zm4 0v2h2v-2h-2Zm4 0v6h2v-6h-2Zm-8 4v2h2v-2H7Zm4 0v2h2v-2h-2Zm-4 4v2h6v-2H7Z',
  app: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  calendar: 'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V9h14v11Z',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 10.6 3.2 1.9-1 1.7L11 13.5V7h2v5.6Z',
  timer: 'M9 1h6v2H9V1Zm10 6.4 1.4-1.4L19 4.6 17.6 6A9 9 0 1 0 19 7.4ZM13 14h-2V8h2v6Z',
  target: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm0-14a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm0 10a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  key: 'M12.6 10a6 6 0 1 0 0 4H17v4h4v-4h2v-4H12.6ZM7 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z',
  text: 'M5 4v3h5.5v12h3V7H19V4H5Z',
  note: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10l6-6V5a2 2 0 0 0-2-2ZM7 8h10v2H7V8Zm0 4h7v2H7v-2Zm7 7v-5h5l-5 5Z',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm-1 7V3.5L18.5 9H13Z',
  image: 'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5Z',
  close: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm5 13.6L15.6 17 12 13.4 8.4 17 7 15.6l3.6-3.6L7 8.4 8.4 7l3.6 3.6L15.6 7 17 8.4 13.4 12l3.6 3.6Z',
  snippet: 'M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4Zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4Z',
  hyper: 'M13 2 3 14h7l-1 8 10-12h-7l1-8Z',
};
const svg = (name) => `<svg viewBox="0 0 24 24"><path d="${PATHS[name]}"/></svg>`;

// ---------------------------------------------------------------- commands
// action.kind is handled by launcher-main.js: system, window, view, settings, url, copy, paste, app
const COMMANDS = [
  { id: 'cmd:clipboard', title: 'Histórico da área de transferência', sub: 'Tandem', icon: 'clipboard', color: 'orange', words: 'clipboard copiar colar historico', action: { kind: 'view', id: 'clipboard' } },
  { id: 'cmd:emoji', title: 'Emojis e símbolos', sub: 'Tandem', icon: 'smile', color: 'amber', words: 'emoji simbolo emoticon', action: { kind: 'view', id: 'emoji' } },
  { id: 'cmd:settings', title: 'Configurações do Tandem', sub: 'Tandem', icon: 'gear', color: 'gray', words: 'preferencias settings opcoes', action: { kind: 'settings' } },
  { id: 'cmd:screens', title: 'Prints recentes', sub: 'Tandem', icon: 'image', color: 'purple', words: 'print screenshot captura tela imagem', action: { kind: 'view', id: 'screens' } },
  { id: 'cmd:notes', title: 'Abrir notas', sub: 'Notas', icon: 'note', color: 'amber', words: 'notas notes anotacoes bloco', action: { kind: 'notes' } },
  { id: 'cmd:newnote', title: 'Nova nota', sub: 'Notas', icon: 'note', color: 'amber', words: 'nota nova note new criar', action: { kind: 'notes', create: true } },
  { id: 'cmd:focus', title: 'Iniciar foco (25 min)', sub: 'Foco', icon: 'target', color: 'purple', words: 'foco focus pomodoro concentrar bloquear', action: { kind: 'focus', minutes: 25 } },
  { id: 'cmd:focusstop', title: 'Encerrar foco', sub: 'Foco', icon: 'target', color: 'purple', words: 'foco parar encerrar stop focus', action: { kind: 'focusStop' } },
  { id: 'cmd:quit', title: 'Fechar um aplicativo…', sub: 'Sistema', icon: 'close', color: 'red', words: 'fechar quit kill encerrar matar app', fill: 'fechar ' },

  { id: 'win:left', title: 'Metade esquerda', sub: 'Janela', icon: 'winLeft', color: 'blue', words: 'janela window left esquerda snap', action: { kind: 'window', id: 'left' } },
  { id: 'win:right', title: 'Metade direita', sub: 'Janela', icon: 'winRight', color: 'blue', words: 'janela window right direita snap', action: { kind: 'window', id: 'right' } },
  { id: 'win:top', title: 'Metade de cima', sub: 'Janela', icon: 'winTop', color: 'blue', words: 'janela window top cima', action: { kind: 'window', id: 'top' } },
  { id: 'win:bottom', title: 'Metade de baixo', sub: 'Janela', icon: 'winBottom', color: 'blue', words: 'janela window bottom baixo', action: { kind: 'window', id: 'bottom' } },
  { id: 'win:max', title: 'Maximizar', sub: 'Janela', icon: 'winMax', color: 'blue', words: 'janela window maximize tela inteira', action: { kind: 'window', id: 'maximize' } },
  { id: 'win:almost', title: 'Quase maximizar', sub: 'Janela', icon: 'winMax', color: 'blue', words: 'janela window almost maximize', action: { kind: 'window', id: 'almost' } },
  { id: 'win:center', title: 'Centralizar', sub: 'Janela', icon: 'winCenter', color: 'blue', words: 'janela window center centro', action: { kind: 'window', id: 'center' } },
  { id: 'win:restore', title: 'Restaurar tamanho', sub: 'Janela', icon: 'winRestore', color: 'blue', words: 'janela window restore', action: { kind: 'window', id: 'restore' } },

  { id: 'media:play', title: 'Tocar/pausar música', sub: 'Mídia', icon: 'play', color: 'pink', words: 'play pause musica media', action: { kind: 'system', id: 'playPause' } },
  { id: 'media:next', title: 'Próxima faixa', sub: 'Mídia', icon: 'next', color: 'pink', words: 'next proxima musica skip', action: { kind: 'system', id: 'nextTrack' } },
  { id: 'sys:mute', title: 'Ativar/desativar som', sub: 'Sistema', icon: 'volume', color: 'teal', words: 'mute mudo som volume', action: { kind: 'system', id: 'mute' } },
  { id: 'sys:mic', title: 'Mutar/desmutar microfone', sub: 'Sistema', icon: 'mic', color: 'amber', words: 'microfone mic mute', action: { kind: 'system', id: 'micMute' } },
  { id: 'sys:dark', title: 'Alternar modo escuro', sub: 'Sistema', icon: 'contrast', color: 'purple', words: 'dark mode tema escuro claro light', action: { kind: 'system', id: 'darkMode' } },
  { id: 'sys:lock', title: 'Bloquear tela', sub: 'Sistema', icon: 'lock', color: 'slate', words: 'lock bloquear', action: { kind: 'system', id: 'lock' } },
  { id: 'sys:sleep', title: 'Suspender', sub: 'Sistema', icon: 'moon', color: 'slate', words: 'sleep dormir suspender', action: { kind: 'system', id: 'sleep' }, confirm: true },
  { id: 'sys:restart', title: 'Reiniciar', sub: 'Sistema', icon: 'restart', color: 'slate', words: 'restart reiniciar reboot', action: { kind: 'system', id: 'restart' }, confirm: true },
  { id: 'sys:shutdown', title: 'Desligar', sub: 'Sistema', icon: 'power', color: 'red', words: 'shutdown desligar power off', action: { kind: 'system', id: 'shutdown' }, confirm: true },
  { id: 'sys:logoff', title: 'Sair da conta do Windows', sub: 'Sistema', icon: 'logout', color: 'slate', words: 'logoff logout sair sessao', action: { kind: 'system', id: 'logoff' }, confirm: true },
  { id: 'sys:bin', title: 'Esvaziar lixeira', sub: 'Sistema', icon: 'trash', color: 'slate', words: 'lixeira recycle bin trash esvaziar', action: { kind: 'system', id: 'emptyBin' }, confirm: true },
  { id: 'sys:settings', title: 'Configurações do Windows', sub: 'Sistema', icon: 'windows', color: 'blue', words: 'windows settings configuracoes', action: { kind: 'system', id: 'settings' } },
  { id: 'sys:taskmgr', title: 'Gerenciador de Tarefas', sub: 'Sistema', icon: 'tasks', color: 'green', words: 'task manager gerenciador tarefas', action: { kind: 'system', id: 'taskManager' } },
  { id: 'sys:explorer', title: 'Explorador de Arquivos', sub: 'Sistema', icon: 'folder', color: 'amber', words: 'explorer arquivos pastas files', action: { kind: 'system', id: 'explorer' } },
  { id: 'sys:downloads', title: 'Abrir Downloads', sub: 'Sistema', icon: 'download', color: 'blue', words: 'downloads baixados', action: { kind: 'system', id: 'downloads' } },
];

// What shows with an empty search box.
const SUGGESTED = ['cmd:clipboard', 'cmd:emoji', 'cmd:notes', 'cmd:screens', 'cmd:focus', 'win:left', 'win:right', 'cmd:settings'];

// ---------------------------------------------------------------- state
let apps = [];
let history = [];
let config = { quicklinks: [], snippets: [], folders: [], clipboardHistory: true, fileSearch: true };
let clipText = '';      // current clipboard text, for the "transform" commands
let screens = [];       // recent screenshots
let found = { query: '', files: [], procs: [] }; // async results from the main process
const icons = {}; // app name -> data URL
let view = 'root'; // root | clipboard | emoji
let items = [];
let sel = 0;
let confirmId = null;
let mouse = { x: -1, y: -1, armed: false };
window.addEventListener('mousemove', (e) => {
  if (mouse.x >= 0 && (e.screenX !== mouse.x || e.screenY !== mouse.y)) mouse.armed = true;
  mouse.x = e.screenX;
  mouse.y = e.screenY;
});
const hoverOk = () => mouse.armed;

const RECENTS_KEY = 'tandem.recents';
function recents() {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY)) || []; } catch { return []; }
}
function remember(id) {
  try {
    const list = [id, ...recents().filter((r) => r !== id)].slice(0, 6);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
  } catch { /* storage unavailable */ }
}

// ---------------------------------------------------------------- search
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Higher is better; 0 means no match.
function score(query, title, words = '') {
  const q = norm(query);
  const t = norm(title);
  if (!q) return 1;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.split(/[\s\-_.()]+/).some((w) => w.startsWith(q))) return 60;
  if (t.includes(q)) return 45;
  const w = norm(words);
  if (w.split(/\s+/).some((x) => x.startsWith(q))) return 35;
  // initials ("vsc" -> Visual Studio Code)
  const initials = t.split(/[\s\-_.]+/).map((x) => x[0]).join('');
  if (initials.startsWith(q)) return 30;
  // letters in order
  let i = 0;
  for (const ch of t) if (ch === q[i]) i++;
  return i === q.length ? 10 : 0;
}

function quicklinkMatch(query) {
  const m = query.match(/^(\S+)\s+(.+)$/);
  if (!m) return null;
  const link = config.quicklinks.find((l) => norm(l.keyword) === norm(m[1]));
  return link ? { link, text: m[2] } : null;
}

const fillUrl = (url, text) => url.replace(/\{query\}/g, encodeURIComponent(text));

function buildRoot(query) {
  const q = query.trim();
  const out = [];

  if (!q) {
    const rec = recents()
      .map((id) => (id.startsWith('app:') ? appItem(apps.find((a) => `app:${a.name}` === id)) : COMMANDS.find((c) => c.id === id)))
      .filter(Boolean);
    if (rec.length) out.push({ section: 'Recentes' }, ...rec);
    out.push({ section: 'Sugestões' }, ...SUGGESTED.map((id) => COMMANDS.find((c) => c.id === id)).filter((c) => !rec.includes(c)));
    return out;
  }

  // "fechar discord" lists running apps to close.
  const quit = norm(q).match(/^(?:fechar|close|quit|kill|encerrar)(?:\s+(.*))?$/);
  if (quit) {
    const term = quit[1] || '';
    const procs = found.procs.filter((p) => !term || score(term, p.name, p.title) > 0);
    out.push({ section: procs.length ? 'Fechar aplicativo' : 'Procurando apps abertos…' }, ...procs.map((p) => ({
      id: `quit:${p.name}`, title: `Fechar ${prettyName(p.name)}`, sub: p.title, procIcon: p.icon, icon: 'close', color: 'red',
      accessory: p.count > 1 ? `${p.count} janelas` : 'Aberto', action: { kind: 'quit', name: p.name },
    })));
    return out;
  }

  const P = window.Providers;
  const value = window.Calc.evaluate(q);
  if (value !== null) {
    out.push({ section: 'Calculadora' }, {
      id: 'calc', calc: true, title: window.Calc.format(value), sub: q, icon: 'calc', color: 'orange',
      accessory: 'Enter copia', action: { kind: 'copy', text: window.Calc.plain(value) },
    });
  }
  for (const provider of [P.units, (x) => P.currency(x, () => refresh(true)), P.dates, P.colors, P.timers]) {
    const items = provider(q);
    if (items) out.push(...items);
  }

  const ql = quicklinkMatch(q);
  if (ql) {
    out.push({ section: 'Quicklink' }, {
      id: `ql:${ql.link.keyword}`, title: `${ql.link.name}: ${ql.text}`, sub: ql.link.keyword, icon: 'link', color: 'blue',
      accessory: 'Abrir', action: { kind: 'url', url: fillUrl(ql.link.url, ql.text) },
    });
  }

  const extras = [...P.generatorCommands(), ...P.transformCommands(clipText)];
  const ranked = [
    ...apps.map((a) => ({ item: appItem(a), s: score(q, a.name) * 1.05 })),
    ...COMMANDS.map((c) => ({ item: c, s: score(q, c.title, c.words) })),
    ...extras.map((c) => ({ item: c, s: score(q, c.title, c.words) * 0.9 })),
    ...config.snippets.map((sn) => ({
      item: { id: `snip:${sn.keyword}`, title: sn.name, sub: sn.text.replace(/\s+/g, ' ').slice(0, 80), icon: 'snippet', color: 'pink', accessory: `Snippet · ${sn.keyword}`, action: { kind: 'snippet', text: sn.text } },
      s: Math.max(score(q, sn.name, sn.text), norm(q) === norm(sn.keyword) ? 95 : score(q, sn.keyword)),
    })),
    ...config.folders.map((f) => ({
      item: { id: `dir:${f.path}`, title: f.name, sub: f.path, icon: 'folder', color: 'amber', accessory: 'Pasta', action: { kind: 'open', path: f.path } },
      s: score(q, f.name, f.path) * 1.02,
    })),
    ...config.quicklinks.map((l) => ({
      item: { id: `qlk:${l.keyword}`, title: l.name, sub: `Quicklink · digite "${l.keyword} …"`, icon: 'link', color: 'blue', accessory: 'Quicklink', fill: `${l.keyword} ` },
      s: score(q, l.name, l.keyword),
    })),
  ].filter((r) => r.s > 0).sort((a, b) => b.s - a.s).slice(0, 40);
  if (ranked.length) out.push({ section: 'Resultados' }, ...ranked.map((r) => r.item));

  // Files come from the Windows Search index, a moment after typing.
  if (config.fileSearch && q.length >= 2 && found.query === q && found.files.length) {
    out.push({ section: 'Arquivos' }, ...found.files.map((f) => ({
      id: `file:${f.path}`, title: f.name, sub: f.path, fileIcon: f.path, icon: f.folder ? 'folder' : 'file', color: f.folder ? 'amber' : 'slate',
      accessory: f.folder ? 'Pasta' : f.kind || 'Arquivo', action: { kind: 'open', path: f.path }, file: f,
    })));
  }

  const google = config.quicklinks.find((l) => l.keyword === 'g') || { name: 'Google', url: 'https://www.google.com/search?q={query}' };
  out.push({ section: 'Buscar na web' }, {
    id: 'web', title: `Pesquisar "${q}"`, sub: google.name, icon: 'search', color: 'gray', accessory: 'Web',
    action: { kind: 'url', url: fillUrl(google.url, q) },
  });
  return out;
}

function appItem(a) {
  if (!a) return null;
  return { id: `app:${a.name}`, title: a.name, sub: '', appName: a.name, accessory: 'Aplicativo', action: { kind: 'app', id: a.id } };
}

function buildClipboard(query) {
  const q = norm(query.trim());
  const list = history.filter((h) => !q || (h.kind === 'text' ? norm(h.text).includes(q) : 'imagem image'.includes(q)));
  if (!config.clipboardHistory) return [{ section: 'O histórico está desligado nas configurações' }];
  if (!list.length) return [];
  return [{ section: `${list.length} ${list.length === 1 ? 'item' : 'itens'}` }, ...list.map((h) => ({
    id: `clip:${h.id}`,
    title: h.kind === 'text' ? h.text.replace(/\s+/g, ' ').slice(0, 120) : `Imagem (${h.width}×${h.height})`,
    clip: h,
    accessory: timeAgo(h.at),
    action: { kind: 'pasteHistory', id: h.id },
  }))];
}

function buildScreens(query) {
  const q = norm(query.trim());
  return screens.filter((s) => !q || norm(s.name).includes(q))
    .map((s) => ({ id: `shot:${s.path}`, shot: s, title: s.name, action: { kind: 'pasteImage', path: s.path } }));
}

const PRETTY = { msedge: 'Edge', chrome: 'Chrome', discord: 'Discord', spotify: 'Spotify', code: 'VS Code', explorer: 'Explorador', obs64: 'OBS', steam: 'Steam', whatsapp: 'WhatsApp' };
const prettyName = (n) => PRETTY[n.toLowerCase()] || n.charAt(0).toUpperCase() + n.slice(1);

function buildEmoji(query) {
  const q = query.trim();
  return window.EMOJI.filter(([, words]) => !q || score(q, words) > 0)
    .map(([ch, words]) => ({ id: `emoji:${ch}`, emoji: ch, title: words.split(' ').slice(0, 2).join(' '), action: { kind: 'paste', text: ch } }));
}

function timeAgo(t) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'agora';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}

// ---------------------------------------------------------------- render
const listEl = $('#list');
const input = $('#query');

function selectable() {
  return items.filter((i) => !i.section);
}

function refresh(keepSelection = false) {
  const q = input.value;
  if (view === 'clipboard') items = buildClipboard(q);
  else if (view === 'emoji') items = buildEmoji(q);
  else if (view === 'screens') items = buildScreens(q);
  else {
    items = buildRoot(q);
    requestSearch(q);
  }
  if (!keepSelection) sel = 0;
  sel = Math.min(sel, Math.max(0, selectable().length - 1));
  confirmId = null;
  render();
}

function render() {
  document.body.classList.toggle('in-view', view !== 'root');
  document.body.classList.toggle('with-preview', view === 'clipboard' && selectable().length > 0);
  $('#viewTag').textContent = VIEW_NAMES[view] || '';
  listEl.innerHTML = '';

  const sels = selectable();
  if (!sels.length && !items.length) {
    const empty = { clipboard: 'Nada copiado ainda.', screens: 'Nenhum print na pasta Imagens\\Capturas de tela.' };
    listEl.innerHTML = `<div class="empty">${empty[view] || 'Nenhum resultado.'}</div>`;
    renderFooter(null);
    renderPreview(null);
    return;
  }

  if (view === 'emoji' || view === 'screens') {
    const grid = document.createElement('div');
    grid.className = view === 'emoji' ? 'emoji-grid' : 'shot-grid';
    sels.forEach((it, i) => {
      const cell = document.createElement('div');
      cell.className = (view === 'emoji' ? 'emoji-cell' : 'shot-cell') + (i === sel ? ' sel' : '');
      if (view === 'emoji') cell.textContent = it.emoji;
      else {
        const img = document.createElement('img');
        img.src = it.shot.thumb;
        img.draggable = true;
        // Drag the real file into Discord, a browser, a folder...
        img.addEventListener('dragstart', (e) => { e.preventDefault(); api.drag(it.shot.path); });
        cell.appendChild(img);
        const cap = document.createElement('span');
        cap.textContent = timeAgo(it.shot.mtime);
        cell.appendChild(cap);
      }
      cell.title = it.title;
      cell.addEventListener('mousemove', () => { if (hoverOk() && sel !== i) { sel = i; render(); } });
      cell.addEventListener('click', () => activate(it));
      grid.appendChild(cell);
    });
    listEl.appendChild(grid);
    renderFooter(sels[sel]);
    scrollToSel();
    return;
  }

  let index = -1;
  const needIcons = [];
  const needFileIcons = [];
  for (const it of items) {
    if (it.section) {
      const s = document.createElement('div');
      s.className = 'section';
      s.textContent = it.section;
      listEl.appendChild(s);
      continue;
    }
    index++;
    const i = index;
    const row = document.createElement('div');
    row.className = 'item' + (i === sel ? ' sel' : '') + (it.calc ? ' calc' : '') + (confirmId === it.id ? ' confirm' : '');
    row.dataset.index = i;

    const icon = document.createElement('span');
    icon.className = 'icon';
    if (it.appName) {
      if (icons[it.appName]) icon.innerHTML = `<img src="${icons[it.appName]}" alt="">`;
      else {
        icon.classList.add('tile', 'c-gray');
        icon.innerHTML = svg('app');
        if (!(it.appName in icons)) needIcons.push(it.appName);
      }
    } else if (it.clip) {
      if (it.clip.kind === 'image') icon.innerHTML = `<img src="${it.clip.thumb}" alt="">`;
      else { icon.classList.add('tile', 'c-gray'); icon.innerHTML = svg('clipboard'); }
    } else if (it.swatch) {
      icon.classList.add('swatch');
      icon.style.background = it.swatch; // CSSOM is allowed by the CSP, style attributes are not
    } else if (it.procIcon) {
      icon.innerHTML = `<img src="${it.procIcon}" alt="">`;
    } else if (it.fileIcon && fileIcons[it.fileIcon]) {
      icon.innerHTML = `<img src="${fileIcons[it.fileIcon]}" alt="">`;
    } else {
      if (it.fileIcon && !(it.fileIcon in fileIcons)) needFileIcons.push(it.fileIcon);
      icon.classList.add('tile', `c-${it.color || 'gray'}`);
      icon.innerHTML = svg(it.icon || 'app');
    }
    row.appendChild(icon);

    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = it.title;
    row.appendChild(title);

    const sub = document.createElement('span');
    sub.className = 'subtitle';
    sub.textContent = it.sub || '';
    row.appendChild(sub);

    const acc = document.createElement('span');
    acc.className = 'accessory';
    acc.textContent = confirmId === it.id ? 'Enter de novo para confirmar' : it.accessory || it.sub ? (it.accessory || 'Comando') : '';
    row.appendChild(acc);

    row.addEventListener('mousemove', () => { if (hoverOk() && sel !== i) { sel = i; confirmId = null; render(); } });
    row.addEventListener('click', () => activate(it));
    listEl.appendChild(row);
  }
  if (needIcons.length) loadIcons(needIcons);
  if (needFileIcons.length) loadFileIcons(needFileIcons);
  renderFooter(sels[sel]);
  renderPreview(view === 'clipboard' ? sels[sel] : null);
  scrollToSel();
}

function scrollToSel() {
  const el = listEl.querySelector('.sel');
  if (el) el.scrollIntoView({ block: 'nearest' });
}

let iconsPending = false;
async function loadIcons(names) {
  if (iconsPending) return;
  iconsPending = true;
  names.forEach((n) => (icons[n] = icons[n] || ''));
  try {
    const res = await api.icons(names);
    Object.assign(icons, res);
  } finally {
    iconsPending = false;
  }
  render();
}

const fileIcons = {}; // file path -> data URL
let fileIconsPending = false;
async function loadFileIcons(paths) {
  if (fileIconsPending) return;
  fileIconsPending = true;
  paths.forEach((p) => (fileIcons[p] = fileIcons[p] || ''));
  try {
    Object.assign(fileIcons, await api.fileIcons(paths));
  } finally {
    fileIconsPending = false;
  }
  render();
}

// Files and running apps come from the main process; ask once typing pauses.
let searchTimer = null;
let searchSeq = 0;
function requestSearch(q) {
  clearTimeout(searchTimer);
  const term = q.trim();
  const quitting = /^(fechar|close|quit|kill|encerrar)\b/i.test(norm(term));
  if (!quitting && (!config.fileSearch || term.length < 2)) return;
  if (found.query === term && !quitting) return;
  const seq = ++searchSeq;
  searchTimer = setTimeout(async () => {
    const res = await api.search(term, quitting ? 'procs' : 'files');
    if (seq !== searchSeq) return; // a newer search is on its way
    found = { query: term, files: res.files || [], procs: res.procs || [] };
    if (input.value.trim() === term) {
      const keep = sel;
      items = buildRoot(input.value);
      sel = Math.min(keep, Math.max(0, selectable().length - 1));
      render();
    }
  }, quitting ? 0 : 180);
}

const VIEW_NAMES = { clipboard: 'Área de transferência', emoji: 'Emojis e símbolos', screens: 'Prints recentes' };

function renderFooter(it) {
  const hint = $('#hint');
  let label = 'Abrir';
  if (!it) label = '';
  else if (view === 'clipboard' || view === 'emoji' || view === 'screens' || ['paste', 'snippet', 'transform'].includes(it.action?.kind)) label = 'Colar';
  else if (it.action?.kind === 'quit') label = 'Fechar app';
  else if (it.action?.kind === 'timer' || it.action?.kind === 'focus') label = 'Iniciar';
  else if (it.action?.kind === 'copy') label = 'Copiar';
  else if (it.calc) label = 'Copiar resultado';
  else if (it.action?.kind === 'view') label = 'Mostrar';
  else if (it.action?.kind === 'window' || it.action?.kind === 'system') label = 'Executar';
  else if (it.fill) label = 'Usar quicklink';
  let extra = view === 'clipboard' && it ? '<span>Copiar<kbd>Ctrl</kbd><kbd>C</kbd></span><span>Apagar<kbd>Del</kbd></span>' : '';
  if (it && (view === 'screens' || it.file)) extra = '<span>Mostrar na pasta<kbd>Ctrl</kbd><kbd>↵</kbd></span>';
  if (view === 'screens' && it) extra += '<span>Arraste para soltar em outro app</span>';
  hint.innerHTML = `${extra}${label ? `<span><b>${label}</b><kbd>↵</kbd></span>` : ''}<span>${view === 'root' ? 'Fechar' : 'Voltar'}<kbd>Esc</kbd></span>`;
  $('#footerTitle').textContent = view === 'root' ? 'Tandem' : $('#viewTag').textContent;
}

function renderPreview(it) {
  const pane = $('#preview');
  pane.innerHTML = '';
  if (!it || !it.clip) return;
  const h = it.clip;
  if (h.kind === 'image') {
    pane.innerHTML = `<img src="${h.thumb}" alt="">`;
  } else {
    const pre = document.createElement('pre');
    pre.textContent = h.text;
    pane.appendChild(pre);
  }
  const meta = document.createElement('div');
  meta.className = 'meta';
  const rows = h.kind === 'image'
    ? [['Tipo', 'Imagem'], ['Tamanho', `${h.width}×${h.height}`]]
    : [['Tipo', 'Texto'], ['Caracteres', h.text.length.toLocaleString('pt-BR')]];
  rows.push(['Copiado', new Date(h.at).toLocaleString('pt-BR')]);
  for (const [k, v] of rows) meta.insertAdjacentHTML('beforeend', `<span>${k}</span><span>${v}</span>`);
  pane.appendChild(meta);
}

// ---------------------------------------------------------------- actions
function openView(id) {
  view = id;
  input.value = '';
  input.placeholder = { clipboard: 'Buscar no histórico…', emoji: 'Buscar emoji ou símbolo…', screens: 'Buscar prints…' }[id];
  if (id === 'screens') api.screens().then((list) => { screens = list; if (view === 'screens') refresh(); });
  refresh();
}

function back() {
  if (view !== 'root') {
    view = 'root';
    input.value = '';
    input.placeholder = 'Busque apps e comandos…';
    refresh();
  } else if (input.value) {
    input.value = '';
    refresh();
  } else {
    api.run({ kind: 'hide' });
  }
}

function activate(it) {
  if (!it) return;
  if (it.fill) {
    input.value = it.fill;
    refresh();
    return;
  }
  const action = it.action;
  if (!action) return;
  if (it.confirm && confirmId !== it.id) {
    confirmId = it.id;
    render();
    return;
  }
  if (action.kind === 'view') {
    remember(it.id);
    openView(action.id);
    return;
  }
  if (it.id && (it.id.startsWith('app:') || it.id.startsWith('cmd:') || it.id.startsWith('win:') || it.id.startsWith('sys:') || it.id.startsWith('media:'))) remember(it.id);
  api.run(action);
}

input.addEventListener('input', () => refresh());

window.addEventListener('keydown', (e) => {
  const sels = selectable();
  const grid = view === 'emoji' || view === 'screens';
  const cols = view === 'emoji' ? 8 : view === 'screens' ? 4 : 1;
  if (e.key === 'Enter' && e.ctrlKey && sels[sel]) {
    e.preventDefault();
    const path = sels[sel].shot?.path || sels[sel].file?.path;
    if (path) api.run({ kind: 'reveal', path });
    return;
  }
  if (e.key === 'ArrowDown' || (grid && e.key === 'ArrowRight' && input.selectionStart === input.value.length)) {
    e.preventDefault();
    sel = Math.min(sels.length - 1, sel + (e.key === 'ArrowDown' ? cols : 1));
    confirmId = null;
    render();
  } else if (e.key === 'ArrowUp' || (grid && e.key === 'ArrowLeft' && input.selectionStart === 0 && sel > 0)) {
    e.preventDefault();
    sel = Math.max(0, sel - (e.key === 'ArrowUp' ? cols : 1));
    confirmId = null;
    render();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    activate(sels[sel]);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    back();
  } else if (e.key === 'Backspace' && !input.value && view !== 'root') {
    e.preventDefault();
    back();
  } else if (view === 'clipboard' && sels[sel] && e.key === 'Delete') {
    e.preventDefault();
    api.run({ kind: 'deleteHistory', id: sels[sel].clip.id });
  } else if (view === 'clipboard' && sels[sel] && e.ctrlKey && e.key.toLowerCase() === 'c' && !window.getSelection().toString()) {
    e.preventDefault();
    const h = sels[sel].clip;
    if (h.kind === 'text') api.run({ kind: 'copy', text: h.text });
  }
});

$('#backBtn').addEventListener('click', back);

// ---------------------------------------------------------------- wiring
api.onOpen(() => {
  mouse = { x: -1, y: -1, armed: false };
  view = 'root';
  input.value = '';
  input.placeholder = 'Busque apps e comandos…';
  found = { query: '', files: [], procs: [] };
  api.clipboardText().then((t) => { clipText = t || ''; });
  refresh();
  input.focus();
});
api.onApps((list) => { apps = list; refresh(true); });
api.onHistory((list) => { history = list; if (view === 'clipboard') refresh(true); });
api.onSettings((s) => { config = s; refresh(true); });

api.init().then((data) => {
  apps = data.apps;
  history = data.history;
  config = data.settings;
  refresh();
  input.focus();
});
