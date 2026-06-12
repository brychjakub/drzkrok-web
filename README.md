# Drž krok – sdílený projektový dashboard

Jednoduchý osobní dashboard pro projekty. Aktuální startovací projekt je „Výlet na ferraty“ v termínu **31. 7. – 2. 8. 2026**.

Cíl: rychle vidět, co teď řeším, co je později, co je hotovo, mapu, odkazy a screenshoty. Data se v produkci načítají z PythonAnywhere backendu, aby byla stejná na mobilu, firemním PC i dalších zařízeních.

## PythonAnywhere / backend verze

Produkční nastavení používá backend jako jedno sdílené úložiště:

- `config.js` má `useBackend: true`,
- dashboard načítá data přes `/api/dashboard`,
- tlačítko **Uložit** zapisuje změny zpět přes backend,
- lokální `localStorage` už není zdroj pravdy pro dashboardová data.

Pokud na dvou zařízeních vidíš rozdílné věci, typicky je to tím, že starší statická verze ukládala úpravy jen do `localStorage` konkrétního prohlížeče. Backend verze bere data ze sdíleného souboru/úložiště na PythonAnywhere.

## Statická GitHub Pages nouzová varianta

GitHub Pages neumí zapisovat soubory na server. Pokud bys někdy potřeboval čistě statický režim, přepni v `config.js` `useBackend` na `false`. Pak dashboard ukládá změny jen do `localStorage` v konkrétním prohlížeči.

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

Po změnách klikni **Uložit**.

## Odkazy bez JSONu

V edit módu v sekci **Rychlé odkazy** nebo v detailu úkolu klikni **Přidat odkaz**.

Vyplníš:

- název,
- URL.

Můžeš napsat i jen `maps.google.com`; při zobrazení se z toho udělá klikací `https://maps.google.com`.

## Obrázky a screenshoty

V panelu **Upravit → Nahrát obrázek** vybereš soubor a klikneš **Přidat obrázek**.

Obrázek se vloží do dashboardových dat jako data URL a po kliknutí na **Uložit** se v backend režimu uloží na PythonAnywhere společně s projektem. Pro pár screenshotů je to v pohodě. Kdyby obrázků bylo hodně, je lepší dávat do dashboardu běžné URL odkazy na obrázky uložené jinde.

## Lokální spuštění

Pro backend režim spusť Flask aplikaci z `pythonanywhere/app.py`:

```bash
python3 pythonanywhere/app.py
```

Pak otevři:

```text
http://127.0.0.1:5000/
```

Pokud chceš jen nouzově statickou verzi bez backendu, přepni v `config.js` `useBackend` na `false` a spusť:

```bash
python3 -m http.server 4173
```

## Soubory

- `index.html` – stránka dashboardu.
- `style.css` – vzhled.
- `script.js` – vykreslení, editace a ukládání přes backend nebo statický fallback.
- `data.json` – výchozí data pro statický fallback.
- `config.js` – přepínač backend/statický režim.
- `pythonanywhere/app.py` – Flask backend pro sdílená data, přihlášení a uploady.
