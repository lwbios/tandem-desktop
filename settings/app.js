const api = window.tandem;
const $ = (sel, root = document) => root.querySelector(sel);

// ---------------------------------------------------------------- icons
const ICONS = {
  gear: 'M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1L15 3.5h-4L10.7 6a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.7 1.7 1l.3 2.5h4l.3-2.5c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.4ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z',
  palette: 'M12 3a9 9 0 0 0 0 18c1 0 1.7-.8 1.7-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7h2A4.6 4.6 0 0 0 21 10.6C21 6.4 17 3 12 3Zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
  keyboard: 'M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2ZM11 8h2v2h-2V8Zm0 3h2v2h-2v-2ZM8 8h2v2H8V8Zm0 3h2v2H8v-2Zm-1 2H5v-2h2v2Zm0-3H5V8h2v2Zm9 6H8v-2h8v2Zm0-3h-2v-2h2v2Zm0-3h-2V8h2v2Zm3 3h-2v-2h2v2Zm0-3h-2V8h2v2Z',
  wrench: 'M22.7 19 13.6 9.9c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4Z',
  info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z',
  music: 'M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z',
  volume: 'M3 9v6h4l5 5V4L7 9H3Zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4ZM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6Z',
  timer: 'M9 1h6v2H9V1Zm10 6.4 1.4-1.4L19 4.6 17.6 6A9 9 0 1 0 19 7.4ZM13 14h-2V8h2v6Z',
  mic: 'M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2Z',
  camera: 'M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4Z',
  rec: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0-5a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z',
  headphones: 'M12 3a9 9 0 0 0-9 9v6a3 3 0 0 0 3 3h1a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H5v-1a7 7 0 0 1 14 0v1h-2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1a3 3 0 0 0 3-3v-6a9 9 0 0 0-9-9Z',
  battery: 'M16 4h-2V2h-4v2H8a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1Zm-5 15v-4.5H9L13 8v4.5h2L11 19Z',
};

const ARROW = '<svg viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9"/></svg>';
const svg = (name) => `<svg viewBox="0 0 24 24"><path d="${ICONS[name]}"/></svg>`;

// Icon colours live in style.css as .c-<name> classes (inline styles are blocked by the CSP).

