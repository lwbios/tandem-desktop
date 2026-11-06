const api = window.notes;
const $ = (s) => document.querySelector(s);

let notes = [];
let current = null;
let pinned = true;

const titleOf = (n) => (n.text.trim().split('\n')[0] || 'Nota sem título').slice(0, 60);
const when = (t) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function select(id) {
  current = notes.find((n) => n.id === id) || notes[0];
  $('#editor').value = current.text;
  paint();
  $('#editor').focus();
}

function paint() {
  $('#current').textContent = titleOf(current);
  $('#pinBtn').classList.toggle('on', pinned);
  const text = current.text;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  $('#stats').textContent = `${words} ${words === 1 ? 'palavra' : 'palavras'} · ${text.length} caracteres`;
  const list = $('#list');
  list.innerHTML = '';
  for (const n of notes) {
    const b = document.createElement('button');
    if (n === current) b.className = 'active';
    const t = document.createElement('span');
    t.className = 't';
    t.textContent = titleOf(n);
    const d = document.createElement('span');
    d.className = 'd';
    d.textContent = when(n.updated);
    b.append(t, d);
    b.addEventListener('click', () => { list.classList.remove('open'); select(n.id); });
    list.appendChild(b);
  }
}

let typing = null;
$('#editor').addEventListener('input', () => {
  current.text = $('#editor').value;
  current.updated = Date.now();
  $('#saved').classList.add('dirty');
  clearTimeout(typing);
  typing = setTimeout(() => {
    api.update(current.id, current.text);
    $('#saved').classList.remove('dirty');
  }, 250);
  $('#current').textContent = titleOf(current);
  const words = current.text.trim() ? current.text.trim().split(/\s+/).length : 0;
  $('#stats').textContent = `${words} ${words === 1 ? 'palavra' : 'palavras'} · ${current.text.length} caracteres`;
});

async function create() {
  const res = await api.create();
  notes = res.notes;
  select(res.id);
}

$('#newBtn').addEventListener('click', create);
$('#delBtn').addEventListener('click', async () => {
  if (current.text.trim() && !confirm(`Apagar "${titleOf(current)}"?`)) return;
  notes = await api.remove(current.id);
  select(notes[0].id);
});
$('#pinBtn').addEventListener('click', () => { pinned = !pinned; api.pin(pinned); paint(); });
$('#closeBtn').addEventListener('click', () => api.window('close'));
$('#listBtn').addEventListener('click', (e) => { e.stopPropagation(); $('#list').classList.toggle('open'); });
document.addEventListener('click', () => $('#list').classList.remove('open'));

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); create(); }
  if (e.key === 'Escape') {
    if ($('#list').classList.contains('open')) $('#list').classList.remove('open');
    else api.window('close');
  }
});

api.onData((data) => {
  notes = data.notes;
  pinned = data.pinned;
  select(data.focusId || (current && notes.some((n) => n.id === current.id) ? current.id : notes[0].id));
});
