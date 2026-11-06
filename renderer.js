const api = window.island;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const islandEl = $('#island');
const layers = {
  compactMedia: $('#compactMedia'),
  compactTimer: $('#compactTimer'),
  compactAlarm: $('#compactAlarm'),
  compactVolume: $('#compactVolume'),
  compactCharging: $('#compactCharging'),
  compactCall: $('#compactCall'),
  expandedCall: $('#expandedCall'),
  expandedMedia: $('#expandedMedia'),
  expandedIdle: $('#expandedIdle'),
  expandedTimer: $('#expandedTimer'),
  expandedVolume: $('#expandedVolume'),
};

const VOLUME_OSD_MS = 1600;
const MIC_FLASH_MS = 1800;

const state = {
  hovering: false,
  media: null,          // last media payload
  mediaAt: 0,           // performance.now() when payload arrived
  chargingToastUntil: 0,
  battery: null,
  volume: null,         // { level: 0..1, muted }
  volumeUntil: 0,
  timer: null,          // { endAt, remaining, paused }
  alarm: false,
  mic: { active: false, muted: false, apps: [], level: 0 },
  micFlashUntil: 0,     // briefly show the call pill when mute flips
};

// ---------- view ----------
function hasMedia() {
  return !!(state.media && state.media.active);
}

function render() {
  const now = performance.now();
  const media = hasMedia();
  const volumeOn = now < state.volumeUntil;
  const toast = now < state.chargingToastUntil;
  const timer = !!state.timer;
  const call = state.mic.active;
  const micFlash = call && now < state.micFlashUntil;

  let mode = 'idle';
  if (state.hovering) mode = 'expanded';
  else if (state.alarm) mode = 'alarm';
  else if (volumeOn) mode = 'volume';
  else if (toast) mode = 'charging';
  else if (micFlash) mode = 'call';
  else if (media) mode = 'media';
  else if (call) mode = 'call';
  else if (timer) mode = 'timer';

  // Which big view sits under the cursor; the volume overlay keeps its size.
  let expandedView = null;
  if (mode === 'expanded') {
    if (media) expandedView = 'media';
    else if (call) expandedView = 'call';
    else if (timer) expandedView = 'timer';
    else expandedView = 'idle';
  }

  islandEl.className = mode;
  if (expandedView === 'idle') islandEl.classList.add('nomedia');
  if (expandedView === 'timer') islandEl.classList.add('timerview');
  if (expandedView === 'call') islandEl.classList.add('callview');
  islandEl.classList.toggle('mic-on', call);
  islandEl.classList.toggle('mic-muted', call && state.mic.muted);
  islandEl.classList.toggle('has-avatar', !!micAvatar());
  islandEl.classList.toggle('playing', media && state.media.playing);
  islandEl.classList.toggle('has-timer', timer);
  islandEl.classList.toggle('timer-running', timer && !state.timer.paused);
  islandEl.classList.toggle('timer-paused', timer && state.timer.paused);
  paintVolumeClasses();

  const overlayVolume = mode === 'expanded' && volumeOn;
  layers.compactMedia.classList.toggle('on', mode === 'media');
  layers.compactTimer.classList.toggle('on', mode === 'timer');
  layers.compactAlarm.classList.toggle('on', mode === 'alarm');
  layers.compactVolume.classList.toggle('on', mode === 'volume');
  layers.compactCharging.classList.toggle('on', mode === 'charging');
  layers.compactCall.classList.toggle('on', mode === 'call');
  layers.expandedCall.classList.toggle('on', !overlayVolume && expandedView === 'call');
  layers.expandedVolume.classList.toggle('on', overlayVolume);
  layers.expandedMedia.classList.toggle('on', !overlayVolume && expandedView === 'media');
  layers.expandedTimer.classList.toggle('on', !overlayVolume && expandedView === 'timer');
  layers.expandedIdle.classList.toggle('on', !overlayVolume && expandedView === 'idle');

  // Re-render when the next temporary state (toast, OSD) runs out.
  const deadlines = [state.volumeUntil, state.chargingToastUntil, state.micFlashUntil].filter((t) => t > now);
  clearTimeout(renderTimer);
  if (deadlines.length) renderTimer = setTimeout(render, Math.min(...deadlines) - now + 30);
}
let renderTimer = null;

