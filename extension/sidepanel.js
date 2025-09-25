function isValidHttpUrl(value) {
    try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:'; } catch (_) { return false; }
}
// Compute current trimester using same logic as the Next.js app
function getDefaultTrimestre() {
    const now = new Date(); const mes = now.getMonth() + 1; const dia = now.getDate();
    if ((mes === 2 && dia >= 5) || mes === 3 || mes === 4 || (mes === 5 && dia <= 10)) return 1;
    if ((mes === 5 && dia >= 13) || mes === 6 || mes === 7 || (mes === 8 && dia <= 30)) return 2;
    if ((mes === 9 && dia >= 2) || mes === 10 || mes === 11 || (mes === 12 && dia <= 10)) return 3;
    if (mes === 1 || (mes === 2 && dia < 5)) return 1; if (mes === 5 && dia >= 11 && dia < 13) return 1; if (mes === 8 && dia > 30) return 2; if (mes === 12 && dia > 10) return 1; return 1;
}
async function loadConfig() { try { const resp = await fetch(chrome.runtime.getURL('config.json')); if (!resp.ok) return {}; return await resp.json(); } catch { return {}; } }
async function getDefaultBaseUrl() { const cfg = await loadConfig(); if (cfg && cfg.productionBaseUrl && isValidHttpUrl(cfg.productionBaseUrl)) return cfg.productionBaseUrl; return 'http://localhost:3000'; }
async function getStoredBaseUrl() { const d = await chrome.storage.local.get(['baseUrl']); return d.baseUrl || null; }
async function setStoredBaseUrl(v) { await chrome.storage.local.set({ baseUrl: v }); }
async function ensureDefaultBaseUrl() { const s = await getStoredBaseUrl(); if (s && isValidHttpUrl(s)) return s; const def = await getDefaultBaseUrl(); await setStoredBaseUrl(def); return def; }
async function getUiState() { const { uiState } = await chrome.storage.local.get(['uiState']); return uiState || { view: 'courses', selectedAulaId: null, trimestre: getDefaultTrimestre(), search: '', sort: 'name' }; }
async function setUiState(partial) { const cur = await getUiState(); const next = { ...cur, ...partial }; if (!next.trimestre) next.trimestre = getDefaultTrimestre(); await chrome.storage.local.set({ uiState: next }); return next; }
function $(id) { return document.getElementById(id); }
function render(el, html) { el.innerHTML = html; }

function heroLogin() {
    return `
<div class="sp-hero sp-card">
  <h1>Bienvenido</h1>
  <p>Inicia sesión para ver tus cursos y las notas del trimestre actual.</p>
  <div><button id="heroLogin" class="tw-btn tw-btn-primary">Ir a iniciar sesión</button></div>
</div>`;
}

function viewAdminRequired() {
    return `
<div class="sp-hero sp-card">
  <h1>Acceso de administrador requerido</h1>
  <p>Inicia sesión con una cuenta de administrador para usar este panel.</p>
  <div><button id="goLogin" class="tw-btn tw-btn-primary">Ir a iniciar sesión</button></div>
</div>`;
}

function colorFromText(t) { let h = 0; for (let i = 0; i < String(t).length; i++) h = (h * 31 + String(t).charCodeAt(i)) % 360; return `hsl(${h} 70% 50%)`; }
function initials(t) { const p = String(t || '').split(' ').filter(Boolean); if (!p.length) return 'A'; if (p.length === 1) return p[0].slice(0, 2).toUpperCase(); return (p[0][0] + p[p.length - 1][0]).toUpperCase(); }

function courseCard(a) {
    const progreso = Math.max(0, Math.min(100, Number(a.progreso || 0))); const chip = `<div class=\"sp-avatar\" style=\"background:${colorFromText(a.materia || a.nombre_aula)}\">${initials(a.materia || a.nombre_aula)}</div>`; return `
<div class="sp-card" data-aula-id="${a.id}">
  <div class="sp-row" style="justify-content: space-between; gap:10px;">
    <div class="sp-row" style="gap:10px;">
      ${chip}
      <div>
        <div class="sp-title">${a.nombre_aula || a.materia}</div>
        <div class="sp-subtle-12">${a.curso || ''} ${a.paralelo || ''} • ${a.materia || ''}</div>
      </div>
    </div>
    <span class="sp-badge">${a.estudiantes || 0} estudiantes</span>
  </div>
  <div class="sp-space"></div>
  <div class="sp-progress"><span style="width:${progreso}%"></span></div>
</div>`;
}

