// Produkční varianta používá PythonAnywhere backend jako jediné sdílené úložiště.
// Pokud web otevíráš přímo z PythonAnywhere, nech apiBaseUrl prázdné.
// Pokud web otevíráš z GitHub Pages, doplň sem adresu backendu, např. 'https://tvoje-jmeno.pythonanywhere.com'.
window.DRZKROK_CONFIG = {
  useBackend: true,
  apiBaseUrl: 'https://brych.pythonanywhere.com',
};
