# Drž krok – projektový dashboard

Rychlý osobní dashboard pro **jeden aktivní projekt**. Aktuální ukázkový projekt je „Výlet na ferraty“ v termínu **31. 7. – 2. 8. 2026**.

Princip: žádná Jira, žádný plánovač. Jeden projekt, rychlé odkazy, mapa, screenshoty, tři sloupce `Teď`, `Později`, `Hotovo` a schovaný archiv starších projektů.

## Co to umí

- Jeden hlavní aktivní projekt na homepage.
- Tři jednoduché sekce: `Teď`, `Později`, `Hotovo`.
- Mapa / odkaz na mapu.
- Rychlé odkazy.
- Obrázky a screenshoty.
- Archiv starších projektů schovaný dole.
- Rychlá editace přímo na hlavní stránce tlačítkem **Upravit**.
- Pokročilejší JSON editace přes `admin.html`.
- Flask backend pro PythonAnywhere.
- Nasazení na PythonAnywhere stylem `git clone` a později jen `git pull`.

## Soubory

### Veřejný web

- `index.html` – veřejný projektový dashboard.
- `style.css` – minimalistický responzivní styl.
- `script.js` – načítání projektu, vykreslení karet, mapy, obrázků, archivu a rychlá inline editace.
- `data.json` – záložní lokální data, když backend nejede.
- `config.js` – konfigurace API. Pro PythonAnywhere na stejné doméně může zůstat prázdné `apiBaseUrl`.

### Admin

- `admin.html` – pokročilejší stránka pro úpravu celého JSONu.
- `admin.css` – styl adminu.
- `admin.js` – načtení/uložení JSONu a upload obrázků.

### PythonAnywhere backend

- `pythonanywhere/app.py` – Flask API a zároveň jednoduché servírování statických souborů z repozitáře.
- `pythonanywhere/data.json` – startovací data, ze kterých se při prvním spuštění vytvoří pracovní kopie.
- `pythonanywhere/storage/data.json` – skutečná pracovní data vytvořená backendem; jsou v `.gitignore`, aby je `git pull` nepřepsal.
- `pythonanywhere/storage/uploads/` – nahrané obrázky; také mimo Git.
- `pythonanywhere/requirements.txt` – závislosti.
- `pythonanywhere/wsgi.py` – import Flask aplikace.

## Lokální zobrazení bez backendu

V kořeni projektu spusť:

```bash
python3 -m http.server 4173
```

Pak otevři:

```text
http://127.0.0.1:4173/
```

Bez Flask backendu se stránka pokusí o API, spadne na fallback a ukáže lokální `data.json`.

## Lokální spuštění s backendem

```bash
cd /workspace/drzkrok-web
python3 -m pip install --user -r pythonanywhere/requirements.txt
python3 pythonanywhere/app.py
```

Když spouštíš Flask ručně, můžeš si dočasně doplnit na konec `pythonanywhere/app.py` vlastní `app.run(...)`, ale na PythonAnywhere to potřeba není. PythonAnywhere spouští aplikaci přes WSGI.

## PythonAnywhere: chci jen `git pull`

Ano. Doporučený stav je:

```text
/home/tvojeuzivatelskejmeno/mysite/                  ← tvoje PythonAnywhere složka
/home/tvojeuzivatelskejmeno/mysite/drzkrok-web/       ← tady je naklonovaný celý Git repozitář
/home/tvojeuzivatelskejmeno/mysite/drzkrok-web/index.html
/home/tvojeuzivatelskejmeno/mysite/drzkrok-web/script.js
/home/tvojeuzivatelskejmeno/mysite/drzkrok-web/pythonanywhere/app.py
/home/tvojeuzivatelskejmeno/mysite/drzkrok-web/pythonanywhere/storage/data.json   ← tvoje živá data, nejsou v Gitu
```

Díky tomu pak aktualizace kódu vypadá jen takhle:

```bash
cd /home/tvojeuzivatelskejmeno/mysite/drzkrok-web
git pull
```

Živá data a uploady jsou ve složce `drzkrok-web/pythonanywhere/storage/`, která je ignorovaná Gitem. `git pull` tedy aktualizuje kód, ale nesmaže ti projekty ani obrázky.

## PythonAnywhere první nasazení krok za krokem

### 1. Připrav web aplikaci

1. Přihlas se do PythonAnywhere.
2. Jdi na záložku **Web**.
3. Pokud už projekt máš, nech ho být.
4. Pokud web ještě nemáš, dej **Add a new web app**.
5. Vyber **Manual configuration** nebo **Flask**.
6. Vyber dostupnou Python verzi.