function viewCourses(aulas) {
    if (!aulas || aulas.length === 0) { return `<div class="sp-hero sp-card"><h1>No tienes aulas asignadas</h1><p>Cuando tengas aulas activas, aparecerán aquí.</p></div>`; } return `
<div class="sp-toolbar">
  <div class="sp-row" style="flex:1">
    <input id="searchInput" class="sp-input" placeholder="Buscar curso..." />
  </div>
</div>
<div id="coursesGrid" class="sp-grid">${aulas.map(courseCard).join('')}</div>`;
}

function computeGradesRows(estudiantes, notas, uiState) {
    const map = new Map(notas.map(n => [String(n.id_inscripcion), n]));
    let rows = estudiantes.map(e => {
        const n = map.get(String(e.inscripcion_id));
        const val = n ? (n.promedio_final_trimestre ?? '-') : '-';
        return { nombre: e.nombre_completo, nota: val };
    });
    if (uiState && uiState.search) {
        const q = uiState.search.toLowerCase();
        rows = rows.filter(r => r.nombre.toLowerCase().includes(q));
    }
    if (uiState && uiState.sort === 'grade') {
        rows.sort((a, b) => (a.nota === '-' ? -1 : a.nota) - (b.nota === '-' ? -1 : b.nota));
    } else {
        rows.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
    return rows.map(r => {
        let cls = 'grade-neutral';
        const num = parseFloat(r.nota);
        if (!isNaN(num)) {
            if (num >= 85) cls = 'grade-good';
            else if (num >= 60) cls = 'grade-warn';
            else cls = 'grade-bad';
        }
        const badge = `<span class=\"grade-badge ${cls}\">${r.nota}</span>`;
        return `<tr><td>${r.nombre}</td><td style=\"text-align:right\">${badge}</td></tr>`;
    }).join('');
}

function viewGrades(aula, estudiantes, notas, trimestre, uiState) {
    const rowsHtml = computeGradesRows(estudiantes, notas, uiState);
    return `
<div class="sp-card">
  <div class="sp-toolbar">
    <div>
      <div class="sp-title">${aula.nombre_aula || aula.materia}</div>
      <div class="sp-subtle-12">Trimestre ${trimestre}</div>
    </div>
    <div class="sp-row" style="gap:8px; flex-wrap: wrap;">
      <input id="gradesSearch" class="sp-input" placeholder="Buscar estudiante..." value="${uiState?.search || ''}" />
      <button id="toggleSort" class="sp-chip" data-sort="${uiState?.sort || 'name'}">${(uiState?.sort || 'name') === 'name' ? 'Orden: Nombre' : 'Orden: Nota'}</button>
    </div>
  </div>
  <table class="sp-table"><thead><tr><th>Estudiante</th><th style="text-align:right">Nota</th></tr></thead><tbody id="gradesBody">${rowsHtml}</tbody></table>
</div>`;
}

function skeletonCourses() { return `<div class="sp-grid">${Array.from({ length: 4 }).map(() => `<div class="sp-card"><div class="skel card"></div></div>`).join('')}</div>`; }
function skeletonGrades() { return `<div class="sp-card"><div class="skel row"></div><div class="sp-space"></div><div class="skel row"></div><div class="sp-space"></div><div class="skel row"></div></div>`; }

async function fetchJson(url) { const resp = await fetch(url, { credentials: 'include' }); if (!resp.ok) throw new Error(`HTTP ${resp.status}`); return await resp.json(); }
async function fetchSession(base) { try { return await fetchJson(new URL('/api/auth/session', base).toString()); } catch { return { user: null }; } }
async function fetchAulas(base) { return await fetchJson(new URL('/api/aulas', base).toString()); }
async function fetchEstudiantes(base, aulaId) { return await fetchJson(new URL(`/api/aulas/${aulaId}/estudiantes`, base).toString()); }
async function fetchNotas(base, aulaId, tri) { const u = new URL(`/api/aulas/${aulaId}/notas`, base); u.searchParams.set('trimestre', String(tri)); return await fetchJson(u.toString()); }
async function fetchColegios(base) { return await fetchJson(new URL('/api/colegios', base).toString()); }
async function fetchNiveles(base) { return await fetchJson(new URL('/api/niveles', base).toString()); }
async function fetchCursos(base) { return await fetchJson(new URL('/api/cursos', base).toString()); }
async function fetchParalelos(base) { return await fetchJson(new URL('/api/paralelos', base).toString()); }
async function fetchAdminEstudiantes(base, { colegioId, nivelId, cursoId, paraleloId }) {
    const u = new URL('/api/central/estudiantes', base);
    u.searchParams.set('colegioId', String(colegioId));
    u.searchParams.set('nivelId', String(nivelId));
    u.searchParams.set('cursoId', String(cursoId));
    u.searchParams.set('paraleloId', String(paraleloId));
    return await fetchJson(u.toString());
}

function viewAdminPicker({ colegios, niveles, cursos, paralelos }, sel) {
    const opt = (arr, valKey = 'id', labelKey = 'nombre') => arr.map(o => `<option value="${o[valKey]}">${o[labelKey] || o.nombre_completo || o.nombre_corto}</option>`).join('');
    return `
<div class="sp-card">
  <div class="sp-stepper">
    <div class="sp-step ${sel.colegioId ? 'done' : ''}"><div class="sp-step-num">1</div><div><div class="sp-step-title">Colegio</div><div class="sp-step-sub">Elige tu colegio</div></div></div>
    <div class="sp-step ${sel.nivelId ? 'done' : ''}"><div class="sp-step-num">2</div><div><div class="sp-step-title">Nivel</div><div class="sp-step-sub">Inicial, primaria, secundaria</div></div></div>
    <div class="sp-step ${sel.cursoId ? 'done' : ''}"><div class="sp-step-num">3</div><div><div class="sp-step-title">Curso</div><div class="sp-step-sub">Selecciona curso</div></div></div>
    <div class="sp-step ${sel.paraleloId ? 'done' : ''}"><div class="sp-step-num">4</div><div><div class="sp-step-title">Paralelo</div><div class="sp-step-sub">Selecciona paralelo</div></div></div>
  </div>
  <div class="sp-picker">
    <div class="sp-select-wrap">
      <div class="sp-label">Colegio</div>
      <select id="selColegio" class="sp-select">
        <option value="">Selecciona un colegio</option>
        ${opt(colegios)}
      </select>
    </div>
    <div class="sp-select-wrap">
      <div class="sp-label">Nivel</div>
      <select id="selNivel" class="sp-select" ${!sel.colegioId ? 'disabled' : ''}>
        <option value="">Selecciona un nivel</option>
        ${opt(niveles)}
      </select>
    </div>
    <div class="sp-select-wrap">
      <div class="sp-label">Curso</div>
      <select id="selCurso" class="sp-select" ${!sel.nivelId ? 'disabled' : ''}>
        <option value="">Selecciona un curso</option>
        ${opt(cursos)}
      </select>
    </div>
    <div class="sp-select-wrap">
      <div class="sp-label">Paralelo</div>
      <select id="selParalelo" class="sp-select" ${!sel.cursoId ? 'disabled' : ''}>
        <option value="">Selecciona un paralelo</option>
        ${opt(paralelos, 'id', 'nombre')}
      </select>
    </div>
    <div class="sp-actions-bar" style="grid-column: 1 / -1;">
      <button id="adminVer" class="tw-btn tw-btn-primary" ${!(sel.colegioId && sel.nivelId && sel.cursoId && sel.paraleloId) ? 'disabled' : ''}>Ver estudiantes</button>
    </div>
  </div>
</div>`;
}

function viewAdminStudents(estudiantes) {
    const rows = estudiantes.map(e => `<tr><td>${e.nombre_completo}</td></tr>`).join('');
    return `
<div class="sp-card">
  <div class="sp-toolbar">
    <div class="sp-title">Estudiantes</div>
    <div class="sp-row" style="gap:8px; flex-wrap:wrap">
      <input id="adminSearch" class="sp-input" placeholder="Buscar estudiante..." />
    </div>
  </div>
  <table class="sp-table"><thead><tr><th>Nombre</th></tr></thead><tbody id="adminBody">${rows}</tbody></table>
</div>`;
}

function bindCourseCards(gridEl, aulas, base) {
    gridEl.querySelectorAll('[data-aula-id]').forEach(card => {
        card.addEventListener('click', async () => {
            const aulaId = card.getAttribute('data-aula-id');
            try {
                const s = await getUiState(); const tri = s.trimestre || getDefaultTrimestre();
                const container = gridEl.parentElement; if (!container) return;
                render(container, skeletonGrades());
                const [estudiantes, notas] = await Promise.all([fetchEstudiantes(base, aulaId), fetchNotas(base, aulaId, tri)]);
                const aula = aulas.find(a => String(a.id) === String(aulaId)) || { id: aulaId };
                await setUiState({ view: 'grades', selectedAulaId: aulaId, trimestre: tri, search: '', sort: 'name' });
                render(container, viewGrades(aula, estudiantes, notas, tri, await getUiState()));
                setHeaderBackVisible(true);
                wireGrades(container, aulas, base, aula, estudiantes, notas);
            } catch { /* ignore */ }
        });
    });
}

function wireCourses(container, aulas, base, uiState) {
    // Setup search to update only grid
    const searchInput = container.querySelector('#searchInput');
    const grid = container.querySelector('#coursesGrid');
    if (searchInput && grid) {
        searchInput.addEventListener('input', async (e) => {
            const q = e.target.value;
            await setUiState({ search: q });
            const filtered = (q ? aulas.filter(a => `${a.nombre_aula || a.materia} ${a.curso || ''} ${a.paralelo || ''}`.toLowerCase().includes(q.toLowerCase())) : aulas);
            grid.innerHTML = filtered.map(courseCard).join('');
            bindCourseCards(grid, filtered, base);
        });
    }
    // Initial bind
    if (grid) bindCourseCards(grid, aulas, base);
}

function wireGrades(container, aulas, base, aula, estudiantes, notas) {
    // Back
    const goBack = async () => {
        await setUiState({ view: 'courses', selectedAulaId: null });
        render(container, viewCourses(aulas));
        wireCourses(container, aulas, base, await getUiState());
        setHeaderBackVisible(false);
    };
    const backBtn = container.querySelector('#backToCourses');
    if (backBtn) backBtn.addEventListener('click', goBack);
    wireHeaderBack(goBack);
    // Search (update only tbody)
    const search = container.querySelector('#gradesSearch');
    const body = container.querySelector('#gradesBody');
    const toggle = container.querySelector('#toggleSort');
    if (search && body) {
        search.addEventListener('input', async (e) => {
            const s = await setUiState({ search: e.target.value });
            body.innerHTML = computeGradesRows(estudiantes, notas, s);
        });
    }
    // Sort toggle (update only tbody + button label)
    if (toggle && body) {
        toggle.addEventListener('click', async () => {
            const cur = await getUiState(); const nextSort = cur.sort === 'name' ? 'grade' : 'name';
            const s = await setUiState({ sort: nextSort });
            toggle.textContent = s.sort === 'name' ? 'Orden: Nombre' : 'Orden: Nota';
            body.innerHTML = computeGradesRows(estudiantes, notas, s);
        });
    }
}

async function updateUi() {
    const base = await ensureDefaultBaseUrl();
    const content = $('content');
    const session = await fetchSession(base); const user = session && session.user ? session.user : null;
    if (!user) { await setUiState({ view: 'courses', selectedAulaId: null, trimestre: getDefaultTrimestre() }); setHeaderBackVisible(false); render(content, heroLogin()); $('heroLogin').addEventListener('click', () => { chrome.tabs.create({ url: new URL('/login', base).toString() }); }); return; }
    let uiState = await getUiState(); if (!uiState.trimestre) uiState = await setUiState({ trimestre: getDefaultTrimestre() });

    // If not admin, prompt to sign in as admin
    const isAdmin = Array.isArray(session?.user?.roles) && session.user.roles.includes('ADMIN');
    if (!isAdmin) {
        setHeaderBackVisible(false);
        render(content, viewAdminRequired());
        const go = document.getElementById('goLogin');
        if (go) go.addEventListener('click', () => { chrome.tabs.create({ url: new URL('/login', base).toString() }); });
        return;
    }

    // Always use admin flow
    try {
        setHeaderBackVisible(false);
        render(content, skeletonCourses());
        const [colegios, niveles, cursos, paralelos] = await Promise.all([
            fetchColegios(base), fetchNiveles(base), fetchCursos(base), fetchParalelos(base)
        ]);
        render(content, viewAdminPicker({ colegios, niveles, cursos, paralelos }, { colegioId: null, nivelId: null, cursoId: null, paraleloId: null }));
        wireAdminPicker(content, base);
        return;
    } catch { render(content, `<div class=\"sp-card\">No se pudieron cargar los datos.</div>`); }
}

function debounce(fn, wait) {
    let t;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    }
}

