const loginConfig = window.DRZKROK_CONFIG || {};
const apiBaseUrl = (loginConfig.apiBaseUrl || '').replace(/\/$/, '');
const usernameInput = document.querySelector('#login-username');
const passwordInput = document.querySelector('#login-password');
const submitButton = document.querySelector('#login-submit');
const message = document.querySelector('#login-message');
const authTokenKey = 'drzkrokAuthToken';

function setMessage(text, type = 'info') {
  message.textContent = text;
  message.className = `message is-visible${type === 'error' ? ' is-error' : ''}`;
}

async function login() {
  setMessage('Přihlašuju…');

  try {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      throw new Error('Vyplň uživatelské jméno i heslo.');
    }

    const response = await fetch(`${apiBaseUrl}/api/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Backend vrátil stav ${response.status}.`);
    }

    const result = await response.json();
    if (result.token) localStorage.setItem(authTokenKey, result.token);
    window.location.href = 'index.html';
  } catch (error) {
    setMessage(`Přihlášení selhalo: ${error.message}`, 'error');
  }
}

submitButton.addEventListener('click', login);
passwordInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') login();
});
