// ──────────────────────────────────────────────────────
// FIREBASE INIT
// ──────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCvvuj8B8HJvzjew32ZqsOxd-P6xwug7QQ",
  authDomain: "jubal-1cbcc.firebaseapp.com",
  databaseURL: "https://jubal-1cbcc-default-rtdb.firebaseio.com",
  projectId: "jubal-1cbcc",
  storageBucket: "jubal-1cbcc.firebasestorage.app",
  messagingSenderId: "607684618832",
  appId: "1:607684618832:web:369dca080c4e20eb89bf55"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ──────────────────────────────────────────────────────
// ROLES
// ──────────────────────────────────────────────────────
let currentRole = sessionStorage.getItem('role') || null;

db.ref('config/leaderPassword').once('value', snap => {
  if (!snap.val()) db.ref('config/leaderPassword').set('musicman');
});

function togglePasswordInput() {
  const wrap = document.getElementById('password-wrap');
  wrap.classList.toggle('show');
  if (wrap.classList.contains('show')) {
    document.getElementById('leader-password').focus();
  }
}

function checkPassword() {
  const input = document.getElementById('leader-password').value;
  db.ref('config/leaderPassword').once('value', snap => {
    if (input === snap.val()) {
      enterAs('lider');
    } else {
      document.getElementById('password-error').classList.add('show');
      setTimeout(() => document.getElementById('password-error').classList.remove('show'), 2000);
    }
  });
}

function enterAs(role) {
  currentRole = role;
  sessionStorage.setItem('role', role);
  document.getElementById('role-screen').classList.add('hidden');
  applyRole();
}

function changeRole() {
  sessionStorage.removeItem('role');
  currentRole = null;
  document.getElementById('role-screen').classList.remove('hidden');
  document.getElementById('password-wrap').classList.remove('show');
  document.getElementById('leader-password').value = '';
  document.getElementById('password-error').classList.remove('show');
}

function applyRole() {
  const leader = currentRole === 'lider';
  document.getElementById('role-badge-display').textContent = leader ? 'Líder' : 'Músico';
  document.querySelectorAll('.leader-only').forEach(el => {
    el.style.display = leader ? '' : 'none';
  });
  if (!leader) {
    const active = document.querySelector('.page.active');
    if (active && active.id === 'page-agregar') showTab('setlist');
  }
  renderCurrentPage();
}

function isLeader() {
  return currentRole === 'lider';
}

if (currentRole) {
  document.getElementById('role-screen').classList.add('hidden');
  applyRole();
}

// ──────────────────────────────────────────────────────
// DATA — canciones de ejemplo (solo para primera carga)
// ──────────────────────────────────────────────────────
const defaultSongs = [
  {
    id: 1,
    title: "Cuán Grande es Él",
    author: "Stuart K. Hine",
    key: "G",
    bpm: 68,
    lyrics: `[Intro]
G  C  G  D

[Verso 1]
G                    C
Señor mi Dios, al contemplar los cielos
G               D
El firmamento y las estrellas mil
G                    C
Al oír Tu voz en los poderosos truenos
G         D       G
Y ver brillar el sol en su cenit

[Coro]
G       C      G
Mi alma canta a Ti
          D
Señor mi Dios
G       C       G    D    G
¡Cuán grande es Él! ¡Cuán grande es Él!`
  },
  {
    id: 2,
    title: "Santo, Santo, Santo",
    author: "Reginald Heber",
    key: "D",
    bpm: 72,
    lyrics: `[Intro]
D  A  Bm  G  D

[Verso 1]
D          A        D
Santo, Santo, Santo
D          G        A
Señor omnipotente
D         A          D    G
Siempre el labio mío loores te dará
D        A        D
Santo, Santo, Santo
G          D       A    D
Te adoro reverente

[Coro]
G         D
Santo, Santo, Santo
A              D
Es el Señor`
  },
  {
    id: 3,
    title: "Majestuoso",
    author: "Danilo Montero",
    key: "E",
    bpm: 80,
    lyrics: `[Intro]
E  B  C#m  A  (x2)

[Verso 1]
E              B
Majestuoso y poderoso
C#m              A
Digno de honor y gloria eres Tú
E              B
Rey de reyes, Señor de señores
C#m          A      B
Todo el cielo proclama Tu valor

[Pre-Coro]
C#m        B
Oh, Te alabamos
A           B
Oh, Te adoramos

[Coro]
E         B
¡Majestuoso!
C#m         A
¡Glorioso!
E          B
¡Poderoso!
C#m    A    B
¡Rey!`
  },
  {
    id: 4,
    title: "Tu Fidelidad",
    author: "Marcos Witt",
    key: "C",
    bpm: 64,
    lyrics: `[Intro]
C  G  Am  F  (x2)

[Verso 1]
C           G
Grande es Tu fidelidad
Am            F
Dios mi padre, no hay sombra
C           G
De variación en Ti
Am      F
Siempre el mismo serás

[Coro]
C         G         Am
Grande es Tu fidelidad
F          C
Grande es Tu fidelidad
G              Am    F
Cada mañana se renueva
C  G  Am  F
Tu misericordia en mí`
  },
  {
    id: 5,
    title: "Eres Todo Poderoso",
    author: "Generación 12",
    key: "A",
    bpm: 88,
    lyrics: `[Intro]
A  E  F#m  D  (x2)

[Verso 1]
A                E
Eres todopoderoso, eres asombroso
F#m                D
Digno de alabanza, digno de honor
A                E
Tu nombre es eterno, Tu nombre es glorioso
F#m             D        E
Por siempre y para siempre, Señor

[Coro]
A       E
¡Aleluya! ¡Aleluya!
F#m      D
Al Rey adoramos
A       E
¡Aleluya! ¡Aleluya!
F#m    D   E   A
Su nombre alabamos`
  }
];

