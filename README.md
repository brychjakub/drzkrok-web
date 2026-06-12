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


## Když vidíš GitHub Pages 404 místo dat

Chyba s dlouhým HTML textem `There isn't a GitHub Pages site here` znamená, že frontend zkusil načíst `/api/dashboard` na GitHub Pages. GitHub Pages ale neumí spouštět Flask backend, takže tam žádné `/api/dashboard` není.

Postup:

1. Zjisti veřejnou URL PythonAnywhere aplikace, například `https://tvoje-jmeno.pythonanywhere.com`.
2. Pokud chceš otevírat web přes GitHub Pages, nastav v `config.js`:

   ```js
   window.DRZKROK_CONFIG = {
     useBackend: true,
     apiBaseUrl: 'https://tvoje-jmeno.pythonanywhere.com',
   };
   ```

3. Commitni a pushni změnu `config.js`.
4. Na PythonAnywhere otevři **Web → Reload**, aby běžela aktuální appka.
5. Na mobilu i PC otevři stejnou GitHub Pages URL a případně tvrdě obnov stránku, aby se načetl nový `config.js`.
6. Alternativa: GitHub Pages vůbec nepoužívej a otevírej přímo PythonAnywhere URL. V tom případě může `apiBaseUrl` zůstat prázdné, protože frontend i API běží na stejné doméně.

## Když vidíš `Failed to fetch`

`Failed to fetch` znamená, že prohlížeč se k backendu vůbec nedostal nebo ho zablokoval ještě před čtením odpovědi. Zkontroluj postupně:

1. `apiBaseUrl` v `config.js` je skutečná PythonAnywhere adresa včetně `https://`, ne ukázkový text.
2. PythonAnywhere web appka je spuštěná a po posledním commitu/reloadu opravdu běží.
3. V prohlížeči jde otevřít `https://tvoje-jmeno.pythonanywhere.com/api/health` a vrátí `{"ok": true}`.
4. Pokud frontend běží na GitHub Pages a API na PythonAnywhere, nastav na PythonAnywhere proměnnou `DRZKROK_ALLOWED_ORIGIN` na přesnou URL frontendu, například `https://uzivatel.github.io`.
5. Po změně proměnných na PythonAnywhere klikni **Reload**.

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
