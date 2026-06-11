import json
import os
import tempfile
import uuid
from pathlib import Path

from flask import Flask, jsonify, make_response, request, send_from_directory, session, url_for
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
REPO_DIR = BASE_DIR.parent
STORAGE_DIR = Path(os.environ.get("DRZKROK_STORAGE_DIR", BASE_DIR / "storage"))
SEED_DATA_FILE = BASE_DIR / "data.json"
DATA_FILE = Path(os.environ.get("DRZKROK_DATA_FILE", STORAGE_DIR / "data.json"))
UPLOAD_DIR = Path(os.environ.get("DRZKROK_UPLOAD_DIR", STORAGE_DIR / "uploads"))
ADMIN_USERNAME = os.environ.get("DRZKROK_ADMIN_USERNAME")
ADMIN_PASSWORD_HASH = os.environ.get("DRZKROK_ADMIN_PASSWORD_HASH")
SESSION_SECRET = os.environ.get("DRZKROK_SESSION_SECRET")
ALLOWED_ORIGIN = os.environ.get("DRZKROK_ALLOWED_ORIGIN", "*")
REQUIRE_LOGIN_TO_VIEW = os.environ.get("DRZKROK_REQUIRE_LOGIN_TO_VIEW", "false").lower() in {"1", "true", "yes", "on"}
MAX_UPLOAD_BYTES = int(os.environ.get("DRZKROK_MAX_UPLOAD_BYTES", 8 * 1024 * 1024))
ALLOWED_EXTENSIONS = {"gif", "jpeg", "jpg", "png", "webp"}

DEFAULT_DATA = {
    "activeProjectId": "feraty-2026",
    "projects": [
        {
            "id": "feraty-2026",
            "status": "active",
            "title": "Výlet na ferraty",
            "subtitle": "Jeden konkrétní projekt. Rychle vidět, co řešit před odjezdem.",
            "dateRange": "31. 7. – 2. 8. 2026",
            "place": "Rakousko / ferraty",
            "summary": "Krátký dashboard k výletu: příprava, odložené věci, hotovo, mapa, odkazy a screenshoty.",
            "map": {"label": "Mapa výletu", "url": "https://maps.google.com/", "embedUrl": ""},
            "links": [{"label": "Google Maps", "url": "https://maps.google.com/"}],
            "images": [],
            "items": [
                {
                    "title": "Trasa a ferraty",
                    "stateGroup": "now",
                    "state": "vybrat konkrétní místa a náhradní variantu podle počasí",
                    "next": "doplnit finální mapu a odkazy na ferraty",
                    "note": "držet to jednoduché: jedna hlavní trasa, jedna záloha",
                    "links": [],
                    "category": "plán",
                    "status": "teď",
                }
            ],
        }
    ],
}


app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES
if SESSION_SECRET:
    app.secret_key = SESSION_SECRET
else:
    # Bez explicitního secret key nepovolíme přihlášení ani zápis.
    # Tím se vyhneme nechtěným default heslům v produkci.
    app.secret_key = os.urandom(32)


def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, PUT, POST, OPTIONS"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


@app.after_request
def after_request(response):
    return add_cors(response)


def load_data():
    if not DATA_FILE.exists():
        if SEED_DATA_FILE.exists():
            with SEED_DATA_FILE.open("r", encoding="utf-8") as handle:
                save_data(json.load(handle))
        else:
            save_data(DEFAULT_DATA)

    with DATA_FILE.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    validate_data(data)
    return data


def save_data(data):
    validate_data(data)
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(
        "w",
        encoding="utf-8",
        dir=DATA_FILE.parent,
        delete=False,
    ) as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temp_name = handle.name

    os.replace(temp_name, DATA_FILE)


def validate_data(data):
    if not isinstance(data, dict) or not isinstance(data.get("projects"), list):
        raise ValueError('JSON musí obsahovat pole "projects".')

    if not data.get("activeProjectId"):
        raise ValueError('JSON musí obsahovat "activeProjectId".')

    project_ids = set()
    allowed_groups = {"now", "later", "done"}

    for project_index, project in enumerate(data["projects"]):
        if not isinstance(project, dict):
            raise ValueError(f"Projekt #{project_index + 1} musí být objekt.")

        project_id = project.get("id")
        if not project_id or not project.get("title"):
            raise ValueError(f'Projekt #{project_index + 1} musí mít "id" a "title".')

        if project_id in project_ids:
            raise ValueError(f"Duplicitní project id: {project_id}")

        project_ids.add(project_id)

        if not isinstance(project.get("items"), list):
            raise ValueError(f'Projekt "{project_id}" musí mít pole "items".')

        if "links" in project and not isinstance(project["links"], list):
            raise ValueError(f'Projekt "{project_id}" má neplatné "links".')

        if "images" in project and not isinstance(project["images"], list):
            raise ValueError(f'Projekt "{project_id}" má neplatné "images".')

        for item_index, item in enumerate(project["items"]):
            if not isinstance(item, dict):
                raise ValueError(f"Položka #{item_index + 1} v projektu {project_id} musí být objekt.")

            if not item.get("title") or not item.get("stateGroup"):
                raise ValueError(f'Položka #{item_index + 1} v projektu "{project_id}" musí mít "title" a "stateGroup".')

            if item["stateGroup"] not in allowed_groups:
                raise ValueError(f'Položka #{item_index + 1} v projektu "{project_id}" má neplatný "stateGroup".')

            if "links" in item and not isinstance(item["links"], list):
                raise ValueError(f'Položka #{item_index + 1} v projektu "{project_id}" má neplatné "links".')

    if data["activeProjectId"] not in project_ids:
        raise ValueError('"activeProjectId" musí odpovídat existujícímu projektu.')