// ──────────────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────────────
let songs = [];
let setlist = [];
let activities = [];
let prevPage = 'setlist';
let deleteTargetId = null;
let deleteActivityId = null;
let firebaseReady = false;
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();

function save() {
  db.ref('songs').set(songs);
  db.ref('setlist').set(setlist);
}

// ──────────────────────────────────────────────────────
// FIREBASE LISTENERS (tiempo real)
// ──────────────────────────────────────────────────────
db.ref('songs').on('value', snap => {
  const data = snap.val();
  if (data) {
    songs = Array.isArray(data) ? data.filter(Boolean) : Object.values(data);
  } else if (!firebaseReady) {
    songs = defaultSongs;
    db.ref('songs').set(songs);
  } else {
    songs = [];
  }
  firebaseReady = true;
  renderCurrentPage();
});

db.ref('setlist').on('value', snap => {
  const data = snap.val();
  setlist = data ? (Array.isArray(data) ? data.filter(Boolean) : Object.values(data)) : [];
  renderCurrentPage();
});

db.ref('activities').on('value', snap => {
  const data = snap.val();
  if (data) {
    activities = Array.isArray(data) ? data.filter(Boolean) : Object.values(data);
  } else {
    activities = [];
  }
  renderCurrentPage();
});

function renderCurrentPage() {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;
  if (activePage.id === 'page-setlist') {
    renderSetlist();
    renderDashboardActivities();
  }
  if (activePage.id === 'page-repertorio') renderRepertorio(document.getElementById('search-input')?.value || '');
  if (activePage.id === 'page-actividades') {
    renderCalendar();
    renderActivitiesList();
  }
}

// ──────────────────────────────────────────────────────
// NAVIGATION
// ──────────────────────────────────────────────────────
function showTab(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  const tab = document.getElementById('tab-' + name);
  if (tab) tab.classList.add('active');

  if (name === 'setlist') { renderSetlist(); renderDashboardActivities(); }
  if (name === 'repertorio') renderRepertorio();
  if (name === 'agregar') clearForm();
  if (name === 'actividades') { renderCalendar(); renderActivitiesList(); }
}

function showSong(id, from) {
  prevPage = from || 'setlist';
  const song = songs.find(s => s.id === id);
  if (!song) return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-song').classList.add('active');

  document.getElementById('sv-title').textContent = song.title;

  const metas = [];
  if (song.author) metas.push(song.author);
  if (song.key) metas.push('🎵 ' + song.key);
  if (song.bpm) metas.push('♩ ' + song.bpm + ' bpm');
  document.getElementById('sv-meta').innerHTML = metas.map(m => `<span>${m}</span>`).join('');

  renderLyrics(song.lyrics || '');
}

function goBack() {
  showTab(prevPage);
}

