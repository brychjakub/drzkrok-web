// Firemní sítě můžou blokovat API/backendy. Výchozí režim je proto čistý GitHub Pages.
// Zdroj pravdy je data.json v repozitáři; změny se projeví všude až po commitu/pushi data.json.
window.DRZKROK_CONFIG = {
  useBackend: false,
  useLocalStorage: false,
  apiBaseUrl: '',
};
