const STORAGE_KEY = 'drzkrok-dashboard-data';

const stateMap = {
  now: { listId: 'now-list', label: 'Teď' },
  later: { listId: 'later-list', label: 'Později' },
  done: { listId: 'done-list', label: 'Hotovo' },
};

const pageShell = document.querySelector('.page-shell') || document.body;
const board = document.querySelector('.board');
const message = document.querySelector('#message') || createMissingElement('div', {
  id: 'message',
  className: 'message',
  role: 'status',
  ariaLive: 'polite',
  before: board,
});
const projectOverview = document.querySelector('#project-overview') || createMissingElement('section', {
  id: 'project-overview',
  className: 'project-overview',
  ariaLabel: 'Přehled aktivního projektu',
  before: board,
});
const archive = document.querySelector('#archive') || createMissingElement('section', {
  id: 'archive',
  className: 'archive',
  ariaLabel: 'Archiv projektů',
});

let dashboardData = null;
let activeProject = null;
let editMode = false;
let saveTimer = null;
let quickEditorPanel = null;

function createMissingElement(tagName, options = {}) {
  const element = document.createElement(tagName);

  if (options.id) element.id = options.id;
  if (options.className) element.className = options.className;
  if (options.role) element.setAttribute('role', options.role);
  if (options.ariaLive) element.setAttribute('aria-live', options.ariaLive);
  if (options.ariaLabel) element.setAttribute('aria-label', options.ariaLabel);

  if (options.before && options.before.parentElement) {
    options.before.parentElement.insertBefore(element, options.before);
  } else {
    pageShell.append(element);
  }

  return element;
}

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