// ---------------------------------------------------------------- pages
// Row types: toggle, segmented, slider, shortcut, presets, button, link, info.
const PAGES = {
  general: {
    nav: 'Geral', icon: 'gear', color: 'gray',
    subtitle: 'Como o Tandem se comporta no Windows',
    sections: [
      {
        title: 'Inicialização',
        rows: [
          { type: 'toggle', key: '$launchAtLogin', title: 'Iniciar com o Windows', desc: 'Abre o Tandem quando você entra na sua conta.' },
        ],
      },
      {
        title: 'Comportamento',
        rows: [
          { type: 'toggle', key: 'hideInFullscreen', title: 'Esconder em tela cheia', desc: 'A ilha some em jogos e apps em tela cheia no monitor principal.' },
        ],
      },
    ],
  },
  appearance: {
    nav: 'Aparência', icon: 'palette', color: 'purple',
    subtitle: 'Tamanho, posição e movimento da ilha',
    sections: [
      {
        title: 'Ilha',
        rows: [
          {
            type: 'segmented', key: 'appearance.scale', title: 'Tamanho', desc: 'Escala da pílula e de tudo dentro dela.',
            options: [[0.9, 'Pequeno'], [1, 'Normal'], [1.15, 'Grande']],
          },
          { type: 'slider', key: 'appearance.topOffset', title: 'Distância do topo', desc: 'Espaço entre a borda da tela e a ilha.', min: 0, max: 24, step: 1, unit: 'px' },
          { type: 'toggle', key: 'appearance.reduceMotion', title: 'Reduzir animações', desc: 'Troca o efeito elástico por transições simples.' },
        ],
      },
    ],
  },
  shortcuts: {
    nav: 'Atalhos', icon: 'keyboard', color: 'blue',
    subtitle: 'Atalhos de teclado que funcionam em qualquer app',
    sections: [
      {
        title: 'Atalhos globais',
        rows: [
          { type: 'shortcut', key: 'shortcuts.toggleIsland', title: 'Mostrar/ocultar a ilha' },
          { type: 'shortcut', key: 'shortcuts.openSettings', title: 'Abrir as configurações' },
          { type: 'shortcut', key: 'shortcuts.toggleMic', title: 'Mutar/desmutar o microfone' },
          { type: 'shortcut', key: 'shortcuts.playPause', title: 'Tocar/pausar a música' },
        ],
        note: 'Clique no atalho e pressione a nova combinação. Esc cancela, Backspace remove.',
      },
    ],
  },
  advanced: {
    nav: 'Avançado', icon: 'wrench', color: 'slate',
    subtitle: 'Ferramentas e manutenção',
    sections: [
      {
        title: 'Ilha',
        rows: [
          { type: 'button', action: 'reloadIsland', title: 'Recarregar a ilha', desc: 'Útil se ela travar em algum estado.', label: 'Recarregar' },
        ],
      },
      {
        title: 'Dados',
        rows: [
          { type: 'info', value: '$settingsFile', title: 'Arquivo de configurações' },
          { type: 'link', action: 'openSettingsFolder', title: 'Abrir pasta de configurações' },
          { type: 'link', action: 'reset', title: 'Restaurar padrões', danger: true, confirm: 'Restaurar todas as configurações para o padrão?' },
        ],
      },
    ],
  },
  about: {
    nav: 'Sobre', icon: 'info', color: 'gray', heroImage: '../assets/icon.png',
    heroTitle: 'Tandem', subtitle: '$versionLine',
    sections: [
      {
        title: 'Projeto',
        rows: [
          { type: 'info', title: 'Versão', value: '$version' },
          { type: 'info', title: 'Electron', value: '$electron' },
          { type: 'link', action: 'openRepo', title: 'Código no GitHub', desc: 'github.com/lwbios/tandem-desktop' },
        ],
      },
    ],
  },

  // ----- modules -----
  media: {
    nav: 'Tocando agora', icon: 'music', color: 'pink', module: 'media',
    subtitle: 'Capa, título e controles de qualquer app que toque mídia',
    sections: [
      {
        title: 'Opções',
        rows: [
          { type: 'toggle', key: 'media.showArt', title: 'Mostrar capa do álbum', desc: 'Quando desligado, mostra um ícone de nota no lugar.' },
        ],
      },
    ],
  },
  volume: {
    nav: 'Volume', icon: 'volume', color: 'blue', module: 'volume',
    subtitle: 'Aviso na ilha quando o volume do Windows muda',
    sections: [
      {
        title: 'Opções',
        rows: [
          { type: 'toggle', key: 'volume.scroll', title: 'Rolar sobre a ilha muda o volume', desc: 'Com o mouse em cima da ilha, a rodinha sobe e desce o volume.' },
          { type: 'segmented', key: 'volume.step', title: 'Passo da rodinha', options: [[1, '1%'], [2, '2%'], [5, '5%']], requires: 'volume.scroll' },
        ],
      },
    ],
  },
  timer: {
    nav: 'Timer', icon: 'timer', color: 'orange', module: 'timer',
    subtitle: 'Contagem regressiva com alarme',
    sections: [
      {
        title: 'Opções',
        rows: [
          { type: 'presets', key: 'timer.presets', title: 'Tempos rápidos', desc: 'Aparecem na ilha aberta e no clique direito.' },
          { type: 'toggle', key: 'timer.sound', title: 'Tocar som no fim', desc: 'Um toque curto quando o tempo acaba.' },
        ],
      },
    ],
  },
  mic: {
    nav: 'Microfone e chamadas', icon: 'mic', color: 'amber', module: 'mic',
    subtitle: 'Bolinha amarela, medidor de voz e mudo do microfone',
    sections: [
      {
        title: 'Opções',
        rows: [
          { type: 'toggle', key: 'mic.discord', title: 'Mostrar servidor do Discord', desc: 'Usa o título da janela do Discord para mostrar servidor e canal.' },
        ],
      },
    ],
  },
  camera: {
    nav: 'Câmera', icon: 'camera', color: 'green', module: 'camera',
    subtitle: 'Bolinha verde enquanto algum app usa a câmera',
    sections: [],
  },
  obs: {
    nav: 'Gravação no OBS', icon: 'rec', color: 'red', module: 'obs',
    subtitle: 'REC e AO VIVO com o tempo decorrido',
    sections: [
      {
        title: 'Detalhes',
        rows: [
          { type: 'info', title: 'Pasta de logs do OBS', value: '$obsLogs' },
        ],
        note: 'Não precisa ativar o WebSocket do OBS: o Tandem lê o log que o próprio OBS escreve.',
      },
    ],
  },
  output: {
    nav: 'Saída de áudio', icon: 'headphones', color: 'teal', module: 'output',
    subtitle: 'Aviso ao trocar de fone ou caixa de som',
    sections: [
      {
        title: 'Opções',
        rows: [
          { type: 'toggle', key: 'output.battery', title: 'Mostrar bateria de fones Bluetooth', desc: 'Só aparece em fones que informam a bateria ao Windows.' },
        ],
        note: 'Para trocar a saída, clique com o botão direito na ilha.',
      },
    ],
  },
  battery: {
    nav: 'Bateria', icon: 'battery', color: 'lime', module: 'battery',
    subtitle: 'Aviso de “Carregando” ao ligar o carregador',
    sections: [],
  },
};