function getHostFromUrl(u) { try { return new URL(u).hostname.toLowerCase(); } catch { return ''; } }
function normalizeDomain(d) { return (d || '').replace(/^\./, '').toLowerCase(); }
function domainMatches(cookieDomain, baseHost) {
    const cd = normalizeDomain(cookieDomain), bh = (baseHost || '').toLowerCase();
    return cd === bh || bh.endsWith('.' + cd) || cd.endsWith('.' + bh);
}

const scheduleUpdate = debounce(() => { updateUi(); }, 300);

// Auto-detect session changes via cookie events and tab visibility
chrome.cookies.onChanged.addListener(async (changeInfo) => {
    const { cookie } = changeInfo || {};
    if (!cookie || cookie.name !== 'auth-token') return;
    const base = await ensureDefaultBaseUrl();
    const baseHost = getHostFromUrl(base);
    if (domainMatches(cookie.domain, baseHost)) {
        scheduleUpdate();
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleUpdate();
});

updateUi();

let navState = { view: 'picker', pickerContext: null, studentsContext: null };

function setHeaderBackVisible(visible) {
    const btn = document.getElementById('headerBack');
    if (!btn) return;
    btn.classList.toggle('hidden', !visible);
}

function wireHeaderBack(handler) {
    const btn = document.getElementById('headerBack');
    if (!btn) return;
    btn.onclick = null;
    btn.onkeydown = null;
    btn.replaceWith(btn.cloneNode(true));
    const fresh = document.getElementById('headerBack');
    fresh.onclick = handler;
    fresh.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') handler(e); };
}

function updateAdminPickerUI(container, sel) {
    const stepEls = container.querySelectorAll('.sp-step');
    if (stepEls[0]) stepEls[0].classList.toggle('done', !!sel.colegioId);
    if (stepEls[1]) stepEls[1].classList.toggle('done', !!sel.nivelId);
    if (stepEls[2]) stepEls[2].classList.toggle('done', !!sel.cursoId);
    if (stepEls[3]) stepEls[3].classList.toggle('done', !!sel.paraleloId);
    const nivel = container.querySelector('#selNivel');
    const curso = container.querySelector('#selCurso');
    const paralelo = container.querySelector('#selParalelo');
    if (nivel) nivel.disabled = !sel.colegioId;
    if (curso) curso.disabled = !sel.nivelId;
    if (paralelo) paralelo.disabled = !sel.cursoId;
    const btn = container.querySelector('#adminVer');
    if (btn) btn.disabled = !(sel.colegioId && sel.nivelId && sel.cursoId && sel.paraleloId);
}

function fetchCentralNotas(base, { colegioId, nivelId, cursoId, paraleloId }, trimestre) {
    const u = new URL('/api/central/notas', base);
    u.searchParams.set('colegio', String(colegioId));
    u.searchParams.set('nivel', String(nivelId));
    u.searchParams.set('curso', String(cursoId));
    u.searchParams.set('paralelo', String(paraleloId));
    u.searchParams.set('trimestre', String(trimestre));
    return fetchJson(u.toString());
}

function normalizeMateriaName(name) { return String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim(); }

function viewAdminStudents(estudiantes, materias, notas, filters) {
    const rows = estudiantes.map(e => `<tr data-estudiante-id="${e.id_estudiante}"><td>${e.nombre_completo}</td></tr>`).join('');
    const chips = [
        { k: 'Colegio', v: filters.colegioNombre || filters.colegioId },
        { k: 'Nivel', v: filters.nivelNombre || filters.nivelId },
        { k: 'Curso', v: filters.cursoNombre || filters.cursoId },
        { k: 'Paralelo', v: filters.paraleloNombre || filters.paraleloId },
    ].map(c => `<span class="sp-chip-tag"><span class="sp-chip-key">${c.k}:</span> ${c.v}</span>`).join('');
    return `
<div class="sp-card">
  <div class="sp-toolbar">
    <div>
      <div class="sp-title">Estudiantes</div>
      <div class="sp-subtle-12">Haz clic en un estudiante para ver sus notas por materia</div>
    </div>
    <div class="sp-row" style="gap:8px; flex-wrap:wrap">
      <input id="adminSearch" class="sp-input" placeholder="Buscar estudiante..." />
    </div>
  </div>
  <div class="sp-summary">${chips}</div>
  <table class="sp-table"><thead><tr><th>Nombre</th></tr></thead><tbody id="adminBody">${rows}</tbody></table>
</div>`;
}

async function fillNotasOnPage(estudiante, materias, notas) {
    try {
        const byEst = notas.filter(n => String(n.id_estudiante) === String(estudiante.id_estudiante));
        const idToNota = new Map(byEst.map(n => [String(n.id_materia), n.nota_final]));
        const materiaRecords = materias.map(m => {
            const id = String(m.id_materia || m.id);
            const name = (m.nombre_completo || m.nombre || '').toString();
            const norm = normalizeMateriaName(name).replace(/\u00a0/g, ' ');
            let base = norm.split(':')[0].trim();
            if (base.startsWith('tecnica tecnologica')) base = 'tecnica tecnologica';
            const rawNota = idToNota.get(id);
            const nota = (typeof rawNota === 'number') ? rawNota : parseFloat(String(rawNota ?? ''));
            return { id, name, norm, base, nota };
        }).filter(r => Number.isFinite(r.nota) && r.nota >= 0);

        console.log('[SIS-EXT] fillNotasOnPage: estudiante', estudiante?.id_estudiante, 'records', materiaRecords);

        await chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            const tabId = tabs[0]?.id;
            if (!tabId) { console.warn('[SIS-EXT] No active tab found'); return; }
            await chrome.scripting.executeScript({
                target: { tabId, allFrames: true },
                func: (records) => {
                    try {
                        const norm = (s) => String(s || '')
                            .replace(/\u00a0/g, ' ')
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .toLowerCase()
                            .replace(/[^a-z\s:]/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim();
                        const root = (b) => {
                            let x = String(b || '');
                            if (x.startsWith('tecnica tecnologica')) x = 'tecnica tecnologica';
                            return x;
                        };
                        const notaByBase = Object.fromEntries(records.map(r => [r.base, r.nota]));
                        const notaByNorm = Object.fromEntries(records.map(r => [r.norm, r.nota]));
                        const notaByRoot = Object.fromEntries(records.map(r => [root(r.base), r.nota]));
                        console.log('[SIS-EXT] Inject: records', records);
                        const updateDoc = (doc) => {
                            const rows = Array.from(doc.querySelectorAll('tbody tr'));
                            console.log('[SIS-EXT] Inject: rows found', rows.length, 'doc', doc === document ? 'main' : 'iframe');
                            rows.forEach((tr, idx) => {
                                try {
                                    let asignaturaTd = tr.querySelector('td[data-title="Asignatura"]');
                                    if (!asignaturaTd) asignaturaTd = tr.querySelector('td');
                                    if (!asignaturaTd) return;
                                    const raw = asignaturaTd.textContent;
                                    const rowNorm = norm(raw);
                                    let rowBase = rowNorm.split(':')[0].trim();
                                    const rowRoot = root(rowBase);
                                    const rowNormNoColon = rowNorm.replace(/:/g, ' ').replace(/\s+/g, ' ').trim();
                                    let valor = notaByBase[rowBase];
                                    if (!Number.isFinite(valor)) valor = notaByNorm[rowNormNoColon];
                                    if (!Number.isFinite(valor)) valor = notaByNorm[rowNorm];
                                    if (!Number.isFinite(valor)) valor = notaByRoot[rowRoot];
                                    if (!Number.isFinite(valor)) {
                                        const found = records.find(r => r.base.startsWith(rowBase) || rowBase.startsWith(r.base));
                                        if (found && Number.isFinite(found.nota)) valor = found.nota;
                                    }
                                    console.log('[SIS-EXT] Row', idx, { raw, rowNorm, rowNormNoColon, rowBase, rowRoot, valor });
                                    if (!Number.isFinite(valor)) return;
                                    let input = tr.querySelector('td[data-title*="Trimestre"] input[type="text"].nota');
                                    if (!input) input = tr.querySelector('input.nota[id$="-7"]');
                                    if (!input) { console.log('[SIS-EXT] No input found for row', idx); return; }
                                    input.value = String(valor);
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                    input.dispatchEvent(new Event('change', { bubbles: true }));
                                    input.dispatchEvent(new Event('keyup', { bubbles: true }));
                                    input.dispatchEvent(new Event('blur', { bubbles: true }));
                                    console.log('[SIS-EXT] Set value on input', input.id || '(no id)', 'valor', valor);
                                } catch (e) { console.error('[SIS-EXT] Row error', idx, e); }
                            });
                        };
                        updateDoc(document);
                        const iframes = Array.from(document.querySelectorAll('iframe'));
                        for (const frame of iframes) {
                            try { if (frame.contentDocument) updateDoc(frame.contentDocument); } catch (e) { console.warn('[SIS-EXT] Cannot access iframe (cross-origin)'); }
                        }
                    } catch (e) { console.error('[SIS-EXT] Inject error', e); }
                },
                args: [materiaRecords]
            });
        });
    } catch (e) { console.error('[SIS-EXT] fillNotasOnPage error', e); }
}

