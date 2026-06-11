const stateMap = {
  now: { listId: 'now-list', label: 'Teď' },
  later: { listId: 'later-list', label: 'Později' },
  done: { listId: 'done-list', label: 'Hotovo' },
};

const config = window.DRZKROK_CONFIG || {};
const apiBaseUrl = (config.apiBaseUrl || '').replace(/\/$/, '');
const shouldUseBackend = config.useBackend !== false;
const message = document.querySelector('#message');
const projectOverview = document.querySelector('#project-overview');
const projectSubtitle = document.querySelector('#project-subtitle');
const archive = document.querySelector('#archive');

let dashboardData = null;
let activeProject = null;
let editMode = false;
let saveTimer = null;

function setMessage(text, type = 'info') {
  message.textContent = text;
  message.className = `message is-visible${type === 'error' ? ' is-error' : ''}`;
}

function clearMessage() {
  message.textContent = '';
  message.className = 'message';
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getTextFromEditable(element) {
  return element.textContent.trim();
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function renderEditableText(value, path, className = '') {
  if (!editMode) return escapeHtml(value || '');
  return `<span class="editable ${className}" contenteditable="true" spellcheck="false" data-edit-path="${path}">${escapeHtml(value || '')}</span>`;
}

function renderEditableTextarea(value, path, placeholder = '') {
  return `
    <textarea class="inline-textarea" data-edit-path="${path}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value || '')}</textarea>
  `;
}

function renderLinks(links = [], path = '') {
  if (editMode && path) {
    return `
      <textarea class="inline-textarea inline-json" data-edit-path="${path}" aria-label="Odkazy jako JSON">${escapeHtml(JSON.stringify(Array.isArray(links) ? links : [], null, 2))}</textarea>
      <p class="edit-hint">Odkazy nech jako JSON: [{"label":"Název","url":"https://..."}]</p>
    `;
  }

  if (!Array.isArray(links) || links.length === 0) {
    return '<p class="empty-links">Žádné odkazy.</p>';
  }

  const items = links
    .filter((link) => link && link.url)
    .map((link) => {
      const href = escapeHtml(link.url);
      const label = escapeHtml(link.label || link.url);
      return `<li><a href="${href}" target="_blank" rel="noreferrer">${label}</a></li>`;
    })
    .join('');

  return items ? `<ul class="links">${items}</ul>` : '<p class="empty-links">Žádné odkazy.</p>';
}

function renderImages(images = []) {
  if (editMode) {
    return `
      <textarea class="inline-textarea inline-json media-json" data-edit-path="project.images" aria-label="Obrázky jako JSON">${escapeHtml(JSON.stringify(Array.isArray(images) ? images : [], null, 2))}</textarea>
      <p class="edit-hint">Obrázek nahraješ tlačítkem „Upravit“ vpravo dole. Výsledek se sem dá vložit jako JSON.</p>
    `;
  }

  if (!Array.isArray(images) || images.length === 0) {
    return '<p class="empty-links">Zatím žádné obrázky ani screenshoty.</p>';
  }

  const items = images
    .filter((image) => image && image.url)
    .map((image) => {
      const url = escapeHtml(image.url);
      const label = escapeHtml(image.label || 'Obrázek');
      const note = image.note ? `<p>${escapeHtml(image.note)}</p>` : '';
      return `
        <a class="image-card" href="${url}" target="_blank" rel="noreferrer">
          <img src="${url}" alt="${label}" loading="lazy" />
          <span>${label}</span>
          ${note}
        </a>
      `;
    })
    .join('');

  return items ? `<div class="image-grid">${items}</div>` : '<p class="empty-links">Zatím žádné obrázky ani screenshoty.</p>';
}

function renderMap(map = {}) {
  if (editMode) {
    return `
      <label class="inline-label">Popisek mapy<input data-edit-path="project.map.label" value="${escapeHtml(map.label || '')}" /></label>
      <label class="inline-label">Odkaz na mapu<input data-edit-path="project.map.url" value="${escapeHtml(map.url || '')}" /></label>
      <label class="inline-label">Embed mapa / iframe src<input data-edit-path="project.map.embedUrl" value="${escapeHtml(map.embedUrl || '')}" /></label>
    `;
  }

  const label = escapeHtml(map.label || 'Mapa');
  const url = map.url ? escapeHtml(map.url) : '';
  const embedUrl = map.embedUrl ? escapeHtml(map.embedUrl) : '';

  if (embedUrl) {
    return `
      <div class="map-card">
        <iframe title="${label}" src="${embedUrl}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        ${url ? `<a href="${url}" target="_blank" rel="noreferrer">Otevřít mapu</a>` : ''}
      </div>
    `;
  }

  if (url) {
    return `<a class="map-link" href="${url}" target="_blank" rel="noreferrer">${label}</a>`;
  }

  return '<p class="empty-links">Mapa zatím není doplněná.</p>';
}

function createCard(item, index) {
  const card = document.createElement('article');
  card.className = `item-card${editMode ? ' is-editing is-open' : ''}`;

  const detailId = `detail-${index}`;
  const titleHtml = renderEditableText(item.title || 'Bez názvu', `item.${index}.title`, 'item-title-edit');
  const statusHtml = renderEditableText(item.status || 'klid', `item.${index}.status`);
  const categoryHtml = renderEditableText(item.category || 'projekt', `item.${index}.category`);
  const toggleTag = editMode ? 'div' : 'button';
  const toggleAttributes = editMode
    ? `class="item-toggle" aria-controls="${detailId}"`
    : `class="item-toggle" type="button" aria-expanded="false" aria-controls="${detailId}"`;

  card.innerHTML = `
    <${toggleTag} ${toggleAttributes}>
      <div class="item-topline">
        <h3 class="item-title">${titleHtml}</h3>
        <span class="item-status">${statusHtml}</span>
      </div>
      <p class="item-category">${categoryHtml}</p>
    </${toggleTag}>
    <div id="${detailId}" class="item-detail">
      <div class="detail-grid">
        <div>
          <span class="detail-label">Stav</span>
          ${editMode ? renderEditableTextarea(item.state, `item.${index}.state`, 'Stav') : `<p class="detail-text">${escapeHtml(item.state || 'bez stavu')}</p>`}
        </div>
        <div>
          <span class="detail-label">Další krok</span>
          ${editMode ? renderEditableTextarea(item.next, `item.${index}.next`, 'Další krok') : `<p class="detail-text">${escapeHtml(item.next || 'Žádný další krok.')}</p>`}
        </div>
        <div>
          <span class="detail-label">Poznámka</span>
          ${editMode ? renderEditableTextarea(item.note, `item.${index}.note`, 'Poznámka') : `<p class="detail-text">${escapeHtml(item.note || 'Bez poznámky.')}</p>`}
        </div>
        <div>
          <span class="detail-label">Odkazy</span>
          ${renderLinks(item.links, `item.${index}.links`)}
        </div>
        ${editMode ? `
          <div>
            <span class="detail-label">Sloupec</span>
            <select data-edit-path="item.${index}.stateGroup">
              ${Object.entries(stateMap).map(([value, group]) => `<option value="${value}"${item.stateGroup === value ? ' selected' : ''}>${group.label}</option>`).join('')}
            </select>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  if (!editMode) {
    const button = card.querySelector('.item-toggle');
    button.addEventListener('click', () => {
      const isOpen = card.classList.toggle('is-open');
      button.setAttribute('aria-expanded', String(isOpen));
    });
  }

  return card;
}

function renderBoard(items = []) {
  Object.values(stateMap).forEach(({ listId }) => {
    document.querySelector(`#${listId}`).replaceChildren();
  });

  items.forEach((item, index) => {
    const target = stateMap[item.stateGroup];
    if (!target) return;

    document.querySelector(`#${target.listId}`).append(createCard(item, index));
  });
}

function getActiveProject(data) {
  const projects = Array.isArray(data.projects) ? data.projects : [];
  return projects.find((project) => project.id === data.activeProjectId) || projects.find((project) => project.status === 'active') || projects[0];
}

function renderProject(project) {
  document.title = `${project.title || 'Projekt'} | Drž krok`;
  projectSubtitle.innerHTML = renderEditableText(project.subtitle || 'Jeden projekt. Žádný plánovač.', 'project.subtitle');

  projectOverview.innerHTML = `
    <article class="project-card${editMode ? ' is-editing' : ''}">
      <div class="project-main">
        <p class="eyebrow">aktivní projekt</p>
        <h2>${renderEditableText(project.title || 'Bez názvu', 'project.title')}</h2>
        ${editMode ? renderEditableTextarea(project.summary, 'project.summary', 'Krátký popis projektu') : `<p class="project-summary">${escapeHtml(project.summary || '')}</p>`}
        <div class="project-meta">
          ${editMode ? `
            <label class="inline-label">Termín<input data-edit-path="project.dateRange" value="${escapeHtml(project.dateRange || '')}" /></label>
            <label class="inline-label">Místo<input data-edit-path="project.place" value="${escapeHtml(project.place || '')}" /></label>
          ` : `
            ${project.dateRange ? `<span>${escapeHtml(project.dateRange)}</span>` : ''}
            ${project.place ? `<span>${escapeHtml(project.place)}</span>` : ''}
          `}
        </div>
      </div>
      <div class="project-side">
        <section>
          <h3>Mapa</h3>
          ${renderMap(project.map)}
        </section>
        <section>
          <h3>Rychlé odkazy</h3>
          ${renderLinks(project.links, 'project.links')}
        </section>
      </div>
    </article>
    <section class="media-section" aria-labelledby="images-title">
      <div class="section-head">
        <h2 id="images-title">Obrázky / screenshoty</h2>
        <span class="column-note">rychlé vizuální poznámky</span>
      </div>
      ${renderImages(project.images)}
    </section>
  `;

  renderBoard(project.items);
  bindInlineEditing();
}

function renderArchive(data) {
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const archived = projects.filter((project) => project.id !== data.activeProjectId && project.status !== 'active');

  if (archived.length === 0) {
    archive.innerHTML = '';
    return;
  }

  const items = archived
    .map((project) => `
      <article class="archive-item">
        <h3>${escapeHtml(project.title || 'Bez názvu')}</h3>
        <p>${escapeHtml(project.dateRange || 'Archiv')}</p>
        <p>${escapeHtml(project.summary || '')}</p>
      </article>
    `)
    .join('');

  archive.innerHTML = `
    <details>
      <summary>Archiv projektů (${archived.length})</summary>
      <div class="archive-list">${items}</div>
    </details>
  `;
}

function validateData(data, sourceName) {
  if (!Array.isArray(data.projects)) {
    throw new Error(`${sourceName} nemá pole "projects".`);
  }

  const project = getActiveProject(data);

  if (!project) {
    throw new Error(`${sourceName} neobsahuje žádný projekt.`);
  }

  if (!Array.isArray(project.items)) project.items = [];
  if (!Array.isArray(project.links)) project.links = [];
  if (!Array.isArray(project.images)) project.images = [];
  if (!project.map) project.map = { label: '', url: '', embedUrl: '' };

  return data;
}

async function fetchJson(url, sourceName, options = {}) {
  const response = await fetch(url, { cache: 'no-store', credentials: 'include', ...options });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${sourceName} vrátil stav ${response.status}${text ? `: ${text}` : ''}`);
  }

  return response.json();
}

async function loadFromApi() {
  const data = await fetchJson(`${apiBaseUrl}/api/dashboard`, 'Backend');
  return validateData(data, 'Backend');
}

async function loadFromLocalFile() {
  const data = await fetchJson('data.json', 'Soubor data.json');
  return validateData(data, 'Soubor data.json');
}

function refreshDashboard(data) {
  dashboardData = data;
  activeProject = getActiveProject(data);
  renderProject(activeProject);
  renderArchive(data);
}

async function loadDashboard() {
  setMessage('Načítám projekt…');

  try {
    const data = shouldUseBackend ? await loadFromApi() : await loadFromLocalFile();
    refreshDashboard(data);
    clearMessage();
  } catch (error) {
    try {
      const data = await loadFromLocalFile();
      refreshDashboard(data);
      setMessage(`Backend teď neodpovídá, ukazuju záložní data.json. Detail: ${error.message}`);
    } catch (fallbackError) {
      setMessage(`Dashboard se nepodařilo načíst. Detail: ${error.message} / ${fallbackError.message}`, 'error');
    }
  }
}

function applyEdit(path, value, isJson = false) {
  if (!activeProject) return;

  const finalValue = isJson ? safeJsonParse(value, null) : value;
  if (isJson && finalValue === null) return;

  if (path.startsWith('project.')) {
    const keys = path.replace('project.', '').split('.');
    let target = activeProject;
    while (keys.length > 1) {
      const key = keys.shift();
      if (!target[key]) target[key] = {};
      target = target[key];
    }
    target[keys[0]] = finalValue;
    return;
  }

  if (path.startsWith('item.')) {
    const [, indexText, key] = path.split('.');
    const item = activeProject.items[Number(indexText)];
    if (!item) return;
    item[key] = finalValue;
  }
}

function bindInlineEditing() {
  if (!editMode) return;

  document.querySelectorAll('[data-edit-path]').forEach((element) => {
    const eventName = element.matches('select') ? 'change' : 'input';
    element.addEventListener(eventName, () => {
      const path = element.dataset.editPath;
      const value = element.isContentEditable ? getTextFromEditable(element) : element.value;
      applyEdit(path, value, element.classList.contains('inline-json'));
      if (path.endsWith('stateGroup')) renderProject(activeProject);
    });
  });
}

function createInlineEditor() {
  const panel = document.createElement('section');
  panel.className = 'quick-editor';
  panel.innerHTML = `
    <button class="quick-edit-toggle" type="button">Upravit</button>
    <div class="quick-edit-panel" hidden>
      <h2>Rychlá úprava</h2>
      <p>Zapni úpravy, klikni do textu na stránce, přepiš ho a ulož.</p>
      <label>Backend URL<input id="quick-api-url" value="${escapeHtml(apiBaseUrl)}" placeholder="prázdné = stejná doména" /></label>
      <label>Uživatelské jméno<input id="quick-username" autocomplete="username" placeholder="admin" /></label>
      <label>Heslo<input id="quick-password" type="password" autocomplete="current-password" /></label>
      <div class="quick-actions">
        <button id="quick-login" type="button">Přihlásit</button>
        <button id="quick-edit-mode" type="button">Zapnout úpravy</button>
        <button id="quick-save" type="button">Uložit</button>
      </div>
      <details>
        <summary>Nahrát obrázek</summary>
        <label>Popisek<input id="quick-image-label" placeholder="Screenshot ubytování" /></label>
        <input id="quick-image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
        <button id="quick-upload" type="button">Nahrát a přidat do projektu</button>
      </details>
      <p class="edit-hint">Ukládá se jen Backend URL a uživatelské jméno. Heslo se neukládá.</p>
    </div>
  `;
  document.body.append(panel);

  const toggle = panel.querySelector('.quick-edit-toggle');
  const editPanel = panel.querySelector('.quick-edit-panel');
  const loginButton = panel.querySelector('#quick-login');
  const modeButton = panel.querySelector('#quick-edit-mode');
  const saveButton = panel.querySelector('#quick-save');
  const uploadButton = panel.querySelector('#quick-upload');
  const usernameInput = panel.querySelector('#quick-username');
  const apiInput = panel.querySelector('#quick-api-url');

  usernameInput.value = localStorage.getItem('drzkrokInlineUsername') || '';
  apiInput.value = localStorage.getItem('drzkrokInlineApiUrl') || apiBaseUrl;

  toggle.addEventListener('click', () => {
    editPanel.hidden = !editPanel.hidden;
  });

  loginButton.addEventListener('click', async () => {
    await loginEditor(panel);
  });

  modeButton.addEventListener('click', () => {
    editMode = !editMode;
    modeButton.textContent = editMode ? 'Vypnout úpravy' : 'Zapnout úpravy';
    document.body.classList.toggle('editing', editMode);
    if (dashboardData) refreshDashboard(dashboardData);
  });

  saveButton.addEventListener('click', async () => {
    await saveDashboard(panel);
  });

  uploadButton.addEventListener('click', async () => {
    await uploadImage(panel);
  });
}

function getEditorApiBase(panel) {
  const value = panel.querySelector('#quick-api-url').value.trim().replace(/\/$/, '');
  localStorage.setItem('drzkrokInlineApiUrl', value);
  return value;
}

function getEditorUsername(panel) {
  const username = panel.querySelector('#quick-username').value.trim();
  localStorage.setItem('drzkrokInlineUsername', username);
  return username;
}

async function loginEditor(panel) {
  setMessage('Přihlašuju…');

  try {
    const base = getEditorApiBase(panel);
    const username = getEditorUsername(panel);
    const password = panel.querySelector('#quick-password').value;

    if (!username || !password) {
      throw new Error('Vyplň uživatelské jméno i heslo.');
    }

    await fetchJson(`${base}/api/login`, 'Přihlášení', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    setMessage('Přihlášeno. Teď můžeš upravovat, ukládat a nahrávat obrázky.');
  } catch (error) {
    setMessage(`Přihlášení selhalo: ${error.message}`, 'error');
  }
}

async function saveDashboard(panel) {
  clearTimeout(saveTimer);
  setMessage('Ukládám změny…');

  try {
    const base = getEditorApiBase(panel);
    const saved = await fetchJson(`${base}/api/dashboard`, 'Backend', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dashboardData),
    });

    refreshDashboard(validateData(saved, 'Backend'));
    setMessage('Uloženo.');
    saveTimer = setTimeout(clearMessage, 2000);
  } catch (error) {
    setMessage(`Uložení selhalo: ${error.message}`, 'error');
  }
}

async function uploadImage(panel) {
  setMessage('Nahrávám obrázek…');

  try {
    const fileInput = panel.querySelector('#quick-image-file');
    const file = fileInput.files[0];
    if (!file) throw new Error('Vyber obrázek nebo screenshot.');

    const formData = new FormData();
    formData.append('image', file);
    formData.append('label', panel.querySelector('#quick-image-label').value.trim() || file.name);

    const base = getEditorApiBase(panel);
    const result = await fetchJson(`${base}/api/uploads`, 'Upload', {
      method: 'POST',
      body: formData,
    });

    activeProject.images = Array.isArray(activeProject.images) ? activeProject.images : [];
    activeProject.images.push({ label: result.label, url: result.url, note: '' });
    refreshDashboard(dashboardData);
    setMessage('Obrázek nahraný a přidaný do projektu. Nezapomeň kliknout Uložit.');
  } catch (error) {
    setMessage(`Upload selhal: ${error.message}`, 'error');
  }
}

createInlineEditor();
loadDashboard();
