# Drž krok – GitHub projektový dashboard

Jednoduchý osobní dashboard pro projekty. Aktuální startovací projekt je „Výlet na ferraty“ v termínu **31. 7. – 2. 8. 2026**.

Cíl: rychle vidět, co teď řeším, co je později, co je hotovo, mapu, odkazy a screenshoty a mít stejná data na mobilu i na firemním PC. Výchozí produkční režim je čistý **GitHub Pages + GitHub API**, bez PythonAnywhere backendu.

## Jak se data synchronizují bez vlastního backendu

Zdroj pravdy je soubor `data.json` v GitHub repozitáři:

- při otevření se web snaží načíst aktuální `data.json` přímo z GitHubu,
- běžný `localStorage` není ve výchozím režimu zdroj pravdy,
- po kliknutí na **Uložit** se `data.json` commitne přímo do GitHubu přes GitHub API,
- po doběhnutí GitHub Pages se stejná data načtou na mobilu, firemním PC i dalších zařízeních.

Prakticky to znamená: není potřeba PythonAnywhere ani databáze. Je to pořád statický web, ale zápis řeší GitHub API commitem do `data.json`.

## Co musíš udělat jednorázově

1. V GitHubu vytvoř **fine-grained personal access token**.
2. Dej mu přístup jen k tomuhle repozitáři.
3. Oprávnění stačí: **Contents: Read and write**.
4. Token nikam necommituj a nedávej ho do `config.js`.
5. Otevři dashboard, klikni **Upravit → Přenos dat → Nastavit GitHub token** a token vlož tam.
6. Od té chvíle kliknutí na **Uložit** udělá commit do `data.json`.

Token je uložený jen v konkrétním prohlížeči v `localStorage`. Na mobilu ho zadáš zvlášť, pokud chceš ukládat i z mobilu. Pro čtení token potřeba není.

## Proč ne GitHub Actions po kliknutí?

Šlo by to, ale pořád by bylo potřeba volat GitHub API a mít token. Navíc by se musel JSON předávat do workflow nebo přes mezisoubor, což je křehčí a má limity velikosti. Pro tenhle web je jednodušší a přímější cesta: **kliknutí na Uložit zavolá GitHub Contents API a rovnou commitne `data.json`**.

Pokud firemní politika blokuje i `api.github.com`, automatické ukládání z prohlížeče nepůjde žádnou čistě statickou cestou. Pak zbývá ruční export/commit nebo backend v síti, kterou firemní PC povolí.

## Doporučený workflow

1. Otevři dashboard na GitHub Pages.
2. Klikni **Upravit → Přenos dat → Nastavit GitHub token** a jednorázově vlož token.
3. Klikni **Zapnout úpravy**.
4. Proveď změny.
5. Klikni **Uložit**.
6. Web commitne nový `data.json` do GitHubu.
7. Po chvilce obnov stránku na ostatních zařízeních.

Nouzová alternativa zůstává **Export JSON**: pokud GitHub API zrovna nejde, vyexportuj soubor ručně a nahraj ho do GitHubu přes webové rozhraní.

## Volitelný lokální režim pro jeden prohlížeč

Kdybys někdy chtěl dočasně ukládat změny jen v jednom prohlížeči, nastav v `config.js`:

```js
window.DRZKROK_CONFIG = {
  useBackend: false,
  useGithubSync: false,
  useLocalStorage: true,
  apiBaseUrl: '',
};
```

To ale znovu znamená, že mobil a firemní PC můžou vidět rozdílná data. Pro synchronizaci mezi zařízeními nech `useGithubSync: true` a `useLocalStorage: false`.

## Volitelný backend režim

V repozitáři zůstává i Flask backend pro PythonAnywhere. Pokud bys ho někdy chtěl znovu použít, nastav v `config.js`:

```js
window.DRZKROK_CONFIG = {
  useBackend: true,
  useGithubSync: false,
  useLocalStorage: false,
  apiBaseUrl: 'https://tvoje-jmeno.pythonanywhere.com',
};
```

Ve firemní síti to ale může selhat, pokud politika blokuje API komunikaci.

## Co jde upravit přímo na stránce

Klikni vpravo dole na **Upravit** a potom **Zapnout úpravy**.

V edit módu můžeš:

- přepsat název projektu, popis, termín, místo a mapu,
- přidat/smazat úkoly ve sloupcích **Teď**, **Později**, **Hotovo**,
- přesunout úkol do jiného sloupce,
- upravit stav, další krok, poznámku, kategorii a status,
- přidat/smazat odkazy bez JSONu,
- přidat/smazat obrázky nebo screenshoty,
- exportovat/importovat celý JSON.

Po změnách klikni **Uložit**. Ve výchozím režimu se `data.json` commitne do GitHubu automaticky přes uložený token.

## Odkazy bez JSONu

V edit módu v sekci **Rychlé odkazy** nebo v detailu úkolu klikni **Přidat odkaz**.

Vyplníš:

- název,
- URL.

Můžeš napsat i jen `maps.google.com`; při zobrazení se z toho udělá klikací `https://maps.google.com`.

## Obrázky a screenshoty

V panelu **Upravit → Nahrát obrázek** vybereš soubor a klikneš **Přidat obrázek**.

Obrázek se vloží do dashboardových dat jako data URL. Po kliknutí na **Uložit** se uloží do `data.json` v GitHubu a po doběhnutí GitHub Pages bude dostupný i na ostatních zařízeních. Pro pár screenshotů je to v pohodě. Kdyby obrázků bylo hodně, je lepší dávat do dashboardu běžné URL odkazy na obrázky uložené jinde.

## Lokální spuštění

```bash
python3 -m http.server 4173
```

Pak otevři:

```text
http://127.0.0.1:4173/
```

## Soubory

- `index.html` – stránka dashboardu.
- `style.css` – vzhled.
- `script.js` – vykreslení, editace, GitHub ukládání a export/import dat.
- `data.json` – hlavní zdroj dat pro GitHub Pages režim.
- `config.js` – přepínač GitHub/localStorage/backend režimu.
- `pythonanywhere/app.py` – volitelný Flask backend, pokud ho někdy znovu zapneš.