function normalizeUrl(url = '') {
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  if (/^(https?:|mailto:|tel:|data:|blob:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function slugify(value = 'projekt') {
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'projekt';
}

function createProjectId(title) {
  const existingIds = new Set((dashboardData?.projects || []).map((project) => project.id));
  const baseId = slugify(title);
  let candidate = baseId;
  let counter = 2;

  while (existingIds.has(candidate)) {
    candidate = `${baseId}-${counter}`;
    counter += 1;
  }

  return candidate;
}

function ensureProjectShape(project) {
  if (!Array.isArray(project.items)) project.items = [];
  if (!Array.isArray(project.links)) project.links = [];
  if (!Array.isArray(project.images)) project.images = [];
  if (!project.map) project.map = { label: '', url: '', embedUrl: '' };
  return project;
}

function renderEditableText(value, path, className = '') {
  if (!editMode) return escapeHtml(value || '');
  return `<span class="editable ${className}" contenteditable="true" spellcheck="false" data-edit-path="${path}">${escapeHtml(value || '')}</span>`;
}

function renderEditableTextarea(value, path, placeholder = '') {
  return `<textarea class="inline-textarea" data-edit-path="${path}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value || '')}</textarea>`;
}

function getLinksByOwner(owner) {
  if (!activeProject) return [];

  if (owner === 'project') {
    activeProject.links = Array.isArray(activeProject.links) ? activeProject.links : [];
    return activeProject.links;
  }

  if (owner.startsWith('item.')) {
    const [, itemIndexText] = owner.split('.');
    const item = activeProject.items?.[Number(itemIndexText)];
    if (!item) return [];
    item.links = Array.isArray(item.links) ? item.links : [];
    return item.links;
  }

  return [];
}

function renderLinkEditor(links = [], owner = '') {
  const editableLinks = Array.isArray(links) ? links : [];
  const rows = editableLinks
    .map((link, index) => {
      const label = escapeHtml(link.label || '');
      const url = escapeHtml(link.url || '');

      return `
        <article class="link-edit-card">
          <label class="inline-label">Název<input data-edit-path="link.${owner}.${index}.label" value="${label}" placeholder="Google Maps" /></label>
          <label class="inline-label">Odkaz<input data-edit-path="link.${owner}.${index}.url" value="${url}" placeholder="https://..." /></label>
          <button class="small-danger-button" type="button" data-remove-link="${owner}" data-link-index="${index}">Smazat odkaz</button>
        </article>
      `;
    })
    .join('');

  return `
    <div class="link-edit-list">
      ${rows || '<p class="empty-links">Zatím žádné odkazy.</p>'}
      <button class="small-secondary-button" type="button" data-add-link="${owner}">Přidat odkaz</button>
    </div>
  `;
}

function renderLinks(links = [], path = '') {
  if (editMode && path) {
    const owner = path === 'project.links' ? 'project' : path.replace(/^item\.(\d+)\.links$/, 'item.$1');
    return renderLinkEditor(links, owner);
  }

  if (!Array.isArray(links) || links.length === 0) {
    return '<p class="empty-links">Žádné odkazy.</p>';
  }

  const items = links
    .filter((link) => link && link.url)
    .map((link) => {
      const href = escapeHtml(normalizeUrl(link.url));
      const label = escapeHtml(link.label || link.url);
      return `<li><a href="${href}" target="_blank" rel="noreferrer">${label}</a></li>`;
    })
    .join('');

  return items ? `<ul class="links">${items}</ul>` : '<p class="empty-links">Žádné odkazy.</p>';
}

function renderImages(images = []) {
  if (editMode) {
    const editableImages = Array.isArray(images) ? images : [];
    const imageEditor = editableImages
      .map((image, index) => {
        const url = escapeHtml(image.url || '');
        const label = escapeHtml(image.label || 'Obrázek');
        const note = escapeHtml(image.note || '');

        return `
          <article class="image-edit-card">
            ${url ? `<img src="${url}" alt="${label}" loading="lazy" />` : '<div class="image-placeholder">Bez náhledu</div>'}
            <label class="inline-label">Popisek<input data-edit-path="image.${index}.label" value="${label}" /></label>
            <label class="inline-label">Poznámka<input data-edit-path="image.${index}.note" value="${note}" /></label>
            <label class="inline-label">URL<input data-edit-path="image.${index}.url" value="${url}" /></label>
            <button class="small-danger-button" type="button" data-remove-image="${index}">Smazat z projektu</button>
          </article>
        `;
      })
      .join('');

    return `
      ${imageEditor ? `<div class="image-edit-grid">${imageEditor}</div>` : '<p class="empty-links">Zatím žádné obrázky ani screenshoty.</p>'}
      <p class="edit-hint">Obrázek přidáš v panelu „Upravit“. Po kliknutí na „Uložit“ zůstane uložený v tomhle prohlížeči.</p>
    `;
  }

  if (!Array.isArray(images) || images.length === 0) {
    return '<p class="empty-links">Zatím žádné obrázky ani screenshoty.</p>';
  }

  const items = images
    .filter((image) => image && image.url)
    .map((image) => {
      const url = escapeHtml(normalizeUrl(image.url));
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
  const url = map.url ? escapeHtml(normalizeUrl(map.url)) : '';
  const embedUrl = map.embedUrl ? escapeHtml(normalizeUrl(map.embedUrl)) : '';

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
          <div>
            <span class="detail-label">Úkol</span>
            <button class="small-danger-button" type="button" data-remove-item="${index}">Smazat úkol</button>
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

  if (editMode) {
    Object.entries(stateMap).forEach(([stateGroup, { listId, label }]) => {
      const addButton = document.createElement('button');
      addButton.className = 'add-item-button';
      addButton.type = 'button';
      addButton.dataset.addItem = stateGroup;
      addButton.textContent = `Přidat do ${label}`;
      document.querySelector(`#${listId}`).append(addButton);
    });
  }
}

function getActiveProject(data) {
  const projects = Array.isArray(data.projects) ? data.projects : [];
  return projects.find((project) => project.id === data.activeProjectId) || projects.find((project) => project.status === 'active') || projects[0];
}

function renderProjectSwitcher(data) {
  const projects = Array.isArray(data?.projects) ? data.projects : [];

  if (projects.length <= 1 && !editMode) return '';

  const canDelete = editMode && projects.length > 1;
  const buttons = projects
    .map((project) => {
      const isActive = project.id === data.activeProjectId;
      const statusLabel = isActive ? 'otevřený' : (project.status === 'archived' ? 'uložený' : 'další');
      const title = escapeHtml(project.title || 'Bez názvu');
      return `
        <div class="project-tab-row">
          <button class="project-tab${isActive ? ' is-active' : ''}" type="button" data-switch-project="${escapeHtml(project.id)}" aria-pressed="${isActive}">
            <span>${title}</span>
            <small>${escapeHtml(project.dateRange || statusLabel)}</small>
          </button>
          ${editMode ? `<button class="project-delete-button" type="button" data-delete-project="${escapeHtml(project.id)}"${canDelete ? '' : ' disabled'} aria-label="Smazat projekt ${title}">×</button>` : ''}
        </div>
      `;
    })
    .join('');

  return `
    <section class="project-switcher" aria-label="Přepínač projektů">
      <div class="project-tabs">${buttons}</div>
    </section>
  `;
}

function renderProject(project) {
  document.title = `${project.title || 'Projekt'} | Drž krok`;

  projectOverview.innerHTML = `
    ${renderProjectSwitcher(dashboardData)}
    <article class="project-card${editMode ? ' is-editing' : ''}">
      <div class="project-main">
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

  data.projects.forEach(ensureProjectShape);

  const project = getActiveProject(data);
  if (!project) {
    throw new Error(`${sourceName} neobsahuje žádný projekt.`);
  }

  data.activeProjectId = project.id;
  return data;
}

async function fetchJson(url, sourceName) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${sourceName} vrátil stav ${response.status}.`);
  }
  return response.json();
}

async function loadFromLocalFile() {
  const data = await fetchJson('data.json', 'Soubor data.json');
  return validateData(data, 'Soubor data.json');
}

function loadFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  return validateData(JSON.parse(stored), 'LocalStorage');
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboardData));
}

