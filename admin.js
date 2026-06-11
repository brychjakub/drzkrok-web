const adminConfig = window.DRZKROK_CONFIG || {};
const apiInput = document.querySelector('#api-url');
const usernameInput = document.querySelector('#admin-username');
const passwordInput = document.querySelector('#admin-password');
const editor = document.querySelector('#json-editor');
const message = document.querySelector('#admin-message');
const loginButton = document.querySelector('#login-button');
const loadButton = document.querySelector('#load-button');
const saveButton = document.querySelector('#save-button');
const formatButton = document.querySelector('#format-button');
const saveSettingsButton = document.querySelector('#save-settings-button');
const imageFileInput = document.querySelector('#image-file');
const imageLabelInput = document.querySelector('#image-label');
const uploadButton = document.querySelector('#upload-button');
const uploadResult = document.querySelector('#upload-result');

const savedApiUrl = localStorage.getItem('drzkrokApiBaseUrl');
const savedUsername = localStorage.getItem('drzkrokAdminUsername');

apiInput.value = savedApiUrl || adminConfig.apiBaseUrl || '';
usernameInput.value = savedUsername || '';

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
  const response = await fetch(`${apiUrl}${path}`, {
    credentials: 'include',
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Backend vrátil stav ${response.status}.`);
  }

  return response.json();
}

function saveSettings() {
  localStorage.setItem('drzkrokApiBaseUrl', cleanApiUrl());
  localStorage.setItem('drzkrokAdminUsername', usernameInput.value.trim());
  setMessage('Nastavení je uložené v tomhle prohlížeči. Heslo se neukládá.');
}

async function login() {
  setMessage('Přihlašuju…');

  try {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      throw new Error('Vyplň uživatelské jméno i heslo.');
    }

    await fetchBackend('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    saveSettings();
    setMessage('Přihlášeno. Teď můžeš ukládat změny a nahrávat obrázky.');
  } catch (error) {
    setMessage(`Přihlášení selhalo: ${error.message}`, 'error');
  }
}

async function loadData() {
  setMessage('Načítám data z backendu…');

  try {
    const data = await fetchBackend('/api/dashboard');
    editor.value = JSON.stringify(validatePayload(data), null, 2);
    saveSettings();
    setMessage('Data načtená.');
  } catch (error) {
    setMessage(`Načtení selhalo: ${error.message}`, 'error');
  }
}

async function saveData() {
  setMessage('Ukládám data…');

  try {
    const payload = validatePayload(JSON.parse(editor.value));
    const data = await fetchBackend('/api/dashboard', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
    const file = imageFileInput.files[0];

    if (!file) {
      throw new Error('Vyber obrázek nebo screenshot.');
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('label', imageLabelInput.value.trim() || file.name);

    const result = await fetchBackend('/api/uploads', {
      method: 'POST',
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

loginButton.addEventListener('click', login);
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
