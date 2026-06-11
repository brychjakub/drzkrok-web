import json
import os
import tempfile
import uuid
from pathlib import Path

from flask import Flask, jsonify, make_response, request, send_from_directory, url_for
from werkzeug.utils import secure_filename

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = Path(os.environ.get("DRZKROK_DATA_FILE", BASE_DIR / "data.json"))
UPLOAD_DIR = Path(os.environ.get("DRZKROK_UPLOAD_DIR", BASE_DIR / "uploads"))
ADMIN_TOKEN = os.environ.get("DRZKROK_ADMIN_TOKEN", "change-this-token")
ALLOWED_ORIGIN = os.environ.get("DRZKROK_ALLOWED_ORIGIN", "*")
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


def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, PUT, POST, OPTIONS"
    return response


@app.after_request
def after_request(response):
    return add_cors(response)


def load_data():
    if not DATA_FILE.exists():
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


def is_authorized():
    expected = f"Bearer {ADMIN_TOKEN}"
    return request.headers.get("Authorization") == expected


def allowed_upload(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


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

    if not is_authorized():
        return make_response("Neplatný nebo chybějící admin token.", 401)

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

    if not is_authorized():
        return make_response("Neplatný nebo chybějící admin token.", 401)

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
    return send_from_directory(UPLOAD_DIR, filename)
