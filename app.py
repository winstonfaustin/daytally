import os
import uuid
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from werkzeug.utils import secure_filename

from services.gemini_service import split_bill_from_uploads

load_dotenv(override=True)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

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


@app.route("/")
def index():
    return render_template("index.html")


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
            }
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 500
    except Exception as exc:
        message = str(exc)
        if "API_KEY_INVALID" in message or "API key not valid" in message:
            return jsonify(
                {
                    "error": (
                        "Your Gemini API key is invalid. "
                        "Get a new key at https://aistudio.google.com/apikey, "
                        "paste it into daytally/.env as GEMINI_API_KEY=..., save the file, "
                        "then restart the server."
                    )
                }
            ), 500
        if "no longer available" in message or ("404" in message and "model" in message.lower()):
            return jsonify(
                {
                    "error": (
                        "The Gemini model is unavailable. "
                        "Set GEMINI_MODEL=gemini-2.5-flash in daytally/.env and restart the server."
                    )
                }
            ), 500
        return jsonify({"error": f"Failed to process bill: {message}"}), 500
    finally:
        for path in (receipt_path, audio_path):
            if path and path.exists():
                path.unlink(missing_ok=True)


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    port = int(os.getenv("PORT", "5000"))
    app.run(debug=debug, host="0.0.0.0", port=port)