function bump() {
  islandEl.classList.add('bump');
  setTimeout(() => islandEl.classList.remove('bump'), 180);
}

// ---------- hover / click-through ----------
let leaveTimer = null;
islandEl.addEventListener('mouseenter', () => {
  clearTimeout(leaveTimer);
  api.setInteractive(true);
  state.hovering = true;
  if (state.alarm) dismissAlarm();
  render();
});
function onLeave() {
  api.setInteractive(false);
  clearTimeout(leaveTimer);
  leaveTimer = setTimeout(() => {
    state.hovering = false;
    render();
  }, 250);
}
islandEl.addEventListener('mouseleave', onLeave);
api.onMouseLeft(() => {
  if (state.hovering) onLeave();
});
islandEl.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  api.contextMenu({ timerActive: !!state.timer, micMuted: state.mic.muted });
});

// ---------- media ----------
const fmt = (s) => {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

function setArt(src) {
  $$('.art').forEach((img) => {
    if (src) img.src = src;
    else img.removeAttribute('src');
  });
}

api.onMedia((data) => {
  const prev = state.media;
  const changedTrack = !prev || prev.key !== data.key;
  const startedPlaying = data.active && (!prev || !prev.active);

  state.media = data;
  state.mediaAt = performance.now();

  if ('art' in data) setArt(data.art);
  if (data.active) {
    $('.title').textContent = data.title || 'Desconhecido';
    $('.artist').textContent = data.artist || friendlyApp(data.app);
  }
  if (!state.hovering && (startedPlaying || (changedTrack && data.active))) bump();
  render();
});

function friendlyApp(id = '') {
  const s = id.toLowerCase();
  if (s.includes('spotify')) return 'Spotify';
  if (s.includes('chrome')) return 'Chrome';
  if (s.includes('msedge')) return 'Edge';
  if (s.includes('firefox')) return 'Firefox';
  return id.split(/[\\!.]/).filter(Boolean).pop() || '';
}

$$('.controls button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const cmd = btn.dataset.cmd;
    api.media(cmd);
    if (cmd === 'toggle' && state.media) {
      // optimistic flip, the next poll will confirm
      state.media.position = currentPosition();
      state.media.playing = !state.media.playing;
      state.mediaAt = performance.now();
      render();
    }
  });
});

function currentPosition() {
  const m = state.media;
  if (!m || !m.duration) return 0;
  let pos = m.position;
  if (m.playing) pos += (performance.now() - state.mediaAt) / 1000;
  return Math.min(pos, m.duration);
}

function tickProgress() {
  const m = state.media;
  if (m && m.active && m.duration) {
    const pos = currentPosition();
    $('.fill').style.width = `${(pos / m.duration) * 100}%`;
    $('.time.cur').textContent = fmt(pos);
    $('.time.end').textContent = '-' + fmt(m.duration - pos);
  } else {
    $('.fill').style.width = '0';
    $('.time.cur').textContent = '';
    $('.time.end').textContent = '';
  }
  requestAnimationFrame(tickProgress);
}
requestAnimationFrame(tickProgress);

// ---------- volume ----------
function paintVolumeClasses() {
  const v = state.volume;
  if (!v) return;
  islandEl.classList.toggle('vol-muted', v.muted);
  islandEl.classList.toggle('vol-zero', !v.muted && v.level === 0);
  islandEl.classList.toggle('vol-low', !v.muted && v.level > 0 && v.level < 0.5);
}

function paintVolume() {
  const v = state.volume;
  if (!v) return;
  const pct = Math.round(v.level * 100);
  $$('.vol-fill').forEach((el) => (el.style.width = `${v.muted ? 0 : pct}%`));
  $('.vol-pct').textContent = v.muted ? 'Mudo' : `${pct}%`;
  paintVolumeClasses();
}

function showVolume() {
  paintVolume();
  state.volumeUntil = performance.now() + VOLUME_OSD_MS;
  render();
}

api.onVolume((data) => {
  // Ignore echoes of our own scroll changes so the bar doesn't jitter.
  if (performance.now() - lastScrollAt < 400 && !data.initial && data.muted === state.volume?.muted) return;
  state.volume = { level: data.level, muted: data.muted };
  if (data.initial) paintVolume();
  else showVolume();
});

