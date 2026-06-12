# Drž krok – statický projektový dashboard

Jednoduchý osobní dashboard pro **jeden aktivní projekt**. Aktuální startovací projekt je „Výlet na ferraty“ v termínu **31. 7. – 2. 8. 2026**.

Cíl: rychle vidět, co teď řeším, co je později, co je hotovo, mapu, odkazy a screenshoty. Žádná Jira, žádný backend, žádná databáze.

## GitHub Pages verze

Tahle verze je připravená pro GitHub Pages a je čistě statická:

- `index.html`
- `style.css`
- `script.js`
- `data.json`
- `config.js`

Není tu PythonAnywhere, Flask, login ani serverové uploady. Firemní notebook tedy nemusí otevírat PythonAnywhere.

## Jak funguje ukládání

GitHub Pages neumí zapisovat soubory na server. Proto dashboard ukládá změny do `localStorage` v konkrétním prohlížeči.

Prakticky:

- na stejném zařízení a ve stejném prohlížeči změny zůstanou,
- na jiném zařízení je neuvidíš automaticky,
- pro přenos použij v panelu **Upravit → Přenos dat → Export JSON** a pak **Import JSON** na jiném zařízení,
- pokud chceš změnit výchozí data pro všechny, uprav `data.json` v repozitáři a pushni ho na GitHub.

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

Obrázek se uloží do prohlížeče jako data URL. Pro pár screenshotů je to v pohodě. Kdyby obrázků bylo hodně, je lepší dávat do dashboardu běžné URL odkazy na obrázky uložené jinde.

## Lokální spuštění

```bash
python3 -m http.server 4173
```

Pak otevři:

```text
http://127.0.0.1:4173/
```

## Nasazení na GitHub Pages

1. Pushni repo na GitHub.
2. V GitHubu otevři **Settings → Pages**.
3. Source nastav na větev `main` a složku `/root`.
4. Ulož.
5. Otevři URL, kterou GitHub Pages zobrazí.

## Soubory

- `index.html` – stránka dashboardu.
- `style.css` – vzhled.
- `script.js` – vykreslení, editace a localStorage ukládání.
- `data.json` – výchozí data.
- `config.js` – kompatibilní statická konfigurace.
