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

// Helper: date to YYYY-MM-DD string
function pad2(date) {
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

// ──────────────────────────────────────────────────────
// ROLES: lider, musico, cantante
// ──────────────────────────────────────────────────────
let currentRole = sessionStorage.getItem('role') || null;

db.ref('config/leaderPassword').once('value', snap => {
  if (!snap.val()) db.ref('config/leaderPassword').set('musicman');
});

function togglePasswordInput() {
  const wrap = document.getElementById('password-wrap');
  wrap.classList.toggle('show');
  document.getElementById('leader-option').classList.toggle('selected', wrap.classList.contains('show'));
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
  document.getElementById('leader-option').classList.remove('selected');
  document.getElementById('leader-password').value = '';
  document.getElementById('password-error').classList.remove('show');
}

function applyRole() {
  const leader = currentRole === 'lider';
  const roleLabels = { lider: 'Líder', musico: 'Músico', cantante: 'Cantante' };
  document.getElementById('role-badge-display').textContent = roleLabels[currentRole] || '';
  document.querySelectorAll('.leader-only').forEach(el => {
    el.style.display = leader ? '' : 'none';
  });
  if (!leader) {
    const active = document.querySelector('.page.active');
    if (active && active.id === 'page-agregar') showTab('servicios');
  }
  renderCurrentPage();
}

function isLeader() { return currentRole === 'lider'; }
function isCantante() { return currentRole === 'cantante'; }

if (currentRole) {
  document.getElementById('role-screen').classList.add('hidden');
  applyRole();
}

// ──────────────────────────────────────────────────────
// DATA — canciones de ejemplo (solo para primera carga)
// ──────────────────────────────────────────────────────
const defaultSongs = [
  { id: 1, title: "Cuán Grande es Él", author: "Stuart K. Hine", key: "G", bpm: 68, lyrics: `[Intro]\nG  C  G  D\n\n[Verso 1]\nG                    C\nSeñor mi Dios, al contemplar los cielos\nG               D\nEl firmamento y las estrellas mil\nG                    C\nAl oír Tu voz en los poderosos truenos\nG         D       G\nY ver brillar el sol en su cenit\n\n[Coro]\nG       C      G\nMi alma canta a Ti\n          D\nSeñor mi Dios\nG       C       G    D    G\n¡Cuán grande es Él! ¡Cuán grande es Él!` },
  { id: 2, title: "Santo, Santo, Santo", author: "Reginald Heber", key: "D", bpm: 72, lyrics: `[Intro]\nD  A  Bm  G  D\n\n[Verso 1]\nD          A        D\nSanto, Santo, Santo\nD          G        A\nSeñor omnipotente\nD         A          D    G\nSiempre el labio mío loores te dará\nD        A        D\nSanto, Santo, Santo\nG          D       A    D\nTe adoro reverente\n\n[Coro]\nG         D\nSanto, Santo, Santo\nA              D\nEs el Señor` },
  { id: 3, title: "Majestuoso", author: "Danilo Montero", key: "E", bpm: 80, lyrics: `[Intro]\nE  B  C#m  A  (x2)\n\n[Verso 1]\nE              B\nMajestuoso y poderoso\nC#m              A\nDigno de honor y gloria eres Tú\nE              B\nRey de reyes, Señor de señores\nC#m          A      B\nTodo el cielo proclama Tu valor\n\n[Coro]\nE         B\n¡Majestuoso!\nC#m         A\n¡Glorioso!\nE          B\n¡Poderoso!\nC#m    A    B\n¡Rey!` },
  { id: 4, title: "Tu Fidelidad", author: "Marcos Witt", key: "C", bpm: 64, lyrics: `[Intro]\nC  G  Am  F  (x2)\n\n[Verso 1]\nC           G\nGrande es Tu fidelidad\nAm            F\nDios mi padre, no hay sombra\nC           G\nDe variación en Ti\nAm      F\nSiempre el mismo serás\n\n[Coro]\nC         G         Am\nGrande es Tu fidelidad\nF          C\nGrande es Tu fidelidad\nG              Am    F\nCada mañana se renueva\nC  G  Am  F\nTu misericordia en mí` },
  { id: 5, title: "Eres Todo Poderoso", author: "Generación 12", key: "A", bpm: 88, lyrics: `[Intro]\nA  E  F#m  D  (x2)\n\n[Verso 1]\nA                E\nEres todopoderoso, eres asombroso\nF#m                D\nDigno de alabanza, digno de honor\nA                E\nTu nombre es eterno, Tu nombre es glorioso\nF#m             D        E\nPor siempre y para siempre, Señor\n\n[Coro]\nA       E\n¡Aleluya! ¡Aleluya!\nF#m      D\nAl Rey adoramos\nA       E\n¡Aleluya! ¡Aleluya!\nF#m    D   E   A\nSu nombre alabamos` }
];

// ──────────────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────────────
let songs = [];
let services = {};  // { "2026-03-30": [songId1, songId2, ...], ... }
let activities = [];
let songTypes = [];
let prevPage = 'servicios';
let deleteTargetId = null;
let deleteActivityId = null;
let firebaseReady = false;
let selectedServiceDate = '';
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();
let activeTypeFilter = '';

function saveServices() {
  db.ref('services').set(services);
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

db.ref('services').on('value', snap => {
  services = snap.val() || {};
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

db.ref('songTypes').on('value', snap => {
  const data = snap.val();
  songTypes = data ? (Array.isArray(data) ? data.filter(Boolean) : Object.values(data)) : [];
  updateTypeSelect();
  renderTypeFilters();
  renderCurrentPage();
});

function renderCurrentPage() {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;
  if (activePage.id === 'page-servicios') {
    renderSetlist();
    renderDashboardActivities();
  }
  if (activePage.id === 'page-repertorio') renderRepertorio(document.getElementById('search-input')?.value || '');
  if (activePage.id === 'page-actividades') {
    renderCalendar();
    renderActivitiesList();
  }
  if (activePage.id === 'page-tipos') renderTipos();
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

  if (name === 'servicios') { renderSetlist(); renderDashboardActivities(); }
  if (name === 'repertorio') { renderTypeFilters(); renderRepertorio(); }
  if (name === 'agregar') { updateTypeSelect(); clearForm(); }
  if (name === 'actividades') { renderCalendar(); renderActivitiesList(); }
  if (name === 'tipos') renderTipos();
}

function showSong(id, from) {
  prevPage = from || 'servicios';
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
// SERVICE DATE
// ──────────────────────────────────────────────────────
function onServiceDateChange() {
  selectedServiceDate = document.getElementById('service-date').value;
  renderSetlist();
}

function getSelectedSetlist() {
  if (!selectedServiceDate) return [];
  return services[selectedServiceDate] || [];
}

// ──────────────────────────────────────────────────────
// RENDER LYRICS (respeta rol: cantante sin acordes)
// ──────────────────────────────────────────────────────
const chordRegex = /^[A-G][#b]?(m|maj|min|sus|aug|dim|add|2|4|5|6|7|9|11|13|\/)?[A-G0-9#b]*(\s+[A-G][#b]?(m|maj|min|sus|aug|dim|add|2|4|5|6|7|9|11|13|\/)?[A-G0-9#b]*)*\s*$/;

function renderLyrics(text) {
  const container = document.getElementById('sv-lyrics');
  container.innerHTML = '';
  const lines = text.split('\n');
  const hideChords = isCantante();

  lines.forEach(line => {
    if (!line.trim()) {
      const br = document.createElement('div');
      br.style.height = '10px';
      container.appendChild(br);
      return;
    }
    const isChordLine = chordRegex.test(line.trim());

    // Si es cantante, omitir líneas de acordes
    if (hideChords && isChordLine) return;

    const div = document.createElement('div');
    if (/^\[.+\]$/.test(line.trim())) {
      div.className = 'section-label';
      div.textContent = line.trim().replace(/[\[\]]/g, '');
    } else if (isChordLine) {
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
// SETLIST (por fecha de servicio)
// ──────────────────────────────────────────────────────
function renderSetlist() {
  const container = document.getElementById('setlist-container');

  if (!selectedServiceDate) {
    container.innerHTML = `
      <div class="setlist-empty">
        <div class="icon">📅</div>
        <p>Selecciona una fecha de servicio para ver o armar el setlist.</p>
      </div>`;
    return;
  }

  const setlistIds = getSelectedSetlist();
  const inSetlist = setlistIds.map(id => songs.find(s => s.id === id)).filter(Boolean);

  if (inSetlist.length === 0) {
    container.innerHTML = `
      <div class="setlist-empty">
        <div class="icon">🎶</div>
        <p>No hay canciones para este servicio.${isLeader() ? '<br>Ve al <strong>Repertorio</strong> y agrégalas.' : ''}</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="setlist-songs">` +
    inSetlist.map((s, i) => `
      <div class="setlist-card" onclick="showSong(${s.id}, 'servicios')">
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
  if (!selectedServiceDate) return;
  const list = services[selectedServiceDate] || [];
  services[selectedServiceDate] = list.filter(x => x !== id);
  if (services[selectedServiceDate].length === 0) delete services[selectedServiceDate];
  saveServices();
  renderSetlist();
}

function addToSetlist(id) {
  if (!selectedServiceDate) {
    alert('Primero selecciona una fecha de servicio en la pestaña Servicios.');
    return;
  }
  if (!services[selectedServiceDate]) services[selectedServiceDate] = [];
  if (!services[selectedServiceDate].includes(id)) {
    services[selectedServiceDate].push(id);
    saveServices();
    showToast('Añadida al servicio ✓');
    renderRepertorio();
  }
}

// ──────────────────────────────────────────────────────
// REPERTORIO
// ──────────────────────────────────────────────────────
function renderTypeFilters() {
  const container = document.getElementById('type-filters');
  if (!container) return;
  if (songTypes.length === 0) { container.innerHTML = ''; return; }
  const pills = songTypes.map(t =>
    `<button class="type-pill ${activeTypeFilter === String(t.id) ? 'active' : ''}" onclick="setTypeFilter('${t.id}')">${t.name}</button>`
  );
  container.innerHTML = `<div class="type-pills">
    <button class="type-pill ${!activeTypeFilter ? 'active' : ''}" onclick="setTypeFilter('')">Todos</button>
    ${pills.join('')}
  </div>`;
}

function setTypeFilter(typeId) {
  activeTypeFilter = typeId;
  renderTypeFilters();
  renderRepertorio(document.getElementById('search-input')?.value || '');
}

function renderRepertorio(filter = '') {
  const grid = document.getElementById('songs-grid');
  const q = filter.toLowerCase();
  let filtered = songs.filter(s =>
    s.title.toLowerCase().includes(q) ||
    (s.author || '').toLowerCase().includes(q) ||
    (s.key || '').toLowerCase().includes(q)
  );

  if (activeTypeFilter) {
    filtered = filtered.filter(s => String(s.type) === activeTypeFilter);
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">Sin resultados.</div>`;
    return;
  }

  const currentSetlist = getSelectedSetlist();

  grid.innerHTML = filtered.map(s => {
    const typeObj = songTypes.find(t => String(t.id) === String(s.type));
    const typeBadge = typeObj ? `<span class="tag tag-type">${typeObj.name}</span>` : '';
    return `
    <div class="song-row">
      <div class="song-row-info" onclick="showSong(${s.id}, 'repertorio')" style="cursor:pointer;">
        <div class="song-row-title">${s.title}</div>
        <div class="song-row-sub">${[s.author, s.key ? '🎵 ' + s.key : '', s.bpm ? '♩ ' + s.bpm + ' bpm' : ''].filter(Boolean).join(' · ')}</div>
      </div>
      <div class="song-row-actions">
        ${typeBadge}
        ${currentSetlist.includes(s.id)
          ? `<span class="in-setlist-badge">En setlist</span>`
          : isLeader() ? `<button class="btn btn-ghost btn-sm" onclick="addToSetlist(${s.id})">+ Setlist</button>` : ''}
        ${isLeader() ? `<button class="btn btn-danger btn-sm" onclick="openDeleteModal(${s.id})">✕</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function filterSongs(val) {
  renderRepertorio(val);
}

// ──────────────────────────────────────────────────────
// FORM
// ──────────────────────────────────────────────────────
function updateTypeSelect() {
  const select = document.getElementById('f-type');
  if (!select) return;
  select.innerHTML = `<option value="">— Sin tipo —</option>` +
    songTypes.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

function clearForm() {
  ['f-title','f-author','f-key','f-bpm','f-lyrics','f-type'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
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
    type: document.getElementById('f-type').value || null,
    lyrics
  };

  songs.push(newSong);
  db.ref('songs').set(songs);
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
  // Remove from all services
  for (const date in services) {
    services[date] = services[date].filter(x => x !== deleteTargetId);
    if (services[date].length === 0) delete services[date];
  }
  db.ref('songs').set(songs);
  saveServices();
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

  const eventDates = new Set();
  activities.forEach(a => {
    if (!a.date) return;
    const [y, m] = a.date.split('-').map(Number);
    if (y === calendarYear && m - 1 === calendarMonth) {
      eventDates.add(parseInt(a.date.split('-')[2]));
    }
  });

  let html = dayNamesShort.map(d => `<div class="calendar-day-header">${d}</div>`).join('');

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-day other-month"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear();
    const hasEvent = eventDates.has(d);
    const classes = ['calendar-day'];
    if (isToday) classes.push('today');
    if (hasEvent) classes.push('has-event');
    if (isLeader()) classes.push('clickable');
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const clickAttr = isLeader() ? `onclick="openAddActivity('${dateStr}')"` : '';
    html += `<div class="${classes.join(' ')}" ${clickAttr}>${d}</div>`;
  }

  grid.innerHTML = html;
}

function renderActivitiesList() {
  const container = document.getElementById('activities-list');
  if (!container) return;

  const today = `${pad2(new Date())}`;
  const upcoming = activities
    .filter(a => a.date >= today)
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

  const today = `${pad2(new Date())}`;
  const upcoming = activities
    .filter(a => a.date >= today)
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

function openAddActivity(date) {
  document.getElementById('act-title').value = '';
  document.getElementById('act-date').value = date || '';
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
// TIPOS DE ALABANZAS
// ──────────────────────────────────────────────────────
function renderTipos() {
  const container = document.getElementById('tipos-list');
  if (!container) return;
  if (songTypes.length === 0) {
    container.innerHTML = '<div class="activity-empty">No hay tipos. Agrega el primero arriba.</div>';
    return;
  }
  container.innerHTML = songTypes.map(t => {
    const count = songs.filter(s => String(s.type) === String(t.id)).length;
    return `
    <div class="song-row">
      <div class="song-row-info">
        <div class="song-row-title">${t.name}</div>
        <div class="song-row-sub">${count} alabanza${count !== 1 ? 's' : ''}</div>
      </div>
      <div class="song-row-actions">
        <button class="btn btn-danger btn-sm" onclick="deleteType(${t.id})">✕ Eliminar</button>
      </div>
    </div>`;
  }).join('');
}

function saveType() {
  const name = document.getElementById('tipo-name').value.trim();
  if (!name) { alert('El nombre es obligatorio.'); return; }
  const newType = { id: Date.now(), name };
  songTypes.push(newType);
  db.ref('songTypes').set(songTypes);
  document.getElementById('tipo-name').value = '';
  showToast('Tipo guardado ✓');
}

function deleteType(id) {
  songTypes = songTypes.filter(t => t.id !== id);
  db.ref('songTypes').set(songTypes.length ? songTypes : null);
  showToast('Tipo eliminado');
}

// ──────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────
const initToday = pad2(new Date());
const serviceDate = document.getElementById('service-date');
if (serviceDate) {
  serviceDate.value = initToday;
  selectedServiceDate = initToday;
}
