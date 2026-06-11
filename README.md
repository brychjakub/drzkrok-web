# Drž krok – projektový dashboard

Rychlý osobní dashboard pro **jeden aktivní projekt**. Teď je první aktivní projekt „Výlet na ferraty“ v termínu **31. 7. – 2. 8. 2026**.

Filozofie: rychle otevřít, rychle pochopit, rychle upravit. Žádná Jira, žádné workflow monstrum.

## Co to umí

- Jeden hlavní aktivní projekt na homepage.
- Tři jednoduché sekce: `Teď`, `Později`, `Hotovo`.
- Mapa / odkaz na mapu.
- Rychlé odkazy.
- Obrázky a screenshoty.
- Archiv starších projektů schovaný dole v rozbalovací sekci.
- Editace přes `admin.html`.
- Backend pro PythonAnywhere.
- Lokální `data.json` jako fallback, když backend zrovna nejede.

## Soubory

### Veřejný web

- `index.html` – veřejný projektový dashboard.
- `style.css` – minimalistický responzivní styl.
- `script.js` – načítání projektu, vykreslení karet, mapy, obrázků a archivu.
- `data.json` – záložní lokální data.
- `config.js` – adresa PythonAnywhere backendu.

### Admin

- `admin.html` – stránka pro úpravu projektu.
- `admin.css` – styl adminu.
- `admin.js` – načtení/uložení JSONu a upload obrázků.

### PythonAnywhere backend

- `pythonanywhere/app.py` – Flask API.
- `pythonanywhere/data.json` – data uložená na backendu.
- `pythonanywhere/requirements.txt` – závislosti.
- `pythonanywhere/wsgi.py` – vzor WSGI importu pro PythonAnywhere.

## Lokální zobrazení

V kořeni projektu spusť:

```bash
python3 -m http.server 4173
```

Pak otevři:

```text
http://127.0.0.1:4173/
```

Admin stránka:

```text
http://127.0.0.1:4173/admin.html
```

Bez backendu bude veřejný web číst jen lokální `data.json`.

## Datový model v kostce

Hlavní soubor má tvar:

```json
{
  "activeProjectId": "feraty-2026",
  "projects": []
}
```

Aktivní projekt je ten, jehož `id` odpovídá `activeProjectId`. Staré projekty nemaž, jen jim dej třeba:

```json
"status": "archived"
```

A nový aktivní projekt nastavíš změnou:

```json
"activeProjectId": "novy-projekt-id"
```

## Jak nasadit backend na PythonAnywhere úplně prakticky

### 1. Vytvoř Flask web

1. Přihlas se do PythonAnywhere.
2. Jdi na záložku **Web**.
3. Klikni **Add a new web app**.
4. Vyber svoji doménu `tvojeuzivatelskejmeno.pythonanywhere.com`.
5. Vyber **Manual configuration** nebo **Flask**.
6. Vyber Python verzi, kterou PythonAnywhere nabízí.

### 2. Nahraj backendové soubory

Do složky PythonAnywhere aplikace nahraj **obsah** složky `pythonanywhere/`.

Typický cíl na PythonAnywhere bude něco jako:

```text
/home/tvojeuzivatelskejmeno/mysite/
```

Výsledek má být:

```text
/home/tvojeuzivatelskejmeno/mysite/app.py
/home/tvojeuzivatelskejmeno/mysite/data.json
/home/tvojeuzivatelskejmeno/mysite/requirements.txt
/home/tvojeuzivatelskejmeno/mysite/wsgi.py
```

Nejjednodušší cesta přes webové rozhraní:

1. PythonAnywhere → **Files**.
2. Otevři složku aplikace, např. `/home/tvojeuzivatelskejmeno/mysite/`.
3. Nahraj tam `app.py`, `data.json`, `requirements.txt`, `wsgi.py`.

### 3. Nastav Flask závislosti

V PythonAnywhere otevři konzoli **Bash** a spusť:

```bash
cd /home/tvojeuzivatelskejmeno/mysite
pip install --user -r requirements.txt
```

### 4. Nastav admin token

V `app.py` je nouzový token:

```python
ADMIN_TOKEN = os.environ.get("DRZKROK_ADMIN_TOKEN", "change-this-token")
```

Nejrychlejší varianta: v souboru `app.py` nahraď `change-this-token` vlastním dlouhým heslem.

Lepší varianta: na PythonAnywhere nastav environment proměnnou `DRZKROK_ADMIN_TOKEN`.

### 5. Nastav WSGI

V PythonAnywhere v záložce **Web** otevři WSGI configuration file.

Obsah uprav podle `pythonanywhere/wsgi.py`, princip je:

```python
import sys
from pathlib import Path

project_home = Path('/home/tvojeuzivatelskejmeno/mysite')
if str(project_home) not in sys.path:
    sys.path.insert(0, str(project_home))

from app import app as application
```

Důležité je, aby cesta `project_home` ukazovala na složku, kde je `app.py`.

### 6. Reloadni backend

Na PythonAnywhere v záložce **Web** klikni **Reload**.

Pak ověř healthcheck:

```text
https://tvojeuzivatelskejmeno.pythonanywhere.com/api/health
```

Mělo by se zobrazit:

```json
{"ok": true}
```

### 7. Propoj veřejný web s backendem

V `config.js` nastav:

```js
window.DRZKROK_CONFIG = {
  apiBaseUrl: 'https://tvojeuzivatelskejmeno.pythonanywhere.com',
};
```

Pak nahraj na hosting/doménu `drzkrok.cz` tyto statické soubory:

```text
index.html
style.css
script.js
config.js
data.json
admin.html
admin.css
admin.js
```

### 8. Uprav projekt přes admin

Otevři:

```text
https://drzkrok.cz/admin.html
```

Vyplň:

- Backend URL: `https://tvojeuzivatelskejmeno.pythonanywhere.com`
- Admin token: token z kroku 4

Pak:

1. Klikni **Načíst projekt**.
2. V JSONu uprav název, termín, místo, mapu, odkazy, položky.
3. Klikni **Srovnat JSON**, když chceš text učesat.
4. Klikni **Uložit na backend**.
5. Otevři homepage a obnov stránku.

## Jak přidat mapu

Do aktivního projektu uprav:

```json
"map": {
  "label": "Mapa výletu",
  "url": "https://maps.google.com/...",
  "embedUrl": ""
}
```

- `url` je obyčejný odkaz na mapu.
- `embedUrl` je volitelný iframe embed odkaz. Když ho vyplníš, mapa se zobrazí přímo v dashboardu.

## Jak přidat screenshot / obrázek

1. Otevři `admin.html`.
2. Vyber soubor v sekci **Obrázky / screenshoty**.
3. Vyplň popisek.
4. Klikni **Nahrát obrázek**.
5. Admin zobrazí něco jako:

```json
{
  "label": "Screenshot ubytování",
  "url": "https://tvojeuzivatelskejmeno.pythonanywhere.com/uploads/abc123.webp",
  "note": ""
}
```

6. Tenhle objekt zkopíruj do pole `images` u aktivního projektu.
7. Klikni **Uložit na backend**.

## A co S3?

Teď je nejrychlejší řešení ukládat obrázky přímo na PythonAnywhere do složky `uploads/`. Pro osobní dashboard a pár screenshotů je to jednodušší než S3.

S3 / S3-compatible storage dává smysl později, pokud:

- bude obrázků hodně,
- budou velké,
- budeš chtít oddělit soubory od PythonAnywhere,
- budeš chtít levné dlouhodobé storage.

API je udělané tak, že později jde endpoint `/api/uploads` přepsat na upload do S3 a frontend se skoro nemusí měnit.
