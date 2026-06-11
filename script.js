const stateMap = {
  now: {
    listId: 'now-list',
    label: 'Teď',
  },
  later: {
    listId: 'later-list',
    label: 'Později',
  },
  done: {
    listId: 'done-list',
    label: 'Hotovo',
  },
};

const config = window.DRZKROK_CONFIG || {};
const apiBaseUrl = (config.apiBaseUrl || '').replace(/\/$/, '');
const message = document.querySelector('#message');
const projectOverview = document.querySelector('#project-overview');
const projectSubtitle = document.querySelector('#project-subtitle');
const archive = document.querySelector('#archive');

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

function renderLinks(links = []) {
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
  card.className = 'item-card';

  const title = escapeHtml(item.title || 'Bez názvu');
  const stateLabel = escapeHtml(item.state || 'bez stavu');
  const category = escapeHtml(item.category || 'projekt');
  const status = escapeHtml(item.status || 'klid');
  const next = escapeHtml(item.next || 'Žádný další krok.');
  const note = escapeHtml(item.note || 'Bez poznámky.');
  const detailId = `detail-${index}`;

  card.innerHTML = `
    <button class="item-toggle" type="button" aria-expanded="false" aria-controls="${detailId}">
      <div class="item-topline">
        <h3 class="item-title">${title}</h3>
        <span class="item-status">${status}</span>
      </div>
      <p class="item-category">${category}</p>
    </button>
    <div id="${detailId}" class="item-detail">
      <div class="detail-grid">
        <div>
          <span class="detail-label">Stav</span>
          <p class="detail-text">${stateLabel}</p>
        </div>
        <div>
          <span class="detail-label">Další krok</span>
          <p class="detail-text">${next}</p>
        </div>
        <div>
          <span class="detail-label">Poznámka</span>
          <p class="detail-text">${note}</p>
        </div>
        <div>
          <span class="detail-label">Odkazy</span>
          ${renderLinks(item.links)}
        </div>
      </div>
    </div>
  `;

  const button = card.querySelector('.item-toggle');
  button.addEventListener('click', () => {
    const isOpen = card.classList.toggle('is-open');
    button.setAttribute('aria-expanded', String(isOpen));
  });

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
  projectSubtitle.textContent = project.subtitle || 'Jeden projekt. Žádný plánovač.';

  projectOverview.innerHTML = `
    <article class="project-card">
      <div class="project-main">
        <p class="eyebrow">aktivní projekt</p>
        <h2>${escapeHtml(project.title || 'Bez názvu')}</h2>
        <p class="project-summary">${escapeHtml(project.summary || '')}</p>
        <div class="project-meta">
          ${project.dateRange ? `<span>${escapeHtml(project.dateRange)}</span>` : ''}
          ${project.place ? `<span>${escapeHtml(project.place)}</span>` : ''}
        </div>
      </div>
      <div class="project-side">
        <section>
          <h3>Mapa</h3>
          ${renderMap(project.map)}
        </section>
        <section>
          <h3>Rychlé odkazy</h3>
          ${renderLinks(project.links)}
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

  const activeProject = getActiveProject(data);

  if (!activeProject) {
    throw new Error(`${sourceName} neobsahuje žádný projekt.`);
  }

  return data;
}

async function fetchJson(url, sourceName) {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`${sourceName} vrátil stav ${response.status}.`);
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

async function loadDashboard() {
  setMessage('Načítám projekt…');

  try {
    const data = apiBaseUrl ? await loadFromApi() : await loadFromLocalFile();
    const project = getActiveProject(data);
    renderProject(project);
    renderArchive(data);
    clearMessage();
  } catch (error) {
    if (apiBaseUrl) {
      try {
        const data = await loadFromLocalFile();
        const project = getActiveProject(data);
        renderProject(project);
        renderArchive(data);
        setMessage(`Backend teď neodpovídá, ukazuju záložní data.json. Detail: ${error.message}`);
        return;
      } catch (fallbackError) {
        setMessage(`Dashboard se nepodařilo načíst z backendu ani z data.json. Detail: ${error.message} / ${fallbackError.message}`, 'error');
        return;
      }
    }

    setMessage(`Dashboard se nepodařilo načíst. Zkontroluj, že vedle index.html existuje platný soubor data.json. Detail: ${error.message}`, 'error');
  }
}

loadDashboard();