function viewStudentDetail(estudiante, materias, notas, filters, trimestre) {
    const byEst = notas.filter(n => String(n.id_estudiante) === String(estudiante.id_estudiante));
    const notaMap = new Map(byEst.map(n => [String(n.id_materia), n.nota_final]));
    const rows = materias.map(m => {
        const val = notaMap.has(String(m.id_materia || m.id)) ? notaMap.get(String(m.id_materia || m.id)) : '-';
        let cls = 'grade-neutral';
        const num = parseFloat(val);
        if (!isNaN(num)) { if (num >= 85) cls = 'grade-good'; else if (num >= 60) cls = 'grade-warn'; else cls = 'grade-bad'; }
        return `<tr><td>${m.nombre_completo || m.nombre}</td><td style="text-align:right"><span class="grade-badge ${cls}">${val}</span></td></tr>`;
    }).join('');
    const chips = [
        { k: 'Estudiante', v: estudiante.nombre_completo },
        { k: 'Trimestre', v: String(trimestre) },
    ].map(c => `<span class="sp-chip-tag"><span class="sp-chip-key">${c.k}:</span> ${c.v}</span>`).join('');
    return `
<div class="sp-card">
  <div class="sp-toolbar">
    <div>
      <div class="sp-title">Notas por materia</div>
      <div class="sp-subtle-12">Detalle del estudiante seleccionado</div>
    </div>
    <div class="sp-row" style="gap:8px; flex-wrap:wrap">
      <button id="injectNotes" class="tw-btn tw-btn-primary">Cargar Notas</button>
    </div>
  </div>
  <div class="sp-summary">${chips}</div>
  <table class="sp-table"><thead><tr><th>Materia</th><th style="text-align:right">Nota</th></tr></thead><tbody>${rows}</tbody></table>
</div>`;
}