let lastScrollAt = 0;
islandEl.addEventListener('wheel', (e) => {
  if (!state.volume) return;
  e.preventDefault();
  const step = e.deltaY < 0 ? 0.02 : -0.02;
  const level = Math.round(Math.min(1, Math.max(0, state.volume.level + step)) * 100) / 100;
  state.volume = { level, muted: level === 0 ? state.volume.muted : false };
  lastScrollAt = performance.now();
  api.media(`vol ${level}`);
  showVolume();
}, { passive: false });

// ---------- microphone ----------
const APP_NAMES = {
  msedge: 'Edge', chrome: 'Chrome', firefox: 'Firefox', brave: 'Brave', opera: 'Opera',
  discord: 'Discord', whatsappdesktop: 'WhatsApp', whatsapp: 'WhatsApp', teams: 'Teams',
  'ms-teams': 'Teams', zoom: 'Zoom', slack: 'Slack', obs64: 'OBS', telegram: 'Telegram',
  skype: 'Skype', windowssoundrecorder: 'Gravador de Som',
};
const prettyApp = (n) => APP_NAMES[n.toLowerCase()] || n.charAt(0).toUpperCase() + n.slice(1);

// "Minecraft Brasil" -> "MB", the way Discord draws servers without an icon.
const initials = (name) =>
  name.split(/\s+/).filter(Boolean).map((w) => [...w][0]).join('').slice(0, 3) || '?';

function discordServer() {
  const m = state.mic;
  return m.active && m.discord && m.apps.includes('Discord') ? m.discord : null;
}

// Icons taken from each app's .exe by the main process, keyed by process name.
const appIcons = {};
api.onAppIcon(({ name, dataUrl }) => {
  appIcons[name] = dataUrl;
  paintMic();
  render();
});

// What the round-cornered avatar shows: the app's own icon, else server initials.
function micAvatar() {
  const m = state.mic;
  if (!m.active) return null;
  const server = discordServer();
  const app = server ? 'Discord' : m.apps[0];
  if (app && appIcons[app]) return { icon: appIcons[app] };
  if (server) return { text: initials(server.server) };
  return null;
}

let avatarKey = '';
function paintAvatar() {
  const a = micAvatar();
  const key = a ? a.icon || `t:${a.text}` : '';
  if (key === avatarKey) return;
  avatarKey = key;
  $$('.server-avatar').forEach((el) => {
    el.classList.toggle('icon', !!(a && a.icon));
    el.style.backgroundImage = a && a.icon ? `url("${a.icon}")` : '';
    el.textContent = a && a.text ? a.text : '';
  });
}

function paintMic() {
  const m = state.mic;
  const server = discordServer();
  const names = m.apps.map(prettyApp);
  let label = names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0] || 'Microfone';
  let detail = 'Microfone ativo';
  if (server) {
    label = server.server;
    detail = server.dm ? 'Chamada no Discord' : server.channel;
  }
  paintAvatar();
  $$('.call-app').forEach((el) => (el.textContent = label));
  $('.call-status').textContent = m.muted ? 'Microfone mudo' : detail;
  // Speech peaks are small, so stretch the low end before drawing the bars.
  const lvl = m.muted ? 0 : Math.min(1, Math.sqrt(m.level) * 1.6);
  const shape = [0.55, 0.85, 1, 0.75, 0.5];
  $$('.mic-meter').forEach((meter) => {
    const max = meter.classList.contains('big') ? 30 : 16;
    [...meter.children].forEach((bar, i) => {
      const h = Math.max(3, lvl * shape[i] * max * (0.8 + Math.random() * 0.4));
      bar.style.height = `${Math.min(max, h)}px`;
    });
  });
}

api.onMic((data) => {
  const prev = state.mic;
  const started = data.active && !prev.active;
  const muteFlipped = data.active && prev.active && data.muted !== prev.muted;
  state.mic = {
    active: data.active,
    muted: data.muted,
    apps: data.apps || [],
    level: data.level || 0,
    discord: data.discord || null,
  };
  const serverChanged = (prev.discord && prev.discord.server) !== (data.discord && data.discord.server);
  paintMic();
  if (serverChanged) render();
  if (started || muteFlipped) {
    state.micFlashUntil = performance.now() + MIC_FLASH_MS;
    if (!state.hovering) bump();
  }
  if (data.active !== prev.active || data.muted !== prev.muted) render();
});