function refreshDashboard(data) {
  dashboardData = data;
  activeProject = getActiveProject(data);
  renderProject(activeProject);
  renderArchive(data);
}

function switchProject(projectId) {
  if (!dashboardData || projectId === dashboardData.activeProjectId) return;

  const project = dashboardData.projects.find((item) => item.id === projectId);
  if (!project) return;

  dashboardData.activeProjectId = project.id;
  refreshDashboard(dashboardData);
  saveToStorage();
  clearTimeout(saveTimer);
  setMessage(`Otevřený projekt: ${project.title || 'Bez názvu'}.`);
  saveTimer = setTimeout(clearMessage, 2200);
}

function createEmptyProject(title = '') {
  const cleanTitle = String(title).trim() || 'Nový projekt';

  return {
    id: createProjectId(cleanTitle),
    status: 'active',
    title: cleanTitle,
    dateRange: '',
    place: '',
    summary: 'Krátký dashboard k projektu: příprava, odložené věci, hotovo, mapa, odkazy a screenshoty.',
    map: { label: '', url: '', embedUrl: '' },
    links: [],
    images: [],
    items: [createEmptyItem('now')],
  };
}

function addProject(title) {
  if (!dashboardData) return;

  dashboardData.projects = Array.isArray(dashboardData.projects) ? dashboardData.projects : [];
  const project = createEmptyProject(title);
  dashboardData.projects.push(project);
  dashboardData.activeProjectId = project.id;
  editMode = true;
  document.body.classList.add('editing');
  refreshDashboard(dashboardData);
  saveDashboard();
  setMessage('Nový projekt je založený. Uprav název, termín a první úkol, pak klikni „Uložit“.');
}

function deleteProject(projectId) {
  if (!dashboardData || !Array.isArray(dashboardData.projects)) return;

  const projectIndex = dashboardData.projects.findIndex((project) => project.id === projectId);
  if (projectIndex === -1) return;

  if (dashboardData.projects.length <= 1) {
    setMessage('Poslední projekt nejde smazat. Vytvoř nejdřív jiný projekt.', 'error');
    return;
  }

  const project = dashboardData.projects[projectIndex];
  const title = project.title || 'Bez názvu';
  if (!window.confirm(`Opravdu smazat projekt „${title}“? Tahle akce smaže i jeho úkoly, odkazy a obrázky.`)) return;

  dashboardData.projects.splice(projectIndex, 1);

  if (dashboardData.activeProjectId === projectId) {
    const nextProject = dashboardData.projects[Math.min(projectIndex, dashboardData.projects.length - 1)];
    dashboardData.activeProjectId = nextProject.id;
  }

  refreshDashboard(dashboardData);
  saveDashboard();
  setMessage(`Projekt „${title}“ je smazaný.`);
}

async function loadDashboard() {
  setMessage('Načítám projekt…');

  try {
    const data = loadFromStorage() || await loadFromLocalFile();
    refreshDashboard(data);
    clearMessage();
  } catch (error) {
    setMessage(`Dashboard se nepodařilo načíst. Detail: ${error.message}`, 'error');
  }
}

