"""Three-node orchestration: OCR, then transcript, then fusion.

The live wizard uses this path. One Gemini call is used only when VERCEL is set.
"""

from __future__ import annotations

import json
import mimetypes
from pathlib import Path

from google.genai import types

from models.schema import BillSplitResult, ReceiptExtraction, VoiceTranscript
from prompts.system_prompt import (
    FUSION_SYSTEM_PROMPT,
    FUSION_USER_PROMPT,
    OCR_SYSTEM_PROMPT,
    OCR_USER_PROMPT,
    TRANSCRIBE_SYSTEM_PROMPT,
    TRANSCRIBE_USER_PROMPT,
)
from services.bill_calculator import normalize_shared_labels, recalc_proportional_tax_tip
from services.error_gates import collect_error_flags
from services.idr_amounts import IDR_RESTORE_FLAG, restore_idr_extraction, restore_idr_thousands
from services.gemini_client import DEFAULT_MODEL, build_client
from services.gemini_service import AUDIO_MIME_TYPES, _parse_response


def _generate(client, model: str, contents: list, system: str, schema):
    return client.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system,
            response_mime_type="application/json",
            response_schema=schema,
            temperature=0.1,
        ),
    )


def extract_receipt(client, receipt_path: str, model: str) -> dict:
    receipt = Path(receipt_path)
    image_mime = mimetypes.guess_type(receipt.name)[0] or "image/jpeg"
    contents = [
        types.Part.from_bytes(data=receipt.read_bytes(), mime_type=image_mime),
        OCR_USER_PROMPT,
    ]
    response = _generate(client, model, contents, OCR_SYSTEM_PROMPT, ReceiptExtraction)
    if response.parsed is not None:
        return response.parsed.model_dump()
    if response.text:
        return json.loads(response.text)
    raise RuntimeError("OCR stage returned an empty response.")


def transcribe_audio(client, audio_path: str, model: str) -> str:
    audio = Path(audio_path)
    audio_mime = AUDIO_MIME_TYPES.get(audio.suffix.lower(), "audio/webm")
    contents = [
        types.Part.from_bytes(data=audio.read_bytes(), mime_type=audio_mime),
        TRANSCRIBE_USER_PROMPT,
    ]
    response = _generate(client, model, contents, TRANSCRIBE_SYSTEM_PROMPT, VoiceTranscript)
    if response.parsed is not None:
        return response.parsed.transcript
    if response.text:
        payload = json.loads(response.text)
        return payload.get("transcript", "")
    raise RuntimeError("Transcription stage returned an empty response.")


def fuse_extraction(client, extraction: dict, instructions: str, model: str) -> dict:
    contents = [
        "Receipt extraction JSON:\n" + json.dumps(extraction, indent=2),
        f"Split instructions:\n{instructions}",
        FUSION_USER_PROMPT,
    ]
    response = _generate(client, model, contents, FUSION_SYSTEM_PROMPT, BillSplitResult)
    return _parse_response(response)


def split_bill_separated(
    receipt_path: str,
    *,
    audio_path: str | None = None,
    voice_text: str | None = None,
    model: str | None = None,
) -> tuple[dict, dict]:
    if not voice_text and not audio_path:
        raise ValueError("Voice instructions are required.")

    model_name = model or DEFAULT_MODEL
    client = build_client()
    timings: dict[str, float] = {}

    import time

    t0 = time.perf_counter()
    extraction = extract_receipt(client, receipt_path, model_name)
    restore_idr_extraction(extraction)
    timings["ocr_s"] = round(time.perf_counter() - t0, 3)

    t1 = time.perf_counter()
    if voice_text:
        instructions = voice_text
        input_mode = "typed_text"
        timings["transcribe_s"] = 0.0
    else:
        instructions = transcribe_audio(client, audio_path, model_name)
        input_mode = "voice"
        timings["transcribe_s"] = round(time.perf_counter() - t1, 3)

    t2 = time.perf_counter()
    parsed = fuse_extraction(client, extraction, instructions, model_name)
    timings["fusion_s"] = round(time.perf_counter() - t2, 3)

    idr_scaled = restore_idr_thousands(parsed)
    printed_footer = dict(parsed.get("receipt_summary") or {})
    normalize_shared_labels(parsed, instructions)
    result = recalc_proportional_tax_tip(parsed)
    flags = collect_error_flags(result, printed_footer=printed_footer)
    if idr_scaled:
        flags.append(dict(IDR_RESTORE_FLAG))

    debug = {
        "architecture": "separated",
        "input_mode": input_mode,
        "model": model_name,
        "timings": timings,
        "extraction": extraction,
        "transcript": instructions,
        "printed_footer": printed_footer,
        "flags": flags,
    }
    return result, debug
