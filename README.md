# Drž krok – GitHub projektový dashboard

Jednoduchý osobní dashboard pro projekty. Aktuální startovací projekt je „Výlet na ferraty“ v termínu **31. 7. – 2. 8. 2026**.

Cíl: rychle vidět, co teď řeším, co je později, co je hotovo, mapu, odkazy a screenshoty. Výchozí produkční režim je čistý **GitHub Pages bez backendu**, aby fungoval i tam, kde firemní politika blokuje API komunikaci.

## Jak se data synchronizují bez backendu

Čistě na GitHubu nejde zapisovat změny ze stránky přímo do repozitáře bez API nebo backendu. Proto je zdroj pravdy soubor `data.json` v repozitáři:

- každé zařízení načítá při otevření aktuální `data.json`,
- běžný `localStorage` není ve výchozím režimu zdroj pravdy,
- změny se projeví na mobilu, firemním PC i dalších zařízeních až po commitu/pushi nového `data.json`,
- tlačítko **Uložit** stáhne připravený `data.json`, který nahraješ/commitneš do GitHubu.

Prakticky to znamená: web je všude stejný podle posledního commitu v GitHubu. Není to živá databáze, ale je to spolehlivé bez PythonAnywhere a bez API komunikace.

## Doporučený workflow

1. Otevři dashboard na GitHub Pages.
2. Klikni **Upravit → Zapnout úpravy**.
3. Proveď změny.
4. Klikni **Uložit**.
5. Prohlížeč stáhne nový `data.json`.
6. V GitHubu nahraď původní `data.json` tím staženým souborem a commitni změnu.
7. Po doběhnutí GitHub Pages se stejná data načtou na všech zařízeních.

Alternativa bez editace na stránce: otevři `data.json` přímo v GitHubu, klikni na editaci souboru, uprav JSON a commitni.

## Volitelný lokální režim pro jeden prohlížeč

Kdybys někdy chtěl dočasně ukládat změny jen v jednom prohlížeči, nastav v `config.js`:

```js
window.DRZKROK_CONFIG = {
  useBackend: false,
  useLocalStorage: true,
  apiBaseUrl: '',
};
```

To ale znovu znamená, že mobil a firemní PC můžou vidět rozdílná data. Pro synchronizaci mezi zařízeními nech `useLocalStorage: false`.

## Volitelný backend režim

V repozitáři zůstává i Flask backend pro PythonAnywhere. Pokud bys ho někdy chtěl znovu použít, nastav v `config.js`:

```js
window.DRZKROK_CONFIG = {
  useBackend: true,
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

Po změnách klikni **Uložit** a commitni stažený `data.json`.

## Odkazy bez JSONu

V edit módu v sekci **Rychlé odkazy** nebo v detailu úkolu klikni **Přidat odkaz**.

Vyplníš:

- název,
- URL.

Můžeš napsat i jen `maps.google.com`; při zobrazení se z toho udělá klikací `https://maps.google.com`.

## Obrázky a screenshoty

V panelu **Upravit → Nahrát obrázek** vybereš soubor a klikneš **Přidat obrázek**.

Obrázek se vloží do dashboardových dat jako data URL. Po kliknutí na **Uložit** se stáhne nový `data.json`; po commitu do GitHubu bude obrázek dostupný i na ostatních zařízeních. Pro pár screenshotů je to v pohodě. Kdyby obrázků bylo hodně, je lepší dávat do dashboardu běžné URL odkazy na obrázky uložené jinde.

## Lokální spuštění

Pro backend režim spusť Flask aplikaci z `pythonanywhere/app.py`:

```bash
python3 pythonanywhere/app.py
```

Pak otevři:

```text
http://127.0.0.1:5000/
```

## Soubory

- `index.html` – stránka dashboardu.
- `style.css` – vzhled.
- `script.js` – vykreslení, editace a export/import dat.
- `data.json` – hlavní zdroj dat pro GitHub Pages režim.
- `config.js` – přepínač GitHub/localStorage/backend režimu.
- `pythonanywhere/app.py` – volitelný Flask backend, pokud ho někdy znovu zapneš.