// ──────────────────────────────────────────────────────
// RENDER LYRICS
// ──────────────────────────────────────────────────────
function renderLyrics(text) {
  const container = document.getElementById('sv-lyrics');
  container.innerHTML = '';
  const lines = text.split('\n');
  lines.forEach(line => {
    if (!line.trim()) {
      const br = document.createElement('div');
      br.style.height = '10px';
      container.appendChild(br);
      return;
    }
    const div = document.createElement('div');
    if (/^\[.+\]$/.test(line.trim())) {
      div.className = 'section-label';
      div.textContent = line.trim().replace(/[\[\]]/g, '');
    } else if (/^[A-G][#b]?(m|maj|min|sus|aug|dim|add|2|4|5|6|7|9|11|13|\/)?[A-G0-9#b]*(\s+[A-G][#b]?(m|maj|min|sus|aug|dim|add|2|4|5|6|7|9|11|13|\/)?[A-G0-9#b]*)*\s*$/.test(line.trim())) {
      div.className = 'chord-line';
      div.textContent = line;
    } else {
      div.className = 'lyric-line';
      div.textContent = line;
    }
    container.appendChild(div);
  });
}

// ──────────────────────────────────────────────────────
// SETLIST
// ──────────────────────────────────────────────────────
function renderSetlist() {
  const container = document.getElementById('setlist-container');
  const inSetlist = songs.filter(s => setlist.includes(s.id));

  if (inSetlist.length === 0) {
    container.innerHTML = `
      <div class="setlist-empty">
        <div class="icon">🎶</div>
        <p>No hay canciones en el setlist de hoy.<br>Ve al <strong>Repertorio</strong> y agrégalas.</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="setlist-songs">` +
    inSetlist.map((s, i) => `
      <div class="setlist-card" onclick="showSong(${s.id}, 'setlist')">
        <div class="song-num">${i + 1}</div>
        <div class="song-info">
          <div class="song-title">${s.title}</div>
          <div class="song-meta">
            <span>${s.author || ''}</span>
          </div>
        </div>
        <div style="display:flex; gap:6px; align-items:center;">
          ${s.key ? `<span class="tag tag-key">${s.key}</span>` : ''}
          ${s.bpm ? `<span class="tag tag-bpm">${s.bpm}</span>` : ''}
          ${isLeader() ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); removeFromSetlist(${s.id})">✕</button>` : ''}
        </div>
      </div>`).join('') +
    `</div>`;
}

function removeFromSetlist(id) {
  setlist = setlist.filter(x => x !== id);
  save();
  renderSetlist();
}

function addToSetlist(id) {
  if (!setlist.includes(id)) {
    setlist.push(id);
    save();
    showToast('Añadida al servicio de hoy ✓');
    renderRepertorio();
  }
}

// ──────────────────────────────────────────────────────
// REPERTORIO
// ──────────────────────────────────────────────────────
function renderRepertorio(filter = '') {
  const grid = document.getElementById('songs-grid');
  const q = filter.toLowerCase();
  const filtered = songs.filter(s =>
    s.title.toLowerCase().includes(q) ||
    (s.author || '').toLowerCase().includes(q) ||
    (s.key || '').toLowerCase().includes(q)
  );

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">Sin resultados.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(s => `
    <div class="song-row">
      <div class="song-row-info" onclick="showSong(${s.id}, 'repertorio')" style="cursor:pointer;">
        <div class="song-row-title">${s.title}</div>
        <div class="song-row-sub">${[s.author, s.key ? '🎵 ' + s.key : '', s.bpm ? '♩ ' + s.bpm + ' bpm' : ''].filter(Boolean).join(' · ')}</div>
      </div>
      <div class="song-row-actions">
        ${setlist.includes(s.id)
          ? `<span class="in-setlist-badge">En setlist</span>`
          : isLeader() ? `<button class="btn btn-ghost btn-sm" onclick="addToSetlist(${s.id})">+ Setlist</button>` : ''}
        ${isLeader() ? `<button class="btn btn-danger btn-sm" onclick="openDeleteModal(${s.id})">✕</button>` : ''}
      </div>
    </div>`).join('');
}

function filterSongs(val) {
  renderRepertorio(val);
}

// ──────────────────────────────────────────────────────
// FORM
// ──────────────────────────────────────────────────────
function clearForm() {
  ['f-title','f-author','f-key','f-bpm','f-lyrics'].forEach(id => {
    const el = document.getElementById(id);
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
}

function saveSong() {
  const title = document.getElementById('f-title').value.trim();
  const lyrics = document.getElementById('f-lyrics').value.trim();
  if (!title) { alert('El título es obligatorio.'); return; }
  if (!lyrics) { alert('La letra y acordes son obligatorios.'); return; }

  const newSong = {
    id: Date.now(),
    title,
    author: document.getElementById('f-author').value.trim(),
    key: document.getElementById('f-key').value,
    bpm: parseInt(document.getElementById('f-bpm').value) || null,
    lyrics
  };

  songs.push(newSong);
  save();
  showToast('Alabanza guardada ✓');
  clearForm();
  showTab('repertorio');
}

// ──────────────────────────────────────────────────────
// DELETE MODAL
// ──────────────────────────────────────────────────────
function openDeleteModal(id) {
  deleteTargetId = id;
  const song = songs.find(s => s.id === id);
  document.getElementById('modal-delete-name').textContent = `"${song?.title}"`;
  document.getElementById('modal-delete').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-delete').classList.remove('open');
  deleteTargetId = null;
}

function confirmDelete() {
  if (!deleteTargetId) return;
  songs = songs.filter(s => s.id !== deleteTargetId);
  setlist = setlist.filter(x => x !== deleteTargetId);
  save();
  closeModal();
  showToast('Alabanza eliminada');
  renderRepertorio();
}

// ──────────────────────────────────────────────────────
// ACTIVITIES / CALENDAR
// ──────────────────────────────────────────────────────
const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const monthNamesShort = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const dayNamesShort = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function changeMonth(dir) {
  calendarMonth += dir;
  if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
  renderCalendar();
}

function renderCalendar() {
  const label = document.getElementById('calendar-month-label');
  const grid = document.getElementById('calendar-grid');
  if (!label || !grid) return;

  label.textContent = `${monthNames[calendarMonth]} ${calendarYear}`;

  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const today = new Date();

  // Event dates for this month
  const eventDates = new Set();
  activities.forEach(a => {
    if (!a.date) return;
    const [y, m] = a.date.split('-').map(Number);
    if (y === calendarYear && m - 1 === calendarMonth) {
      eventDates.add(parseInt(a.date.split('-')[2]));
    }
  });

  let html = dayNamesShort.map(d => `<div class="calendar-day-header">${d}</div>`).join('');

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-day other-month"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear();
    const hasEvent = eventDates.has(d);
    const classes = ['calendar-day'];
    if (isToday) classes.push('today');
    if (hasEvent) classes.push('has-event');
    html += `<div class="${classes.join(' ')}">${d}</div>`;
  }

  grid.innerHTML = html;
}

function renderActivitiesList() {
  const container = document.getElementById('activities-list');
  if (!container) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const upcoming = activities
    .filter(a => a.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

  if (upcoming.length === 0) {
    container.innerHTML = '<div class="activity-empty">No hay actividades próximas.</div>';
    return;
  }

  container.innerHTML = upcoming.map(a => {
    const [y, m, d] = a.date.split('-').map(Number);
    return `
    <div class="activity-card">
      <div class="activity-date-badge">
        <div class="day">${d}</div>
        <div class="month">${monthNamesShort[m - 1]}</div>
      </div>
      <div class="activity-info">
        <div class="activity-title">${a.title}</div>
        <div class="activity-meta">${a.time ? a.time + ' · ' : ''}${a.description || ''}</div>
      </div>
      ${isLeader() ? `<button class="btn btn-danger btn-sm" onclick="openDeleteActivityModal(${a.id})">✕</button>` : ''}
    </div>`;
  }).join('');
}

function renderDashboardActivities() {
  const container = document.getElementById('dashboard-activities-list');
  if (!container) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const upcoming = activities
    .filter(a => a.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    .slice(0, 3);

  if (upcoming.length === 0) {
    container.innerHTML = '<div class="activity-empty">No hay actividades próximas.</div>';
    return;
  }

  container.innerHTML = upcoming.map(a => {
    const [y, m, d] = a.date.split('-').map(Number);
    return `
    <div class="activity-card">
      <div class="activity-date-badge">
        <div class="day">${d}</div>
        <div class="month">${monthNamesShort[m - 1]}</div>
      </div>
      <div class="activity-info">
        <div class="activity-title">${a.title}</div>
        <div class="activity-meta">${a.time ? a.time + ' · ' : ''}${a.description || ''}</div>
      </div>
    </div>`;
  }).join('');
}

// Activity modals
function openAddActivity() {
  document.getElementById('act-title').value = '';
  document.getElementById('act-date').value = '';
  document.getElementById('act-time').value = '';
  document.getElementById('act-desc').value = '';
  document.getElementById('modal-activity').classList.add('open');
}

function closeActivityModal() {
  document.getElementById('modal-activity').classList.remove('open');
}

function saveActivity() {
  const title = document.getElementById('act-title').value.trim();
  const date = document.getElementById('act-date').value;
  if (!title) { alert('El título es obligatorio.'); return; }
  if (!date) { alert('La fecha es obligatoria.'); return; }

  const activity = {
    id: Date.now(),
    title,
    date,
    time: document.getElementById('act-time').value || '',
    description: document.getElementById('act-desc').value.trim()
  };

  activities.push(activity);
  db.ref('activities').set(activities);
  closeActivityModal();
  showToast('Actividad guardada ✓');
}

function openDeleteActivityModal(id) {
  deleteActivityId = id;
  const act = activities.find(a => a.id === id);
  document.getElementById('modal-delete-activity-name').textContent = `"${act?.title}"`;
  document.getElementById('modal-delete-activity').classList.add('open');
}

function closeDeleteActivityModal() {
  document.getElementById('modal-delete-activity').classList.remove('open');
  deleteActivityId = null;
}

function confirmDeleteActivity() {
  if (!deleteActivityId) return;
  activities = activities.filter(a => a.id !== deleteActivityId);
  db.ref('activities').set(activities.length ? activities : null);
  closeDeleteActivityModal();
  showToast('Actividad eliminada');
}

// ──────────────────────────────────────────────────────
// TOAST
// ──────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ──────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────
const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const now = new Date();
document.getElementById('today-date').textContent =
  `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]} ${now.getFullYear()}`;
