const adminConfig = window.DRZKROK_CONFIG || {};
const apiInput = document.querySelector('#api-url');
const usernameInput = document.querySelector('#admin-username');
const passwordInput = document.querySelector('#admin-password');
const editor = document.querySelector('#json-editor');
const message = document.querySelector('#admin-message');
const loginButton = document.querySelector('#login-button');
const authStatus = document.querySelector('#admin-auth-status');
const authFields = document.querySelector('#admin-auth-fields');
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
let isAuthenticated = false;
let authConfigured = false;
const shouldUseBackend = adminConfig.useBackend !== false;
const authTokenKey = 'drzkrokAuthToken';

apiInput.value = savedApiUrl || adminConfig.apiBaseUrl || '';
usernameInput.value = savedUsername || '';

function cleanApiUrl() {
  return apiInput.value.trim().replace(/\/$/, '');
}

function getAuthToken() {
  return localStorage.getItem(authTokenKey) || '';
}

function rememberAuthToken(token) {
  if (token) localStorage.setItem(authTokenKey, token);
}

function withAuthHeaders(options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAuthToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return { ...options, headers };
}

function downloadJson(payload) {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'data.json';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function fetchLocalData() {
  const response = await fetch('data.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Soubor data.json vrátil stav ${response.status}.`);
  }
  return response.json();
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
  const requestOptions = withAuthHeaders(options);
  const response = await fetch(`${apiUrl}${path}`, {
    credentials: 'include',
    ...requestOptions,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Backend vrátil stav ${response.status}.`);
  }

  return response.json();
}


function updateAuthUi() {
  if (!authStatus || !authFields) return;

  if (!shouldUseBackend) {
    authStatus.textContent = 'GitHub Pages je statický web. Data upravíš stažením nového data.json a commitem do repozitáře.';
    authFields.hidden = true;
    loginButton.hidden = true;
    apiInput.disabled = true;
    saveSettingsButton.hidden = true;
    uploadButton.disabled = true;
    return;
  }

  if (!authConfigured) {
    authStatus.textContent = 'Přihlášení není nastavené na backendu.';
    authFields.hidden = false;
    loginButton.hidden = false;
    return;
  }

  if (isAuthenticated) {
    authStatus.textContent = 'Přihlášeno. Heslo znovu zadávat nemusíš.';
    authFields.hidden = true;
    loginButton.hidden = true;
    return;
  }

  authStatus.textContent = 'Pro ukládání a upload se přihlaš.';
  authFields.hidden = false;
  loginButton.hidden = false;
}

async function refreshSession() {
  if (!shouldUseBackend) {
    updateAuthUi();
    return;
  }

  try {
    const session = await fetchBackend('/api/session');
    isAuthenticated = Boolean(session.authenticated);
    authConfigured = Boolean(session.configured);
  } catch (_error) {
    isAuthenticated = false;
    authConfigured = false;
  }

  updateAuthUi();
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

    const loginResult = await fetchBackend('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    rememberAuthToken(loginResult.token);
    isAuthenticated = true;
    authConfigured = true;
    updateAuthUi();
    saveSettings();
    setMessage('Přihlášeno. Teď můžeš ukládat změny a nahrávat obrázky.');
  } catch (error) {
    setMessage(`Přihlášení selhalo: ${error.message}`, 'error');
  }
}

async function loadData() {
  setMessage(shouldUseBackend ? 'Načítám data z backendu…' : 'Načítám data.json…');

  try {
    const data = shouldUseBackend ? await fetchBackend('/api/dashboard') : await fetchLocalData();
    editor.value = JSON.stringify(validatePayload(data), null, 2);
    if (shouldUseBackend) saveSettings();
    setMessage(shouldUseBackend ? 'Data načtená.' : 'Data načtená z data.json. Po úpravě si stáhni nový soubor a commitni ho.');
  } catch (error) {
    setMessage(`Načtení selhalo: ${error.message}`, 'error');
  }
}

async function saveData() {
  setMessage(shouldUseBackend ? 'Ukládám data…' : 'Připravuju data.json ke stažení…');

  try {
    const payload = validatePayload(JSON.parse(editor.value));

    if (!shouldUseBackend) {
      downloadJson(payload);
      setMessage('Stažený data.json nahraj/commitni do repozitáře. GitHub Pages se potom přegeneruje automaticky.');
      return;
    }

    if (!isAuthenticated) {
      await refreshSession();
    }

    if (authConfigured && !isAuthenticated) {
      throw new Error('Nejdřív se přihlaš.');
    }

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
  uploadResult.textContent = '';

  if (!shouldUseBackend) {
    setMessage('GitHub Pages neumí přijímat uploady. Obrázek přidej do repozitáře a jeho cestu doplň do data.json.', 'error');
    return;
  }

  setMessage('Nahrávám obrázek…');

  try {
    if (!isAuthenticated) {
      await refreshSession();
    }

    if (authConfigured && !isAuthenticated) {
      throw new Error('Nejdřív se přihlaš.');
    }

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
      filename: result.filename || '',
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

refreshSession();
loadData();