### 2. Naklonuj repozitář do `mysite/drzkrok-web`

V PythonAnywhere otevři **Bash** konzoli.

Pokud složka `mysite` ještě neexistuje, vytvoř ji a naklonuj repo dovnitř:

```bash
cd /home/tvojeuzivatelskejmeno
mkdir -p mysite
cd mysite
git clone TVOJE_GIT_URL
```

Pokud složka `mysite` už existuje, což je tvůj případ, udělej jen:

```bash
cd /home/tvojeuzivatelskejmeno/mysite
git clone TVOJE_GIT_URL
```

Po tomhle vznikne složka podle názvu repozitáře:

```text
/home/tvojeuzivatelskejmeno/mysite/drzkrok-web
```

To je správně. Není potřeba klonovat repo přímo do `mysite`. Důležité je jen v dalších příkazech používat cestu do podsložky `drzkrok-web`.

### 3. Nainstaluj závislosti

```bash
cd /home/tvojeuzivatelskejmeno/mysite/drzkrok-web
python3 -m pip install --user -r pythonanywhere/requirements.txt
```

### 4. Nastav přihlášení jménem a heslem

Stránka se nebude zapisovat přes žádný ručně opisovaný token. Backend používá normální přihlášení: **uživatelské jméno + heslo + serverová session cookie**. Stejné přihlášení může chránit i celé zobrazení dashboardu.

Heslo neukládej do kódu v otevřené podobě. Do WSGI dáš jen hash hesla. Nejdřív si v PythonAnywhere Bash konzoli vygeneruj hash hesla a secret pro session:

```bash
cd /home/tvojeuzivatelskejmeno/mysite/drzkrok-web
python3 - <<'PY'
import getpass
import secrets
from werkzeug.security import generate_password_hash

password = getpass.getpass('Zadej nové admin heslo: ')
print('DRZKROK_ADMIN_PASSWORD_HASH=' + generate_password_hash(password))
print('DRZKROK_SESSION_SECRET=' + secrets.token_urlsafe(48))
PY
```

Výstup bude vypadat zhruba takhle:

```text
DRZKROK_ADMIN_PASSWORD_HASH=scrypt:32768:8:1$...
DRZKROK_SESSION_SECRET=dlouhy-nahodny-retezec...
```

Tyhle dvě hodnoty si zkopíruješ do WSGI souboru společně s uživatelským jménem. Pokud chceš chránit i samotné zobrazení dashboardu, nech ve WSGI `DRZKROK_REQUIRE_LOGIN_TO_VIEW = "true"`.

### 5. Nastav WSGI

Na PythonAnywhere v záložce **Web** otevři **WSGI configuration file** a nastav ho takhle:

```python
import os
import sys
from pathlib import Path

os.environ["DRZKROK_ADMIN_USERNAME"] = "admin"
os.environ["DRZKROK_ADMIN_PASSWORD_HASH"] = "sem-vloz-vygenerovany-password-hash"
os.environ["DRZKROK_SESSION_SECRET"] = "sem-vloz-vygenerovany-session-secret"
os.environ["DRZKROK_REQUIRE_LOGIN_TO_VIEW"] = "true"

project_home = Path('/home/tvojeuzivatelskejmeno/mysite/drzkrok-web/pythonanywhere')
if str(project_home) not in sys.path:
    sys.path.insert(0, str(project_home))

from app import app as application
```

Důležité: cesta `project_home` míří do podsložky `pythonanywhere` uvnitř naklonovaného repozitáře, tedy do `mysite/drzkrok-web/pythonanywhere`, protože Flask backend je v `mysite/drzkrok-web/pythonanywhere/app.py`.

### 6. Reloadni web

V záložce **Web** klikni **Reload**.

Pak otevři:

```text
https://tvojeuzivatelskejmeno.pythonanywhere.com/api/health
```

Správná odpověď:

```json
{"ok": true}
```

### 7. Otevři dashboard

Když PythonAnywhere servíruje i frontend, otevři:

```text
https://tvojeuzivatelskejmeno.pythonanywhere.com/
```

`config.js` může zůstat takhle:

```js
window.DRZKROK_CONFIG = {
  apiBaseUrl: '',
  useBackend: true,
};
```

Prázdné `apiBaseUrl` znamená: volej API na stejné doméně.

### 8. Jak pak dělat aktualizace kódu

V PythonAnywhere Bash konzoli:

```bash
cd /home/tvojeuzivatelskejmeno/mysite/drzkrok-web
git pull
```

Pak v záložce **Web** klikni **Reload**.