function wireAdminStudents(container, estudiantes, base, filters, materias, notas) {
    const input = container.querySelector('#adminSearch');
    const body = container.querySelector('#adminBody');
    // Save context for back navigation
    navState.view = 'students';
    navState.studentsContext = { estudiantes, base, filters, materias, notas };
    const renderRows = (list) => { body.innerHTML = list.map(e => `<tr data-estudiante-id="${e.id_estudiante}"><td>${e.nombre_completo}</td></tr>`).join(''); bindRows(); };
    function bindRows() {
        container.querySelectorAll('[data-estudiante-id]').forEach(row => {
            row.addEventListener('click', () => {
                const id = row.getAttribute('data-estudiante-id');
                container.querySelectorAll('[data-estudiante-id]').forEach(r => r.classList.remove('sp-selected'));
                row.classList.add('sp-selected');
                const est = estudiantes.find(x => String(x.id_estudiante) === String(id));
                if (!est) return;
                setHeaderBackVisible(true);
                render(container, viewStudentDetail(est, materias, notas, filters, getDefaultTrimestre()));
                // Set nav state for returning to students list
                navState.view = 'studentDetail';
                navState.studentsContext = { estudiantes, base, filters, materias, notas };
                const injectBtnDetail = container.querySelector('#injectNotes');
                if (injectBtnDetail) injectBtnDetail.addEventListener('click', async () => { await fillNotasOnPage(est, materias, notas); });
                wireHeaderBack(() => {
                    setHeaderBackVisible(true);
                    const ctx = navState.studentsContext;
                    if (ctx) {
                        render(container, viewAdminStudents(ctx.estudiantes, ctx.materias, ctx.notas, ctx.filters));
                        wireAdminStudents(container, ctx.estudiantes, ctx.base, ctx.filters, ctx.materias, ctx.notas);
                        // After returning to students list, set back to picker
                        wireHeaderBack(async () => {
                            setHeaderBackVisible(false);
                            render(container, viewAdminPicker({ colegios: await fetchColegios(ctx.base), niveles: await fetchNiveles(ctx.base), cursos: await fetchCursos(ctx.base), paralelos: await fetchParalelos(ctx.base) }, ctx.filters));
                            wireAdminPicker(container, ctx.base, ctx.filters);
                        });
                    }
                });
            });
        });
    }
    if (input && body) {
        input.addEventListener('input', (e) => {
            const q = (e.target.value || '').toLowerCase();
            const filtered = q ? estudiantes.filter(e => e.nombre_completo.toLowerCase().includes(q)) : estudiantes;
            renderRows(filtered);
        });
    }
    bindRows();
}

