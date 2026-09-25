import io
import json
import mimetypes
from pathlib import Path

from google.genai import types

from models.schema import BillSplitResult
from prompts.system_prompt import MULTIMODAL_USER_PROMPT, SYSTEM_PROMPT
from services.bill_calculator import normalize_shared_labels, recalc_proportional_tax_tip
from services.error_gates import collect_error_flags
from services.idr_amounts import IDR_RESTORE_FLAG, restore_idr_thousands
from services.gemini_client import build_client, resolve_model

AUDIO_MIME_TYPES = {
    ".webm": "audio/webm",
    ".mp3": "audio/mp3",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
    ".aac": "audio/aac",
}


def _parse_response(response) -> dict:
    if response.parsed is not None:
        return response.parsed.model_dump()
    if response.text:
        return json.loads(response.text)
    raise RuntimeError("Gemini returned an empty response.")


def _smaller_jpeg(path: Path) -> tuple[bytes, str]:
    from PIL import Image

    img = Image.open(path).convert("RGB")
    img.thumbnail((1280, 1280))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return buf.getvalue(), "image/jpeg"


def split_bill_from_uploads(
    receipt_path: str,
    *,
    audio_path: str | None = None,
    voice_text: str | None = None,
    model: str | None = None,
    fast: bool = False,
) -> tuple[dict, dict]:
    """Read receipt image and voice input via Gemini multimodal API and return structured bill split JSON."""
    client = build_client()
    model_name = resolve_model(model)
    receipt = Path(receipt_path)
    thinking = None
    if fast:
        image_bytes, image_mime = _smaller_jpeg(receipt)
        thinking = types.ThinkingConfig(thinking_level="MINIMAL")
    else:
        image_bytes = receipt.read_bytes()
        image_mime = mimetypes.guess_type(receipt.name)[0] or "image/jpeg"

    contents: list = [
        types.Part.from_bytes(data=image_bytes, mime_type=image_mime),
    ]

    if voice_text:
        contents.append(f"Voice instructions (typed):\n{voice_text}")
        input_mode = "typed_text"
    elif audio_path:
        audio = Path(audio_path)
        audio_mime = AUDIO_MIME_TYPES.get(audio.suffix.lower(), "audio/webm")
        contents.append(types.Part.from_bytes(data=audio.read_bytes(), mime_type=audio_mime))
        input_mode = "voice"
    else:
        raise ValueError("Voice instructions are required.")

    contents.append(MULTIMODAL_USER_PROMPT)

    response = client.models.generate_content(
        model=model_name,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=BillSplitResult,
            temperature=0.1,
            thinking_config=thinking,
        ),
    )

    parsed = _parse_response(response)
    idr_scaled = restore_idr_thousands(parsed)
    printed_footer = dict(parsed.get("receipt_summary") or {})
    normalize_shared_labels(parsed, voice_text)
    result = recalc_proportional_tax_tip(parsed)
    flags = collect_error_flags(result, printed_footer=printed_footer)
    if idr_scaled:
        flags.append(dict(IDR_RESTORE_FLAG))
    debug = {
        "architecture": "unified",
        "input_mode": input_mode,
        "model": model_name,
        "printed_footer": printed_footer,
        "flags": flags,
    }
    return result, debug