function toggleMicMute() {
  api.media('micmute');
  // optimistic; the watcher confirms within 250 ms
  state.mic.muted = !state.mic.muted;
  paintMic();
  render();
}
$('#micIndicator').addEventListener('click', toggleMicMute);
$('.mic-btn').addEventListener('click', toggleMicMute);

// ---------- timer ----------
function timerRemaining() {
  const t = state.timer;
  if (!t) return 0;
  return t.paused ? t.remaining : Math.max(0, t.endAt - Date.now());
}

function startTimer(minutes) {
  state.timer = { endAt: Date.now() + minutes * 60000, remaining: 0, paused: false };
  state.alarm = false;
  paintTimer();
  bump();
  render();
}

function togglePauseTimer() {
  const t = state.timer;
  if (!t) return;
  if (t.paused) {
    t.endAt = Date.now() + t.remaining;
    t.paused = false;
  } else {
    t.remaining = timerRemaining();
    t.paused = true;
  }
  render();
}

function cancelTimer() {
  state.timer = null;
  render();
}

function paintTimer() {
  const text = fmt(Math.ceil(timerRemaining() / 1000));
  $$('.timer-text').forEach((el) => (el.textContent = text));
}

let alarmTimeout = null;
function finishTimer() {
  state.timer = null;
  state.alarm = true;
  playAlarm();
  render();
  clearTimeout(alarmTimeout);
  alarmTimeout = setTimeout(dismissAlarm, 12000);
}

function dismissAlarm() {
  state.alarm = false;
  clearTimeout(alarmTimeout);
  stopAlarm();
  render();
}

setInterval(() => {
  if (!state.timer) return;
  paintTimer();
  if (!state.timer.paused && timerRemaining() <= 0) finishTimer();
}, 200);

$$('.chips button').forEach((btn) => {
  btn.addEventListener('click', () => startTimer(Number(btn.dataset.min)));
});
$('[data-timer="pause"]').addEventListener('click', togglePauseTimer);
$('[data-timer="cancel"]').addEventListener('click', cancelTimer);
$('.alarm-ok').addEventListener('click', dismissAlarm);

api.onTimer(({ action, minutes }) => {
  if (action === 'start') startTimer(minutes);
  else if (action === 'pause') togglePauseTimer();
  else if (action === 'cancel') cancelTimer();
});

// Simple two-tone chime with Web Audio, repeated a few times.
let audioCtx = null;
let alarmNodes = [];
function playAlarm() {
  stopAlarm();
  audioCtx = audioCtx || new AudioContext();
  const t0 = audioCtx.currentTime + 0.05;
  for (let round = 0; round < 4; round++) {
    [880, 1318.5].forEach((freq, i) => {
      const start = t0 + round * 1.2 + i * 0.18;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.65);
      alarmNodes.push(osc);
    });
  }
}
function stopAlarm() {
  alarmNodes.forEach((osc) => { try { osc.stop(); } catch {} });
  alarmNodes = [];
}

// ---------- clock ----------
const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
function tickClock() {
  const now = new Date();
  $('.clock').textContent = timeFmt.format(now);
  const date = dateFmt.format(now);
  $('.date').textContent = date.charAt(0).toUpperCase() + date.slice(1);
}
tickClock();
setInterval(tickClock, 1000);

// ---------- battery ----------
function paintBattery() {
  const b = state.battery;
  if (!b) return;
  const pct = Math.round(b.level * 100);
  $$('.pct').forEach((el) => (el.textContent = `${pct}%`));
  $$('.battery').forEach((el) => {
    el.classList.toggle('low', pct <= 20 && !b.charging);
    $('.lvl', el).style.width = `${Math.max(pct, 6)}%`;
  });
}

if (navigator.getBattery) {
  navigator.getBattery().then((b) => {
    state.battery = b;
    paintBattery();
    b.addEventListener('levelchange', paintBattery);
    b.addEventListener('chargingchange', () => {
      paintBattery();
      if (b.charging) {
        state.chargingToastUntil = performance.now() + 3500;
        render();
      }
    });
  });
}

render();