def auth_is_configured():
    return bool(ADMIN_USERNAME and ADMIN_PASSWORD_HASH and SESSION_SECRET)


def credentials_are_valid(username, password):
    if not auth_is_configured():
        return False

    if username != ADMIN_USERNAME:
        return False

    return check_password_hash(ADMIN_PASSWORD_HASH, password)


def is_authorized():
    return bool(session.get("drzkrok_admin_authenticated"))


def require_authorized():
    if not auth_is_configured():
        return make_response("Přihlášení není nastavené. Doplň DRZKROK_ADMIN_USERNAME, DRZKROK_ADMIN_PASSWORD_HASH a DRZKROK_SESSION_SECRET ve WSGI.", 500)

    if not is_authorized():
        return make_response("Nejsi přihlášený.", 401)

    return None


def allowed_upload(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def view_requires_login(filename=None):
    if not REQUIRE_LOGIN_TO_VIEW or is_authorized():
        return False

    public_files = {"login.html", "login.js", "style.css", "admin.css", "config.js"}
    return filename not in public_files



@app.route("/api/session", methods=["GET", "OPTIONS"])
def session_status():
    if request.method == "OPTIONS":
        return make_response("", 204)

    return jsonify({"authenticated": is_authorized(), "configured": auth_is_configured()})


@app.route("/api/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return make_response("", 204)

    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username") or "")
    password = str(payload.get("password") or "")

    if not auth_is_configured():
        return make_response("Přihlášení není nastavené ve WSGI.", 500)

    if not credentials_are_valid(username, password):
        return make_response("Neplatné jméno nebo heslo.", 401)

    session.clear()
    session["drzkrok_admin_authenticated"] = True
    session["drzkrok_admin_username"] = username
    return jsonify({"authenticated": True})


@app.route("/api/logout", methods=["POST", "OPTIONS"])
def logout():
    if request.method == "OPTIONS":
        return make_response("", 204)

    session.clear()
    return jsonify({"authenticated": False})

@app.route("/api/health", methods=["GET", "OPTIONS"])
def health():
    if request.method == "OPTIONS":
        return make_response("", 204)

    return jsonify({"ok": True})


@app.route("/api/dashboard", methods=["GET", "PUT", "OPTIONS"])
def dashboard():
    if request.method == "OPTIONS":
        return make_response("", 204)

    if request.method == "GET":
        return jsonify(load_data())

    auth_error = require_authorized()
    if auth_error:
        return auth_error

    payload = request.get_json(silent=True)

    if payload is None:
        return make_response("Tělo požadavku není platný JSON.", 400)

    try:
        save_data(payload)
    except ValueError as error:
        return make_response(str(error), 400)

    return jsonify(load_data())


@app.route("/api/items", methods=["GET", "PUT", "OPTIONS"])
def items_legacy_alias():
    return dashboard()


@app.route("/api/uploads", methods=["POST", "OPTIONS"])
def uploads():
    if request.method == "OPTIONS":
        return make_response("", 204)

    auth_error = require_authorized()
    if auth_error:
        return auth_error

    uploaded_file = request.files.get("image")

    if uploaded_file is None or uploaded_file.filename == "":
        return make_response("Chybí soubor v poli image.", 400)

    if not allowed_upload(uploaded_file.filename):
        return make_response("Podporované jsou jen PNG, JPG, WEBP a GIF.", 400)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    original_name = secure_filename(uploaded_file.filename)
    extension = original_name.rsplit(".", 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{extension}"
    target = UPLOAD_DIR / filename
    uploaded_file.save(target)

    label = request.form.get("label") or original_name
    public_url = url_for("uploaded_file", filename=filename, _external=True)

    return jsonify({"label": label, "url": public_url, "filename": filename})


@app.route("/uploads/<path:filename>", methods=["GET"])
def uploaded_file(filename):
    if REQUIRE_LOGIN_TO_VIEW:
        auth_error = require_authorized()
        if auth_error:
            return auth_error

    return send_from_directory(UPLOAD_DIR, filename)


@app.route("/", methods=["GET"])
def frontend_index():
    if view_requires_login("index.html"):
        return send_from_directory(REPO_DIR, "login.html")

    return send_from_directory(REPO_DIR, "index.html")


@app.route("/<path:filename>", methods=["GET"])
def frontend_file(filename):
    allowed_files = {
        "index.html",
        "style.css",
        "script.js",
        "config.js",
        "data.json",
        "admin.html",
        "admin.css",
        "admin.js",
        "login.html",
        "login.js",
    }

    if filename in allowed_files:
        if view_requires_login(filename):
            return send_from_directory(REPO_DIR, "login.html")

        return send_from_directory(REPO_DIR, filename)

    return make_response("Nenalezeno.", 404)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
