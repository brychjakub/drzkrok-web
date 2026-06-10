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

const message = document.querySelector('#message');

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
    .map((link) => {
      const href = escapeHtml(link.url || '#');
      const label = escapeHtml(link.label || link.url || 'Odkaz');
      return `<li><a href="${href}" target="_blank" rel="noreferrer">${label}</a></li>`;
    })
    .join('');

  return `<ul class="links">${items}</ul>`;
}

function createCard(item, index) {
  const card = document.createElement('article');
  card.className = 'item-card';

  const title = escapeHtml(item.title || 'Bez názvu');
  const stateLabel = escapeHtml(item.state || 'bez stavu');
  const category = escapeHtml(item.category || 'osobní');
  const status = escapeHtml(item.status || 'klid');
  const next = escapeHtml(item.next || 'Žádný další krok.');
  const note = escapeHtml(item.note || 'Bez poznámky.');
  const detailId = `detail-${item.state || 'item'}-${index}`;

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

function renderBoard(items) {
  Object.values(stateMap).forEach(({ listId }) => {
    document.querySelector(`#${listId}`).replaceChildren();
  });

  items.forEach((item, index) => {
    const target = stateMap[item.stateGroup];
    if (!target) return;

    document.querySelector(`#${target.listId}`).append(createCard(item, index));
  });
}

async function loadBoard() {
  setMessage('Načítám nástěnku…');

  try {
    const response = await fetch('data.json', { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Soubor data.json vrátil stav ${response.status}.`);
    }

    const data = await response.json();

    if (!Array.isArray(data.items)) {
      throw new Error('Soubor data.json nemá pole "items".');
    }

    renderBoard(data.items);
    clearMessage();
  } catch (error) {
    setMessage(`Nástěnku se nepodařilo načíst. Zkontroluj, že vedle index.html existuje platný soubor data.json. Detail: ${error.message}`, 'error');
  }
}

loadBoard();
