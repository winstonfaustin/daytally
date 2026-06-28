import json
import mimetypes
from pathlib import Path

from google.genai import types

from models.schema import BillSplitResult
from prompts.system_prompt import MULTIMODAL_USER_PROMPT, SYSTEM_PROMPT
from services.bill_calculator import recalc_proportional_tax_tip
from services.gemini_client import DEFAULT_MODEL, build_client

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


def split_bill_from_uploads(
    receipt_path: str,
    *,
    audio_path: str | None = None,
    voice_text: str | None = None,
) -> tuple[dict, dict]:
    """Read receipt image and voice input via Gemini multimodal API and return structured bill split JSON."""
    client = build_client()
    receipt = Path(receipt_path)
    image_mime = mimetypes.guess_type(receipt.name)[0] or "image/jpeg"

    contents: list = [
        types.Part.from_bytes(data=receipt.read_bytes(), mime_type=image_mime),
    ]

    debug: dict = {"receipt_text": "(read directly from receipt image)"}

    if voice_text:
        contents.append(f"Voice instructions (typed):\n{voice_text}")
        debug["voice_transcript"] = voice_text
    elif audio_path:
        audio = Path(audio_path)
        audio_mime = AUDIO_MIME_TYPES.get(audio.suffix.lower(), "audio/webm")
        contents.append(types.Part.from_bytes(data=audio.read_bytes(), mime_type=audio_mime))
        debug["voice_transcript"] = "(understood from voice note audio)"
    else:
        raise ValueError("Voice instructions are required.")

    contents.append(MULTIMODAL_USER_PROMPT)

    response = client.models.generate_content(
        model=DEFAULT_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=BillSplitResult,
            temperature=0.1,
        ),
    )

    result = recalc_proportional_tax_tip(_parse_response(response))
    return result, debug
