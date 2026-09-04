import os
import uuid
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(override=True)

from flask import Flask, jsonify, render_template, request
from werkzeug.utils import secure_filename

from services.gemini_service import split_bill_from_uploads
from services import supabase_service as sb

BASE_DIR = Path(__file__).resolve().parent
# Vercel serverless allows writes only under /tmp
UPLOAD_DIR = Path("/tmp/daytally_uploads") if os.getenv("VERCEL") else BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_RECEIPT_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}
ALLOWED_AUDIO_EXTENSIONS = {"mp3", "wav", "m4a", "webm", "ogg", "aac"}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024


def _allowed_file(filename: str, allowed: set[str]) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed


def _save_upload(file_storage, prefix: str) -> Path:
    original_name = secure_filename(file_storage.filename or "upload")
    extension = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else "bin"
    saved_path = UPLOAD_DIR / f"{prefix}_{uuid.uuid4().hex}.{extension}"
    file_storage.save(saved_path)
    return saved_path


def _bearer_token() -> str:
    header = request.headers.get("Authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return ""


def _require_user() -> dict:
    token = _bearer_token()
    if not token:
        raise PermissionError("Please log in.")
    return sb.user_from_token(token)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/health/supabase", methods=["GET"])
def supabase_health():
    return jsonify({"configured": sb.is_configured()})


@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    body = request.get_json(silent=True) or {}
    email = str(body.get("email") or "").strip().lower()
    password = str(body.get("password") or "")
    display_name = str(body.get("display_name") or body.get("name") or "").strip()
    if not email or "@" not in email:
        return jsonify({"error": "Enter a valid email."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400
    if len(display_name) < 2:
        return jsonify({"error": "Display name must be at least 2 characters."}), 400
    try:
        payload = sb.register_user(email, password, display_name)
        return jsonify({"success": True, **payload})
    except sb.SupabaseNotConfigured as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    body = request.get_json(silent=True) or {}
    email = str(body.get("email") or "").strip().lower()
    password = str(body.get("password") or "")
    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400
    try:
        payload = sb.login_user(email, password)
        return jsonify({"success": True, **payload})
    except sb.SupabaseNotConfigured as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@app.route("/api/auth/google", methods=["GET"])
def auth_google():
    redirect_to = (request.args.get("redirect_to") or request.host_url or "").strip()
    if not redirect_to:
        return jsonify({"error": "Missing redirect_to."}), 400
    try:
        url = sb.google_oauth_url(redirect_to)
        return jsonify({"success": True, "url": url})
    except sb.SupabaseNotConfigured as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@app.route("/api/auth/session", methods=["POST"])
def auth_session():
    body = request.get_json(silent=True) or {}
    access_token = str(body.get("access_token") or "").strip()
    refresh_token = str(body.get("refresh_token") or "").strip()
    if not access_token:
        return jsonify({"error": "Missing access token."}), 400
    try:
        payload = sb.session_from_access_token(access_token, refresh_token)
        return jsonify({"success": True, **payload})
    except sb.SupabaseNotConfigured as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@app.route("/api/auth/profile", methods=["GET"])
def auth_profile_get():
    try:
        user = _require_user()
        profile = sb.get_profile(user["id"])
        return jsonify({"success": True, "user": profile})
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 401
    except sb.SupabaseNotConfigured as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@app.route("/api/auth/profile", methods=["PATCH", "POST"])
def auth_profile_update():
    body = request.get_json(silent=True) or {}
    try:
        user = _require_user()
        profile = sb.update_profile(user["id"], body)
        return jsonify({"success": True, "user": profile})
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 401
    except sb.SupabaseNotConfigured as exc:
        return jsonify({"error": str(exc)}), 503
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@app.route("/api/splits", methods=["GET"])
def get_splits():
    try:
        user = _require_user()
        return jsonify({"success": True, "splits": sb.list_splits(user["id"])})
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 401
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/splits", methods=["POST"])
def post_split():
    body = request.get_json(silent=True) or {}
    data = body.get("data")
    if not isinstance(data, dict):
        return jsonify({"error": "Missing split data."}), 400
    try:
        user = _require_user()
        saved = sb.save_split(user["id"], data, local_id=body.get("local_id"))
        return jsonify({"success": True, "split": saved})
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 401
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/events", methods=["GET"])
def get_events():
    try:
        user = _require_user()
        return jsonify({"success": True, "events": sb.list_events(user["id"])})
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 401
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/events", methods=["POST"])
def post_event():
    body = request.get_json(silent=True) or {}
    event = body.get("event")
    if not isinstance(event, dict):
        return jsonify({"error": "Missing event data."}), 400
    try:
        user = _require_user()
        saved = sb.save_event(user["id"], event)
        return jsonify({"success": True, "event": saved})
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 401
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/process", methods=["POST"])
def process_bill():
    receipt_file = request.files.get("receipt")
    audio_file = request.files.get("audio")
    voice_text_override = request.form.get("voice_text", "").strip()

    if not receipt_file or receipt_file.filename == "":
        return jsonify({"error": "Please upload a receipt image."}), 400

    has_audio = audio_file and audio_file.filename != ""
    has_text = bool(voice_text_override)

    if not has_audio and not has_text:
        return jsonify({"error": "Please record a voice note or type your instructions."}), 400

    if not _allowed_file(receipt_file.filename, ALLOWED_RECEIPT_EXTENSIONS):
        return jsonify({"error": "Receipt must be an image (PNG, JPG, JPEG, WEBP, GIF)."}), 400

    if has_audio:
        filename_ok = _allowed_file(audio_file.filename, ALLOWED_AUDIO_EXTENSIONS)
        content_type_ok = (audio_file.content_type or "").lower().startswith("audio/")
        if not filename_ok and not content_type_ok:
            return jsonify(
                {"error": "Voice note must be an audio file (WEBM, MP3, WAV, M4A, OGG, AAC)."}
            ), 400

    receipt_path = None
    audio_path = None

    try:
        receipt_path = _save_upload(receipt_file, "receipt")

        if has_text:
            result, debug = split_bill_from_uploads(
                str(receipt_path),
                voice_text=voice_text_override,
            )
        else:
            audio_path = _save_upload(audio_file, "audio")
            result, debug = split_bill_from_uploads(
                str(receipt_path),
                audio_path=str(audio_path),
            )

        return jsonify(
            {
                "success": True,
                "data": result,
                "debug": debug,
                "flags": debug.get("flags") or [],
            }
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 500
    except Exception as exc:
        message = str(exc)
        if "API_KEY_INVALID" in message or "API key not valid" in message:
            return jsonify(
                {"error": "We couldn't process this bill right now. Please try again later."}
            ), 500
        if "no longer available" in message or ("404" in message and "model" in message.lower()):
            return jsonify(
                {"error": "Bill processing is temporarily unavailable. Please try again later."}
            ), 500
        return jsonify({"error": "Something went wrong while processing your bill. Please try again."}), 500
    finally:
        for path in (receipt_path, audio_path):
            if path and path.exists():
                path.unlink(missing_ok=True)


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    port = int(os.getenv("PORT", "5000"))
    app.run(debug=debug, host="0.0.0.0", port=port)
