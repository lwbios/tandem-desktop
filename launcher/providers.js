// Instant answers for the launcher, computed from the query alone:
// unit/currency conversion, dates and time zones, colours, timers and generators.
// Each provider returns launcher items ({ title, sub, icon, color, action, ... }).
(function () {
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const num = (s) => Number(String(s).replace(',', '.'));
  const nf = (v, max = 6) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: max }).format(v);
  const plain = (v) => String(Math.round(v * 1e8) / 1e8);

  // ---------------------------------------------------------------- units
  // factor to the base unit of each group
  const UNITS = {
    length: { m: 1, metro: 1, metros: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, milha: 1609.344, milhas: 1609.344, mile: 1609.344, miles: 1609.344, ft: 0.3048, pe: 0.3048, pes: 0.3048, feet: 0.3048, in: 0.0254, pol: 0.0254, polegada: 0.0254, polegadas: 0.0254, inch: 0.0254, inches: 0.0254, yd: 0.9144, jarda: 0.9144 },
    mass: { kg: 1, g: 0.001, mg: 1e-6, t: 1000, ton: 1000, lb: 0.45359237, lbs: 0.45359237, libra: 0.45359237, libras: 0.45359237, oz: 0.028349523125, onca: 0.028349523125 },
    data: { b: 1, byte: 1, bytes: 1, kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12, kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, tib: 1024 ** 4, bit: 0.125, bits: 0.125 },
    time: { s: 1, seg: 1, segundo: 1, segundos: 1, ms: 0.001, min: 60, minuto: 60, minutos: 60, h: 3600, hora: 3600, horas: 3600, d: 86400, dia: 86400, dias: 86400, semana: 604800, semanas: 604800, mes: 2629800, meses: 2629800, ano: 31557600, anos: 31557600 },
    speed: { 'km/h': 1, kmh: 1, 'm/s': 3.6, mph: 1.609344, kn: 1.852, no: 1.852, nos: 1.852 },
    volume: { l: 1, litro: 1, litros: 1, ml: 0.001, gal: 3.785411784, galao: 3.785411784, galoes: 3.785411784, 'm3': 1000, xicara: 0.24, xicaras: 0.24, cup: 0.24 },
    area: { 'm2': 1, 'km2': 1e6, ha: 1e4, hectare: 1e4, hectares: 1e4, 'cm2': 1e-4, acre: 4046.8564224, acres: 4046.8564224, 'ft2': 0.09290304 },
  };
  const TEMPS = { c: 'C', '°c': 'C', celsius: 'C', f: 'F', '°f': 'F', fahrenheit: 'F', k: 'K', kelvin: 'K' };

  function groupOf(unit) {
    for (const [g, map] of Object.entries(UNITS)) if (unit in map) return g;
    return null;
  }
  function toC(v, u) { return u === 'C' ? v : u === 'F' ? (v - 32) * 5 / 9 : v - 273.15; }
  function fromC(v, u) { return u === 'C' ? v : u === 'F' ? v * 9 / 5 + 32 : v + 273.15; }

  // "10 km em milhas", "30c to f", "2gb para mb"
  const CONV_RE = /^(-?\d+(?:[.,]\d+)?)\s*([a-z°/0-9²³]+)\s+(?:em|para|in|to|=|->)\s+([a-z°/0-9²³]+)$/i;

  function units(query) {
    const m = norm(query).replace(/²/g, '2').replace(/³/g, '3').match(CONV_RE);
    if (!m) return null;
    const value = num(m[1]);
    const from = m[2];
    const to = m[3];
    if (TEMPS[from] && TEMPS[to]) {
      const r = fromC(toC(value, TEMPS[from]), TEMPS[to]);
      return result(`${nf(r, 2)} °${TEMPS[to]}`, `${nf(value)} °${TEMPS[from]}`, plain(r));
    }
    const g = groupOf(from);
    if (!g || groupOf(to) !== g) return null;
    const r = (value * UNITS[g][from]) / UNITS[g][to];
    return result(`${nf(r)} ${to}`, `${nf(value)} ${from}`, plain(r));
  }

  function result(title, sub, copy) {
    return [{ section: 'Conversão' }, { id: 'conv', calc: true, title, sub, icon: 'calc', color: 'orange', accessory: 'Enter copia', action: { kind: 'copy', text: copy } }];
  }

  // ---------------------------------------------------------------- currency
  const CURRENCIES = {
    usd: 'USD', dolar: 'USD', dolares: 'USD', brl: 'BRL', real: 'BRL', reais: 'BRL', eur: 'EUR', euro: 'EUR', euros: 'EUR',
    gbp: 'GBP', libra: 'GBP', jpy: 'JPY', iene: 'JPY', ienes: 'JPY', cad: 'CAD', aud: 'AUD', chf: 'CHF', cny: 'CNY', yuan: 'CNY',
    mxn: 'MXN', ars: 'ARS', clp: 'CLP', inr: 'INR', krw: 'KRW', sek: 'SEK', nok: 'NOK', dkk: 'DKK', pln: 'PLN', try: 'TRY', zar: 'ZAR',
  };
  const rates = {}; // base -> { at, rates }
  const pending = {};

  // Frankfurter: free exchange rates (European Central Bank), no key needed.
  function loadRates(base, done) {
    if (rates[base] && Date.now() - rates[base].at < 3600e3) return rates[base].rates;
    if (!pending[base]) {
      pending[base] = fetch(`https://api.frankfurter.dev/v1/latest?from=${base}`)
        .then((r) => r.json())
        .then((j) => { rates[base] = { at: Date.now(), rates: { ...j.rates, [base]: 1 } }; })
        .catch(() => { rates[base] = { at: Date.now() - 3500e3, rates: null }; })
        .finally(() => { delete pending[base]; done(); });
    }
    return undefined;
  }

  function currency(query, refresh) {
    const m = norm(query).match(/^(\d+(?:[.,]\d+)?)\s*([a-z]+)\s+(?:em|para|in|to)\s+([a-z]+)$/);
    if (!m) return null;
    const from = CURRENCIES[m[2]];
    const to = CURRENCIES[m[3]];
    if (!from || !to) return null;
    const value = num(m[1]);
    const table = loadRates(from, refresh);
    if (table === undefined) return [{ section: 'Câmbio' }, { id: 'fx', title: 'Buscando cotação…', sub: `${from} → ${to}`, icon: 'calc', color: 'green' }];
    if (!table || !table[to]) return [{ section: 'Câmbio' }, { id: 'fx', title: 'Sem cotação agora', sub: 'Verifique a internet', icon: 'calc', color: 'gray' }];
    const r = value * table[to];
    const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: to }).format(r);
    return [{ section: 'Câmbio' }, {
      id: 'fx', calc: true, title: money, sub: `${nf(value)} ${from} · cotação do Banco Central Europeu`, icon: 'calc', color: 'green',
      accessory: 'Enter copia', action: { kind: 'copy', text: plain(r) },
    }];
  }

  // ---------------------------------------------------------------- dates
  const ZONES = {
    'sao paulo': 'America/Sao_Paulo', 'brasilia': 'America/Sao_Paulo', 'rio': 'America/Sao_Paulo', 'manaus': 'America/Manaus',
    'nova york': 'America/New_York', 'new york': 'America/New_York', 'nyc': 'America/New_York', 'los angeles': 'America/Los_Angeles',
    'sf': 'America/Los_Angeles', 'sao francisco': 'America/Los_Angeles', 'chicago': 'America/Chicago', 'miami': 'America/New_York',
    'toronto': 'America/Toronto', 'cidade do mexico': 'America/Mexico_City', 'buenos aires': 'America/Argentina/Buenos_Aires',
    'santiago': 'America/Santiago', 'lisboa': 'Europe/Lisbon', 'londres': 'Europe/London', 'london': 'Europe/London',
    'paris': 'Europe/Paris', 'madri': 'Europe/Madrid', 'madrid': 'Europe/Madrid', 'berlim': 'Europe/Berlin', 'berlin': 'Europe/Berlin',
    'roma': 'Europe/Rome', 'amsterda': 'Europe/Amsterdam', 'moscou': 'Europe/Moscow', 'dubai': 'Asia/Dubai', 'india': 'Asia/Kolkata',
    'mumbai': 'Asia/Kolkata', 'pequim': 'Asia/Shanghai', 'xangai': 'Asia/Shanghai', 'hong kong': 'Asia/Hong_Kong',
    'singapura': 'Asia/Singapore', 'toquio': 'Asia/Tokyo', 'tokyo': 'Asia/Tokyo', 'seul': 'Asia/Seoul', 'sydney': 'Australia/Sydney',
    'auckland': 'Pacific/Auckland', 'utc': 'UTC', 'gmt': 'UTC',
  };

  function dates(query) {
    const q = norm(query);
    const items = [];

    if (/^(hoje|data|que dia e hoje|today|date)$/.test(q)) {
      const d = new Date();
      const long = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const week = isoWeek(d);
      items.push({ id: 'date', calc: true, title: long.charAt(0).toUpperCase() + long.slice(1), sub: `Semana ${week} · dia ${dayOfYear(d)} do ano`, icon: 'calendar', color: 'red', accessory: 'Enter copia', action: { kind: 'copy', text: d.toLocaleDateString('pt-BR') } });
    }

    const tz = q.match(/^(?:hora|horas|horario|time)\s+(?:em|no|na|in)\s+(.+)$/);
    if (tz && ZONES[tz[1]]) {
      const zone = ZONES[tz[1]];
      const t = new Date().toLocaleTimeString('pt-BR', { timeZone: zone, hour: '2-digit', minute: '2-digit' });
      const day = new Date().toLocaleDateString('pt-BR', { timeZone: zone, weekday: 'long', day: 'numeric', month: 'short' });
      items.push({ id: 'tz', calc: true, title: t, sub: `${tz[1].replace(/\b\w/g, (c) => c.toUpperCase())} · ${day}`, icon: 'clock', color: 'blue', accessory: 'Enter copia', action: { kind: 'copy', text: t } });
    }

    const until = q.match(/^(?:dias ate|days until|quanto falta para)\s+(.+)$/);
    if (until) {
      const target = parseDate(until[1]);
      if (target) {
        const days = Math.ceil((target - startOfDay(new Date())) / 86400e3);
        items.push({ id: 'until', calc: true, title: `${nf(days)} ${Math.abs(days) === 1 ? 'dia' : 'dias'}`, sub: `até ${target.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`, icon: 'calendar', color: 'red', accessory: 'Enter copia', action: { kind: 'copy', text: String(days) } });
      }
    }

    const ts = q.match(/^(?:timestamp|unix)\s+(\d{9,13})$/);
    if (ts) {
      const n = Number(ts[1]);
      const d = new Date(ts[1].length > 10 ? n : n * 1000);
      items.push({ id: 'ts', calc: true, title: d.toLocaleString('pt-BR'), sub: `Unix ${ts[1]} · ${d.toISOString()}`, icon: 'clock', color: 'slate', accessory: 'Enter copia', action: { kind: 'copy', text: d.toISOString() } });
    }
    if (/^(timestamp|unix|agora unix|unix agora)$/.test(q)) {
      const s = Math.floor(Date.now() / 1000);
      items.push({ id: 'now-ts', calc: true, title: String(s), sub: 'Timestamp Unix de agora (segundos)', icon: 'clock', color: 'slate', accessory: 'Enter copia', action: { kind: 'copy', text: String(s) } });
    }
    return items.length ? [{ section: 'Data e hora' }, ...items] : null;
  }

  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function dayOfYear(d) { return Math.floor((startOfDay(d) - new Date(d.getFullYear(), 0, 0)) / 86400e3); }
  function isoWeek(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
    return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400e3 + 1) / 7);
  }
  // "25/12", "25/12/2027", "2027-03-01", "natal"
  function parseDate(s) {
    const now = new Date();
    if (s === 'natal' || s === 'christmas') s = '25/12';
    if (s === 'ano novo' || s === 'new year') s = '01/01';
    let m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (m) {
      let year = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : now.getFullYear();
      let d = new Date(year, Number(m[2]) - 1, Number(m[1]));
      if (!m[3] && d < startOfDay(now)) d = new Date(year + 1, Number(m[2]) - 1, Number(m[1]));
      return d;
    }
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return null;
  }

  // ---------------------------------------------------------------- colours
  function colors(query) {
    const q = query.trim().toLowerCase();
    let rgb = null;
    let m = q.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);
    // Without "#", only six hex digits with a number count, so words like "abc" stay words.
    if (m && (q.startsWith('#') || (m[1].length === 6 && /\d/.test(m[1]) && /[a-f]/.test(m[1])))) {
      let h = m[1];
      if (h.length === 3) h = h.split('').map((c) => c + c).join('');
      rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    }
    m = q.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
    if (m) rgb = [m[1], m[2], m[3]].map(Number);
    m = q.match(/^hsl\(\s*(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?/);
    if (m) rgb = hslToRgb(Number(m[1]), Number(m[2]), Number(m[3]));
    if (!rgb || rgb.some((v) => v > 255)) return null;

    const hex = '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
    const [h, s, l] = rgbToHsl(...rgb);
    const forms = [
      ['HEX', hex],
      ['RGB', `rgb(${rgb.join(', ')})`],
      ['HSL', `hsl(${h}, ${s}%, ${l}%)`],
    ];
    return [{ section: 'Cor' }, ...forms.map(([label, text]) => ({
      id: `color:${label}`, title: text, sub: label, swatch: hex, accessory: 'Enter copia', action: { kind: 'copy', text },
    }))];
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
  }

  // ---------------------------------------------------------------- timer / focus
  // "timer 15", "timer 1h30", "timer 90s", "foco 50", "pomodoro"
  function parseDuration(s) {
    s = norm(s);
    if (/^\d+(?:[.,]\d+)?$/.test(s)) return num(s);
    let total = 0;
    let matched = false;
    for (const [, v, u] of s.matchAll(/(\d+(?:[.,]\d+)?)\s*(h|hora|horas|m|min|minutos?|s|seg|segundos?)?/g)) {
      if (!v) continue;
      matched = true;
      const n = num(v);
      if (!u) total += n; // bare number after "1h30" is minutes
      else if (u.startsWith('h')) total += n * 60;
      else if (u.startsWith('s')) total += n / 60;
      else total += n;
    }
    return matched && total > 0 ? total : null;
  }

  const durLabel = (min) => {
    const total = Math.round(min * 60);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h && `${h} h`, m && `${m} min`, s && `${s} s`].filter(Boolean).join(' ');
  };

  function timers(query) {
    const q = norm(query);
    let m = q.match(/^(?:timer|temporizador|cronometro)\s+(.+)$/);
    if (m) {
      const min = parseDuration(m[1]);
      if (min && min <= 24 * 60) return [{ section: 'Timer' }, { id: 'timer', title: `Iniciar timer de ${durLabel(min)}`, sub: 'Aparece na ilha', icon: 'timer', color: 'orange', accessory: 'Timer', action: { kind: 'timer', minutes: min } }];
    }
    m = q.match(/^(?:foco|focus|pomodoro)(?:\s+(.+))?$/);
    if (m) {
      const min = m[1] ? parseDuration(m[1]) : 25;
      if (min && min <= 8 * 60) return [{ section: 'Foco' }, { id: 'focus', title: `Iniciar foco de ${durLabel(min)}`, sub: 'Timer na ilha e apps que distraem bloqueados', icon: 'target', color: 'purple', accessory: 'Foco', action: { kind: 'focus', minutes: min } }];
    }
    return null;
  }

  // ---------------------------------------------------------------- generators
  function password(len = 20) {
    const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*?-_=+'];
    const all = sets.join('');
    const pick = (chars) => chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length];
    const out = sets.map(pick); // at least one of each kind
    while (out.length < len) out.push(pick(all));
    for (let i = out.length - 1; i > 0; i--) {
      const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out.join('');
  }

  const LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.';

  // Built fresh on every search so the random values change.
  function generatorCommands() {
    const pw = password();
    const uuid = crypto.randomUUID();
    return [
      { id: 'gen:password', title: 'Gerar senha forte', sub: pw, icon: 'key', color: 'green', words: 'senha password gerar forte aleatoria', accessory: 'Enter copia', action: { kind: 'copy', text: pw } },
      { id: 'gen:uuid', title: 'Gerar UUID', sub: uuid, icon: 'key', color: 'slate', words: 'uuid guid id gerar', accessory: 'Enter copia', action: { kind: 'copy', text: uuid } },
      { id: 'gen:lorem', title: 'Colar Lorem ipsum', sub: 'Texto de exemplo', icon: 'text', color: 'gray', words: 'lorem ipsum texto exemplo placeholder', action: { kind: 'paste', text: LOREM } },
    ];
  }

  // Transformations of whatever is on the clipboard (done in the main process).
  const TRANSFORMS = [
    ['upper', 'MAIÚSCULAS', 'maiusculas uppercase caixa alta'],
    ['lower', 'minúsculas', 'minusculas lowercase caixa baixa'],
    ['title', 'Primeira Letra Maiúscula', 'titulo title case capitalizar'],
    ['camel', 'camelCase', 'camel case'],
    ['snake', 'snake_case', 'snake case underline'],
    ['kebab', 'kebab-case', 'kebab case hifen slug'],
    ['noAccents', 'Remover acentos', 'acentos acentuacao remover'],
    ['trim', 'Limpar espaços extras', 'espacos trim limpar'],
  ];

  function transformCommands(clip) {
    const preview = (clip || '').replace(/\s+/g, ' ').slice(0, 60);
    const items = TRANSFORMS.map(([id, label, words]) => ({
      id: `tx:${id}`, title: `Área de transferência → ${label}`, sub: preview, icon: 'text', color: 'teal',
      words: `${words} transformar converter texto clipboard`, accessory: 'Cola', action: { kind: 'transform', id },
    }));
    if (clip) {
      const words = clip.trim() ? clip.trim().split(/\s+/).length : 0;
      items.push({ id: 'tx:count', title: 'Contar caracteres da área de transferência', sub: `${nf(clip.length)} caracteres · ${nf(words)} palavras · ${nf(clip.split('\n').length)} linhas`, icon: 'text', color: 'teal', words: 'contar caracteres palavras count', accessory: 'Enter copia', action: { kind: 'copy', text: String(clip.length) } });
    }
    return items;
  }

  window.Providers = { units, currency, dates, colors, timers, generatorCommands, transformCommands, parseDuration };
})();