function applyEdit(path, value) {
  if (!activeProject) return;

  if (path.startsWith('project.')) {
    const keys = path.replace('project.', '').split('.');
    let target = activeProject;
    while (keys.length > 1) {
      const key = keys.shift();
      if (!target[key]) target[key] = {};
      target = target[key];
    }
    target[keys[0]] = value;
    return;
  }

  if (path.startsWith('item.')) {
    const [, indexText, key] = path.split('.');
    const item = activeProject.items[Number(indexText)];
    if (!item) return;
    item[key] = value;
    return;
  }

  if (path.startsWith('image.')) {
    const [, indexText, key] = path.split('.');
    const images = Array.isArray(activeProject.images) ? activeProject.images : [];
    const image = images[Number(indexText)];
    if (!image) return;
    image[key] = value;
    return;
  }

  if (path.startsWith('link.')) {
    const parts = path.split('.');
    const key = parts.pop();
    const linkIndex = Number(parts.pop());
    const owner = parts.slice(1).join('.');
    const links = getLinksByOwner(owner);
    const link = links[linkIndex];
    if (!link) return;
    link[key] = value;
  }
}

function createEmptyItem(stateGroup = 'now') {
  return {
    title: 'Nový úkol',
    stateGroup,
    state: '',
    next: '',
    note: '',
    links: [],
    category: 'projekt',
    status: stateMap[stateGroup]?.label.toLowerCase() || 'teď',
  };
}

function addItem(stateGroup) {
  activeProject.items = Array.isArray(activeProject.items) ? activeProject.items : [];
  activeProject.items.push(createEmptyItem(stateGroup));
  renderProject(activeProject);
  setMessage('Úkol přidaný. Uprav ho a klikni „Uložit“.');
}

function removeItem(index) {
  if (!Array.isArray(activeProject.items) || !activeProject.items[index]) return;
  activeProject.items.splice(index, 1);
  renderProject(activeProject);
  setMessage('Úkol smazaný. Klikni „Uložit“, aby změna zůstala uložená.');
}

function addLink(owner) {
  const links = getLinksByOwner(owner);
  links.push({ label: 'Nový odkaz', url: '' });
  renderProject(activeProject);
  setMessage('Odkaz přidaný. Vlož URL a klikni „Uložit“.');
}

function removeLink(owner, index) {
  const links = getLinksByOwner(owner);
  if (!links[index]) return;
  links.splice(index, 1);
  renderProject(activeProject);
  setMessage('Odkaz smazaný. Klikni „Uložit“, aby změna zůstala uložená.');
}

function bindProjectSwitching() {
  document.querySelectorAll('[data-switch-project]').forEach((button) => {
    button.addEventListener('click', () => switchProject(button.dataset.switchProject));
  });

  document.querySelectorAll('[data-delete-project]').forEach((button) => {
    button.addEventListener('click', () => deleteProject(button.dataset.deleteProject));
  });
}

function bindInlineEditing() {
  bindProjectSwitching();

  if (!editMode) return;

  document.querySelectorAll('[data-edit-path]').forEach((element) => {
    const eventName = element.matches('select') ? 'change' : 'input';
    element.addEventListener(eventName, () => {
      const path = element.dataset.editPath;
      const value = element.isContentEditable ? getTextFromEditable(element) : element.value;
      applyEdit(path, value);
      if (path.endsWith('stateGroup')) renderProject(activeProject);
    });
  });

  document.querySelectorAll('[data-add-item]').forEach((button) => {
    button.addEventListener('click', () => addItem(button.dataset.addItem || 'now'));
  });

  document.querySelectorAll('[data-remove-item]').forEach((button) => {
    button.addEventListener('click', () => removeItem(Number(button.dataset.removeItem)));
  });

  document.querySelectorAll('[data-add-link]').forEach((button) => {
    button.addEventListener('click', () => addLink(button.dataset.addLink || 'project'));
  });

  document.querySelectorAll('[data-remove-link]').forEach((button) => {
    button.addEventListener('click', () => removeLink(button.dataset.removeLink || 'project', Number(button.dataset.linkIndex)));
  });

  document.querySelectorAll('[data-remove-image]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.removeImage);
      if (!Array.isArray(activeProject.images) || !activeProject.images[index]) return;
      activeProject.images.splice(index, 1);
      renderProject(activeProject);
      setMessage('Obrázek odebraný. Klikni „Uložit“, aby změna zůstala uložená.');
    });
  });
}

function saveDashboard() {
  clearTimeout(saveTimer);
  saveToStorage();
  setMessage('Uloženo v tomhle prohlížeči. Pro přenos na jiné zařízení použij Export JSON.');
  saveTimer = setTimeout(clearMessage, 2600);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Soubor nejde přečíst.'));
    reader.readAsDataURL(file);
  });
}