const NAV = [
  ['general', 'appearance', 'shortcuts', 'advanced', 'about'],
  ['media', 'volume', 'timer', 'mic', 'camera', 'obs', 'output', 'battery'],
];

// ---------------------------------------------------------------- state
let settings = null;
let info = {};
let current = 'general';
const history = { back: [], forward: [] };

const getPath = (obj, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

function value(key) {
  if (key.startsWith('$')) return info[key.slice(1)];
  return getPath(settings, key);
}

function text(str) {
  if (typeof str !== 'string') return str;
  return str.startsWith('$') ? String(info[str.slice(1)] ?? '') : str;
}

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let toastTimer = null;
function toast(msg, error = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('error', error);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

async function update(key, val) {
  try {
    const res = await api.set(key, val);
    settings = res.settings;
    info = res.info;
    renderNav();
    renderPage();
  } catch (err) {
    toast('Não foi possível salvar.', true);
  }
}

// ---------------------------------------------------------------- nav
function renderNav() {
  const nav = $('#nav');
  nav.innerHTML = '';
  NAV.forEach((group, gi) => {
    if (gi === 1) {
      const label = document.createElement('div');
      label.className = 'nav-label';
      label.textContent = 'Módulos';
      nav.appendChild(label);
    }
    for (const id of group) {
      if (id === 'about') continue; // reached through the card at the top
      const page = PAGES[id];
      const btn = document.createElement('button');
      btn.className = 'nav-item' + (id === current ? ' active' : '');
      const off = page.module && !settings.modules[page.module];
      btn.innerHTML = `<span class="icon c-${page.color}">${svg(page.icon)}</span>
        <span class="label">${escapeHtml(page.nav)}</span>${off ? '<span class="off">Desligado</span>' : ''}`;
      btn.addEventListener('click', () => go(id));
      nav.appendChild(btn);
    }
  });
  $('.profile').classList.toggle('active', current === 'about');
  $('#profileVersion').textContent = `Versão ${info.version || ''}`;
}

function go(id, fromHistory = false) {
  if (id === current) return;
  if (!fromHistory) {
    history.back.push(current);
    history.forward = [];
  }
  current = id;
  renderNav();
  renderPage();
  $('.scroll').scrollTop = 0;
}

$('#back').addEventListener('click', () => {
  if (!history.back.length) return;
  history.forward.push(current);
  go(history.back.pop(), true);
});
$('#forward').addEventListener('click', () => {
  if (!history.forward.length) return;
  history.back.push(current);
  go(history.forward.pop(), true);
});
$('.profile').addEventListener('click', () => go('about'));
document.querySelectorAll('[data-window]').forEach((b) => b.addEventListener('click', () => api.window(b.dataset.window)));

// ---------------------------------------------------------------- page
function renderPage() {
  const page = PAGES[current];
  const root = $('#page');
  root.innerHTML = '';
  $('#back').disabled = !history.back.length;
  $('#forward').disabled = !history.forward.length;

  const hero = document.createElement('div');
  hero.className = 'hero';
  hero.innerHTML = page.heroImage
    ? `<img class="big" src="${page.heroImage}" alt="">`
    : `<div class="big c-${page.color}">${svg(page.icon)}</div>`;
  hero.innerHTML += `<h1>${escapeHtml(page.heroTitle || page.nav)}</h1><p>${escapeHtml(text(page.subtitle))}</p>`;
  root.appendChild(hero);

  const sections = [...page.sections];
  if (page.module) {
    sections.unshift({
      title: 'Módulo',
      rows: [{
        type: 'toggle', key: `modules.${page.module}`, title: 'Ativado',
        desc: settings.modules[page.module] ? 'Aparece na ilha quando acontece.' : 'Desligado: a ilha ignora este módulo.',
      }],
    });
  }

  for (const section of sections) {
    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = section.title;
    root.appendChild(title);

    const card = document.createElement('div');
    card.className = 'card';
    const moduleOff = page.module && !settings.modules[page.module];
    for (const row of section.rows) {
      const el = renderRow(row);
      const locked = (moduleOff && row.key !== `modules.${page.module}`) || (row.requires && !value(row.requires));
      if (locked) el.classList.add('disabled');
      card.appendChild(el);
    }
    root.appendChild(card);

    if (section.note) {
      const note = document.createElement('p');
      note.className = 'footnote';
      note.textContent = section.note;
      root.appendChild(note);
    }
  }
}

function rowShell(row) {
  const el = document.createElement('div');
  el.className = 'row';
  el.innerHTML = `<div class="text"><div class="title">${escapeHtml(row.title)}</div>${
    row.desc ? `<div class="desc">${escapeHtml(text(row.desc))}</div>` : ''}</div>`;
  return el;
}

function renderRow(row) {
  const el = rowShell(row);
  switch (row.type) {
    case 'toggle': {
      const sw = document.createElement('button');
      sw.className = 'switch' + (value(row.key) ? ' on' : '');
      sw.setAttribute('role', 'switch');
      sw.setAttribute('aria-checked', String(!!value(row.key)));
      sw.addEventListener('click', () => update(row.key, !value(row.key)));
      el.appendChild(sw);
      break;
    }
    case 'segmented': {
      const seg = document.createElement('div');
      seg.className = 'segmented';
      for (const [val, label] of row.options) {
        const b = document.createElement('button');
        b.textContent = label;
        if (value(row.key) === val) b.className = 'on';
        b.addEventListener('click', () => update(row.key, val));
        seg.appendChild(b);
      }
      el.appendChild(seg);
      break;
    }
    case 'slider': {
      const wrap = document.createElement('div');
      wrap.className = 'slider';
      wrap.innerHTML = `<input type="range" min="${row.min}" max="${row.max}" step="${row.step}" value="${value(row.key)}"><output>${value(row.key)}${row.unit}</output>`;
      const input = $('input', wrap);
      input.addEventListener('input', () => ($('output', wrap).textContent = input.value + row.unit));
      input.addEventListener('change', () => update(row.key, Number(input.value)));
      el.appendChild(wrap);
      break;
    }
    case 'shortcut':
      el.appendChild(shortcutControl(row));
      break;
    case 'presets':
      el.appendChild(presetsControl(row));
      break;
    case 'button': {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = row.label;
      b.addEventListener('click', () => runAction(row));
      el.appendChild(b);
      break;
    }
    case 'link': {
      el.classList.add('clickable');
      if (row.danger) el.classList.add('danger');
      if (!row.danger) el.insertAdjacentHTML('beforeend', `<span class="arrow">${ARROW}</span>`);
      el.addEventListener('click', () => runAction(row));
      break;
    }
    case 'info': {
      const v = document.createElement('span');
      v.className = 'value';
      v.textContent = text(row.value);
      v.title = v.textContent;
      el.appendChild(v);
      break;
    }
  }
  return el;
}

async function runAction(row) {
  if (row.confirm && !window.confirm(row.confirm)) return;
  const res = await api.action(row.action);
  if (res && res.settings) {
    settings = res.settings;
    info = res.info;
    renderNav();
    renderPage();
  }
  if (res && res.message) toast(res.message);
}

// ---------------------------------------------------------------- shortcuts
const KEY_NAMES = { Control: 'Ctrl', Alt: 'Alt', Shift: 'Shift', Super: 'Win', Return: 'Enter', Space: 'Espaço' };
const keysHtml = (accel) => accel.split('+').map((k) => `<kbd>${escapeHtml(KEY_NAMES[k] || k)}</kbd>`).join('');

const CODE_KEYS = {
  Space: 'Space', Enter: 'Return', Tab: 'Tab', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown', Insert: 'Insert',
  Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']',
  Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`',
};

function acceleratorFrom(e) {
  let key = null;
  if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3);
  else if (/^Digit\d$/.test(e.code)) key = e.code.slice(5);
  else if (/^Numpad\d$/.test(e.code)) key = 'num' + e.code.slice(6);
  else if (/^F\d{1,2}$/.test(e.code)) key = e.code;
  else if (CODE_KEYS[e.code]) key = CODE_KEYS[e.code];
  if (!key) return null; // a modifier on its own, keep waiting
  const mods = [];
  if (e.ctrlKey) mods.push('Control');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (e.metaKey) mods.push('Super');
  if (!mods.length && !/^F\d+$/.test(key)) return { error: 'Use pelo menos Ctrl, Alt ou Shift junto da tecla.' };
  return { accel: [...mods, key].join('+') };
}

let recording = null; // { button, row, onKey }

function stopRecording() {
  if (!recording) return;
  window.removeEventListener('keydown', recording.onKey, true);
  recording = null;
  api.pauseShortcuts(false);
  renderPage();
}

function shortcutControl(row) {
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.alignItems = 'center';
  wrap.style.gap = '4px';

  const btn = document.createElement('button');
  btn.className = 'shortcut';
  const accel = value(row.key);
  btn.innerHTML = accel ? keysHtml(accel) : 'Gravar atalho';
  btn.addEventListener('click', () => {
    if (recording) stopRecording();
    btn.classList.add('recording');
    btn.textContent = 'Pressione as teclas…';
    api.pauseShortcuts(true);
    const onKey = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const noMods = !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey;
      if (e.code === 'Escape' && noMods) return stopRecording();
      if ((e.code === 'Backspace' || e.code === 'Delete') && noMods) {
        await api.setShortcut(row.key.split('.')[1], '');
        settings.shortcuts[row.key.split('.')[1]] = '';
        return stopRecording();
      }
      const result = acceleratorFrom(e);
      if (!result) return;
      if (result.error) return toast(result.error, true);
      const res = await api.setShortcut(row.key.split('.')[1], result.accel);
      if (!res.ok) {
        toast(res.error, true);
        return;
      }
      settings = res.settings;
      stopRecording();
      toast('Atalho salvo');
    };
    recording = { btn, row, onKey };
    window.addEventListener('keydown', onKey, true);
  });
  wrap.appendChild(btn);

  if (accel) {
    const clear = document.createElement('button');
    clear.className = 'clear-shortcut';
    clear.title = 'Remover atalho';
    clear.textContent = '✕';
    clear.addEventListener('click', async () => {
      const res = await api.setShortcut(row.key.split('.')[1], '');
      settings = res.settings;
      renderPage();
    });
    wrap.appendChild(clear);
  }
  return wrap;
}

// ---------------------------------------------------------------- timer presets
const presetLabel = (m) => (m >= 60 && m % 60 === 0 ? `${m / 60} h` : `${m} min`);

function presetsControl(row) {
  const wrap = document.createElement('div');
  wrap.className = 'presets';
  const list = [...value(row.key)];
  list.forEach((m, i) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML = `${presetLabel(m)}<button title="Remover">✕</button>`;
    $('button', chip).addEventListener('click', () => {
      if (list.length <= 1) return toast('Deixe pelo menos um tempo.', true);
      update(row.key, list.filter((_, j) => j !== i));
    });
    wrap.appendChild(chip);
  });
  if (list.length < 6) {
    const input = document.createElement('input');
    input.className = 'preset-add';
    input.placeholder = '+ min';
    input.inputMode = 'numeric';
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const m = Math.round(Number(input.value));
      if (!m || m < 1 || m > 600) return toast('Digite minutos entre 1 e 600.', true);
      if (list.includes(m)) return toast('Esse tempo já existe.', true);
      update(row.key, [...list, m].sort((a, b) => a - b));
    });
    wrap.appendChild(input);
  }
  return wrap;
}

// ---------------------------------------------------------------- start
api.onChange((s, i) => {
  settings = s;
  if (i) info = i;
  if (!recording) {
    renderNav();
    renderPage();
  }
});

api.onNavigate((id) => PAGES[id] && go(id));

api.get().then((res) => {
  settings = res.settings;
  info = res.info;
  renderNav();
  renderPage();
});
