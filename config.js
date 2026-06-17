// Výchozí režim je čistý GitHub Pages. Backend je vypnutý.
// Kliknutí na Uložit může commitnout data.json přímo do GitHubu přes GitHub API.
// Token se nikdy nedává sem do veřejného configu; zadá se až v prohlížeči a uloží se jen lokálně.
window.DRZKROK_CONFIG = {
  useBackend: false,
  useGithubSync: true,
  useLocalStorage: false,
  apiBaseUrl: '',
  github: {
    // Pokud web běží na https://UZIVATEL.github.io/REPO/, owner/repo se umí odvodit automaticky.
    // Na vlastní doméně hodnoty vyplň ručně.
    owner: '',
    repo: '',
    branch: 'main',
    dataPath: 'data.json',
  },
};
