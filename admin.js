const adminConfig = window.DRZKROK_CONFIG || {};
const apiInput = document.querySelector('#api-url');
const tokenInput = document.querySelector('#admin-token');
const editor = document.querySelector('#json-editor');
const message = document.querySelector('#admin-message');
const loadButton = document.querySelector('#load-button');
const saveButton = document.querySelector('#save-button');
const formatButton = document.querySelector('#format-button');
const saveSettingsButton = document.querySelector('#save-settings-button');
const imageFileInput = document.querySelector('#image-file');
const imageLabelInput = document.querySelector('#image-label');
const uploadButton = document.querySelector('#upload-button');
const uploadResult = document.querySelector('#upload-result');

const savedApiUrl = localStorage.getItem('drzkrokApiBaseUrl');
const savedToken = localStorage.getItem('drzkrokAdminToken');

apiInput.value = savedApiUrl || adminConfig.apiBaseUrl || '';
tokenInput.value = savedToken || '';

function cleanApiUrl() {
  return apiInput.value.trim().replace(/\/$/, '');
}

function setMessage(text, type = 'info') {
  message.textContent = text;
  message.className = `message is-visible${type === 'error' ? ' is-error' : ''}`;
}

function validatePayload(payload) {
  if (!payload || !Array.isArray(payload.projects)) {
    throw new Error('JSON musí obsahovat pole "projects".');
  }

  if (!payload.activeProjectId) {
    throw new Error('JSON musí obsahovat "activeProjectId".');
  }

  const ids = new Set();

  payload.projects.forEach((project, projectIndex) => {
    if (!project.id || !project.title) {
      throw new Error(`Projekt #${projectIndex + 1} musí mít minimálně "id" a "title".`);
    }

    if (ids.has(project.id)) {
      throw new Error(`Duplicitní project id: ${project.id}`);
    }

    ids.add(project.id);

    if (!Array.isArray(project.items)) {
      throw new Error(`Projekt "${project.id}" musí mít pole "items".`);
    }

    project.items.forEach((item, itemIndex) => {
      if (!item.title || !item.stateGroup) {
        throw new Error(`Položka #${itemIndex + 1} v projektu "${project.id}" musí mít "title" a "stateGroup".`);
      }
    });
  });

  if (!ids.has(payload.activeProjectId)) {
    throw new Error('"activeProjectId" musí odpovídat existujícímu projektu.');
  }

  return payload;
}

async function fetchBackend(path, options = {}) {
  const apiUrl = cleanApiUrl();

  const response = await fetch(`${apiUrl}${path}`, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Backend vrátil stav ${response.status}.`);
  }

  return response.json();
}

function saveSettings() {
  localStorage.setItem('drzkrokApiBaseUrl', cleanApiUrl());
  localStorage.setItem('drzkrokAdminToken', tokenInput.value.trim());
  setMessage('Nastavení je uložené v tomhle prohlížeči.');
}

async function loadData() {
  setMessage('Načítám projekt z backendu…');

  try {
    const data = await fetchBackend('/api/dashboard', {
      headers: {
        Accept: 'application/json',
      },
    });
    editor.value = JSON.stringify(validatePayload(data), null, 2);
    saveSettings();
    setMessage('Projekt načten.');
  } catch (error) {
    setMessage(`Načtení selhalo: ${error.message}`, 'error');
  }
}

async function saveData() {
  setMessage('Ukládám projekt…');

  try {
    const payload = validatePayload(JSON.parse(editor.value));
    const token = tokenInput.value.trim();

    if (!token) {
      throw new Error('Pro uložení vyplň admin token.');
    }

    const data = await fetchBackend('/api/dashboard', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    editor.value = JSON.stringify(validatePayload(data), null, 2);
    saveSettings();
    setMessage('Uloženo. Veřejný dashboard si při dalším načtení vezme nová data.');
  } catch (error) {
    setMessage(`Uložení selhalo: ${error.message}`, 'error');
  }
}

async function uploadImage() {
  setMessage('Nahrávám obrázek…');
  uploadResult.textContent = '';

  try {
    const token = tokenInput.value.trim();
    const file = imageFileInput.files[0];

    if (!token) {
      throw new Error('Pro upload vyplň admin token.');
    }

    if (!file) {
      throw new Error('Vyber obrázek nebo screenshot.');
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('label', imageLabelInput.value.trim() || file.name);

    const result = await fetchBackend('/api/uploads', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const imageSnippet = {
      label: result.label,
      url: result.url,
      note: '',
    };

    uploadResult.textContent = JSON.stringify(imageSnippet, null, 2);
    saveSettings();
    setMessage('Obrázek nahraný. Zkopíruj výsledek do pole images u aktivního projektu a ulož JSON.');
  } catch (error) {
    setMessage(`Upload selhal: ${error.message}`, 'error');
  }
}

function formatJson() {
  try {
    editor.value = JSON.stringify(validatePayload(JSON.parse(editor.value)), null, 2);
    setMessage('JSON je srovnaný.');
  } catch (error) {
    setMessage(`JSON nejde srovnat: ${error.message}`, 'error');
  }
}

loadButton.addEventListener('click', loadData);
saveButton.addEventListener('click', saveData);
formatButton.addEventListener('click', formatJson);
saveSettingsButton.addEventListener('click', saveSettings);
uploadButton.addEventListener('click', uploadImage);

if (cleanApiUrl() || adminConfig.useBackend !== false) {
  loadData();
} else {
  setMessage('Vyplň Backend URL z PythonAnywhere a klikni na „Načíst projekt“.');
}