Hotovo.


## Když backend na PythonAnywhere nefunguje

Podle PythonAnywhere obrazovky může být **Source code** správně nastavený na:

```text
/home/tvojeuzivatelskejmeno/mysite/drzkrok-web
```

To ale samo o sobě Flask backend nespustí. Rozhodující je WSGI configuration file. V něm musí být `project_home` přesně:

```python
project_home = Path('/home/tvojeuzivatelskejmeno/mysite/drzkrok-web/pythonanywhere')
```

Pak klikni **Reload** a ověř:

```text
https://tvojeuzivatelskejmeno.pythonanywhere.com/api/health
```

Když se neukáže `{"ok": true}`, otevři na PythonAnywhere error log v záložce **Web**. Nejčastější chyby jsou špatná cesta ve WSGI, nenainstalovaný Flask, nebo chybějící `DRZKROK_ADMIN_USERNAME`, `DRZKROK_ADMIN_PASSWORD_HASH` a `DRZKROK_SESSION_SECRET`.

## Jak upravovat přímo na stránce

1. Otevři dashboard.
2. Vpravo dole klikni **Upravit**. Panel je schovaný, dokud ho sám neotevřeš.
3. Pokud už jsi přihlášený přes chráněnou stránku, další přihlášení se nezobrazuje. Když přihlášený nejsi, vyplň **uživatelské jméno a heslo** a klikni **Přihlásit**.
4. Klikni **Zapnout úpravy**.
5. Klikni přímo do názvu, popisku, termínu, místa, stavů nebo poznámek a přepiš text.
6. Pro mapu a rychlé odkazy použij pole v horní projektové kartě.
7. Obrázky se v edit módu zobrazí jako jednotlivé karty. Každou můžeš přepsat nebo tlačítkem **Smazat z projektu** odebrat.
8. Klikni **Uložit**.

## Jak nahrát nebo smazat obrázek / screenshot přímo na stránce

1. Vpravo dole klikni **Upravit**.
2. Pokud nejsi přihlášený, přihlaš se jménem a heslem.
3. Rozklikni **Nahrát obrázek**.
4. Vyber soubor.
5. Doplníš popisek.
6. Klikni **Nahrát a přidat do projektu**.
7. Klikni **Uložit**.

Když chceš obrázek smazat, zapni edit mód, u obrázku klikni **Smazat z projektu** a potom klikni **Uložit**. Pokud jde o obrázek nahraný přes tento backend, pokusí se aplikace smazat i soubor z `pythonanywhere/storage/uploads/`.

Obrázky se ukládají do `pythonanywhere/storage/uploads/` uvnitř `drzkrok-web`, takže je `git pull` nemaže.

## Jak udělat nový projekt a starý schovat

V `admin.html` nebo v JSON poli na stránce nastav starému projektu:

```json
"status": "archived"
```

Novému projektu dej nové `id` a nahoře změň:

```json
"activeProjectId": "nove-id-projektu"
```

Starý projekt zůstane v archivu a hlavní stránka ukáže nový aktivní projekt.

## A co S3?

Teď je nejrychlejší řešení ukládat obrázky přímo na PythonAnywhere do `pythonanywhere/storage/uploads/`. Pro osobní projektové dashboardy je to jednodušší než S3.

S3 / S3-compatible storage dává smysl později, pokud bude obrázků hodně, budou velké, nebo budeš chtít oddělit soubory od PythonAnywhere.

## Poznámka ke git aliasu `forcepush`

Pokud na mobilu používáš alias, který na `main` merguje větev `origin/neco` a při konfliktu chceš automaticky přijmout **příchozí změny z té mergované větve**, používej `--theirs`, ne `--ours`.

Při příkazu:

```bash
git checkout main
git merge origin/nazev-vetve
```

znamená:

- `--ours` = nech lokální aktuální větev `main`, tedy zahodíš konfliktní změny z `origin/nazev-vetve`,
- `--theirs` = vezmi konfliktní změny z `origin/nazev-vetve`, tedy to odpovídá „accept incoming changes“.

Bezpečnější varianta tvého aliasu by tedy měla používat `--theirs`:

```bash
git config --global alias.forcepush '!f() { git checkout main && git pull origin main && git merge origin/$1 || { git checkout --theirs . && git add . && git commit -m "Resolve conflicts by accepting incoming changes"; }; git push origin main; }; f'
```

Pozor: tenhle alias je pořád dost ostrý nástroj. Když ho použiješ špatně, můžeš si přepsat práci na `main`. Před použitím je dobré dát aspoň:

```bash
git status
git branch --show-current
```