async function uploadImage(panel) {
  setMessage('Přidávám obrázek…');

  try {
    const fileInput = panel.querySelector('#quick-image-file');
    const file = fileInput.files[0];
    if (!file) throw new Error('Vyber obrázek nebo screenshot.');

    const url = await fileToDataUrl(file);
    activeProject.images = Array.isArray(activeProject.images) ? activeProject.images : [];
    activeProject.images.push({
      label: panel.querySelector('#quick-image-label').value.trim() || file.name,
      url,
      note: '',
    });
    fileInput.value = '';
    panel.querySelector('#quick-image-label').value = '';
    refreshDashboard(dashboardData);
    setMessage('Obrázek přidaný. Klikni „Uložit“, aby zůstal uložený.');
  } catch (error) {
    setMessage(`Obrázek se nepodařilo přidat: ${error.message}`, 'error');
  }
}

function exportJson() {
  const blob = new Blob([JSON.stringify(dashboardData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `drzkrok-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importJson(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = validateData(JSON.parse(reader.result), 'Importovaný JSON');
      refreshDashboard(data);
      saveDashboard();
      setMessage('Import hotový a uložený v tomhle prohlížeči.');
    } catch (error) {
      setMessage(`Import selhal: ${error.message}`, 'error');
    }
  };
  reader.readAsText(file);
}

function resetLocalData() {
  localStorage.removeItem(STORAGE_KEY);
  loadDashboard();
  setMessage('Lokální úpravy smazané. Znovu se načetl data.json z repozitáře.');
}

function createInlineEditor() {
  const panel = document.createElement('section');
  panel.className = 'quick-editor';
  panel.innerHTML = `
    <button class="quick-edit-toggle" type="button">Upravit</button>
    <div class="quick-edit-panel" hidden>
      <h2>Rychlá úprava</h2>
      <div class="quick-actions">
        <button id="quick-edit-mode" type="button">Zapnout úpravy</button>
        <button id="quick-save" type="button">Uložit</button>
      </div>
      <details>
        <summary>Nahrát obrázek</summary>
        <label>Popisek<input id="quick-image-label" placeholder="Screenshot ubytování" /></label>
        <input id="quick-image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
        <button id="quick-upload" type="button">Přidat obrázek</button>
      </details>
      <details open>
        <summary>Projekty</summary>
        <label>Název nového projektu<input id="quick-project-title" placeholder="Třeba Dovolená 2026" /></label>
        <button id="quick-add-project" type="button">Vytvořit projekt</button>
        <button id="quick-delete-project" class="quick-danger-button" type="button">Smazat otevřený projekt</button>
      </details>
      <details>
        <summary>Přenos dat</summary>
        <button id="quick-export" type="button">Export JSON</button>
        <label>Import JSON<input id="quick-import-file" type="file" accept="application/json,.json" /></label>
        <button id="quick-reset" type="button">Smazat lokální úpravy</button>
      </details>
    </div>
  `;
  document.body.append(panel);

  const toggle = panel.querySelector('.quick-edit-toggle');
  const editPanel = panel.querySelector('.quick-edit-panel');
  const modeButton = panel.querySelector('#quick-edit-mode');
  const saveButton = panel.querySelector('#quick-save');
  const uploadButton = panel.querySelector('#quick-upload');
  const addProjectButton = panel.querySelector('#quick-add-project');
  const deleteProjectButton = panel.querySelector('#quick-delete-project');
  const projectTitleInput = panel.querySelector('#quick-project-title');
  const exportButton = panel.querySelector('#quick-export');
  const importInput = panel.querySelector('#quick-import-file');
  const resetButton = panel.querySelector('#quick-reset');

  toggle.addEventListener('click', () => {
    editPanel.hidden = !editPanel.hidden;
  });

  modeButton.addEventListener('click', () => {
    editMode = !editMode;
    modeButton.textContent = editMode ? 'Vypnout úpravy' : 'Zapnout úpravy';
    document.body.classList.toggle('editing', editMode);
    if (dashboardData) refreshDashboard(dashboardData);
  });

  saveButton.addEventListener('click', saveDashboard);
  uploadButton.addEventListener('click', () => uploadImage(panel));
  addProjectButton.addEventListener('click', () => {
    addProject(projectTitleInput.value);
    projectTitleInput.value = '';
    const modeButton = quickEditorPanel?.querySelector('#quick-edit-mode');
    if (modeButton) modeButton.textContent = 'Vypnout úpravy';
  });
  deleteProjectButton.addEventListener('click', () => deleteProject(dashboardData?.activeProjectId));
  exportButton.addEventListener('click', exportJson);
  importInput.addEventListener('change', () => importJson(importInput.files[0]));
  resetButton.addEventListener('click', resetLocalData);

  quickEditorPanel = panel;
}

createInlineEditor();
loadDashboard();