function wireAdminPicker(container, base, initialSel) {
    const sel = { colegioId: null, nivelId: null, cursoId: null, paraleloId: null };
    const selInit = initialSel || {};
    const selectColegio = container.querySelector('#selColegio');
    const selectNivel = container.querySelector('#selNivel');
    const selectCurso = container.querySelector('#selCurso');
    const selectParalelo = container.querySelector('#selParalelo');
    const btnVer = container.querySelector('#adminVer');
    const onChange = () => updateAdminPickerUI(container, sel);
    navState.view = 'picker';
    navState.pickerContext = { sel };
    if (selectColegio) selectColegio.addEventListener('change', (e) => { sel.colegioId = e.target.value || null; sel.colegioNombre = e.target.options[e.target.selectedIndex]?.text || ''; onChange(); });
    if (selectNivel) selectNivel.addEventListener('change', (e) => { sel.nivelId = e.target.value || null; sel.nivelNombre = e.target.options[e.target.selectedIndex]?.text || ''; onChange(); });
    if (selectCurso) selectCurso.addEventListener('change', (e) => { sel.cursoId = e.target.value || null; sel.cursoNombre = e.target.options[e.target.selectedIndex]?.text || ''; onChange(); });
    if (selectParalelo) selectParalelo.addEventListener('change', (e) => { sel.paraleloId = e.target.value || null; sel.paraleloNombre = e.target.options[e.target.selectedIndex]?.text || ''; onChange(); });
    if (btnVer) btnVer.addEventListener('click', async () => {
        try {
            render(container, skeletonGrades());
            const tri = getDefaultTrimestre();
            const data = await fetchCentralNotas(base, sel, tri);
            const estudiantes = data.estudiantes || [];
            const materias = data.materias || [];
            const notas = data.notas || [];
            const filters = { ...sel };
            setHeaderBackVisible(true);
            render(container, viewAdminStudents(estudiantes, materias, notas, filters));
            wireAdminStudents(container, estudiantes, base, filters, materias, notas);
            wireHeaderBack(async () => {
                setHeaderBackVisible(false);
                render(container, viewAdminPicker({ colegios: await fetchColegios(base), niveles: await fetchNiveles(base), cursos: await fetchCursos(base), paralelos: await fetchParalelos(base) }, sel));
                wireAdminPicker(container, base, sel);
            });
        } catch { render(container, `<div class=\"sp-card\">No se pudieron cargar estudiantes.</div>`); }
    });
    updateAdminPickerUI(container, sel);
} 