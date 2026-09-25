"""Three-node orchestration: OCR, then transcript, then fusion.

The live wizard uses this path. One Gemini call is used only when VERCEL is set.
"""

from __future__ import annotations

import json
import mimetypes
import time
from concurrent.futures import ThreadPoolExecutor
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
from services.receipt_ocr import prices_match_footer, read_receipt
from services.local_assign import assign_from_text
from services.speech_whisper import transcribe


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


def fuse_extraction(
    client,
    extraction: dict,
    instructions: str,
    model: str,
    fast: bool = False,
    receipt_path: str | None = None,
) -> dict:
    contents = []
    if receipt_path:
        receipt = Path(receipt_path)
        image_mime = mimetypes.guess_type(receipt.name)[0] or "image/jpeg"
        contents.append(types.Part.from_bytes(data=receipt.read_bytes(), mime_type=image_mime))
        contents.append(
            "Read every dish name and every line price from the photo. "
            "The JSON may have dropped a letter or a digit. "
            "Copy the printed spelling and the printed price. "
            "Keep two identical rows as two lines. "
            "Keep a + add-on as its own line with its own price. "
            "The line prices must add up to the printed subtotal."
        )
    contents.extend(
        [
            "Receipt extraction JSON:\n" + json.dumps(extraction, indent=2),
            f"Split instructions:\n{instructions}",
            FUSION_USER_PROMPT,
        ]
    )
    thinking = types.ThinkingConfig(thinking_level="MINIMAL") if fast else None
    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=FUSION_SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=BillSplitResult,
            temperature=0.1,
            thinking_config=thinking,
        ),
    )
    return _parse_response(response)


def _timed(fn, *args):
    started = time.perf_counter()
    value = fn(*args)
    return value, round(time.perf_counter() - started, 3)


def split_bill_separated(
    receipt_path: str,
    *,
    audio_path: str | None = None,
    voice_text: str | None = None,
    model: str | None = None,
    nodes: str = "gemini",
) -> tuple[dict, dict]:
    """gemini = three Gemini calls. mixed = RapidOCR, Whisper, then Gemini on the text."""
    if nodes not in ("gemini", "mixed"):
        raise ValueError("nodes must be 'gemini' or 'mixed'.")
    if nodes == "mixed" and not audio_path and not voice_text:
        raise ValueError("Mixed nodes need a voice note or typed who-had-what.")
    if nodes == "gemini" and not voice_text and not audio_path:
        raise ValueError("Voice instructions are required.")

    model_name = model or DEFAULT_MODEL
    timings: dict[str, float] = {}
    parsed = None
    fusion_model = model_name

    t0 = time.perf_counter()
    if nodes == "mixed" and voice_text and not audio_path:
        extraction, ocr_model = read_receipt(receipt_path)
        restore_idr_extraction(extraction)
        timings["ocr_s"] = round(time.perf_counter() - t0, 3)
        instructions = voice_text
        speech_model = "typed_text"
        input_mode = "typed_text"
        timings["transcribe_s"] = 0.0
        parsed = assign_from_text(extraction, voice_text)
        if parsed is not None and prices_match_footer(extraction):
            fusion_model = "local_match"
            timings["fusion_s"] = 0.0
        else:
            parsed = None
    elif nodes == "mixed" and audio_path:
        with ThreadPoolExecutor(max_workers=2) as pool:
            ocr_job = pool.submit(_timed, read_receipt, receipt_path)
            speech_job = pool.submit(_timed, transcribe, audio_path, voice_text)
            (extraction, ocr_model), timings["ocr_s"] = ocr_job.result()
            (heard, speech_model), timings["transcribe_s"] = speech_job.result()
        restore_idr_extraction(extraction)
        if voice_text:
            instructions = (
                "Use these names and assignments. They were typed by the user.\n"
                + voice_text
                + "\n\nWhisper heard:\n"
                + heard
            )
        else:
            instructions = heard
        input_mode = "voice"
        if voice_text:
            parsed = assign_from_text(extraction, voice_text)
        if parsed is None:
            parsed = assign_from_text(extraction, heard)
        if parsed is not None and prices_match_footer(extraction):
            fusion_model = "local_match"
            timings["fusion_s"] = 0.0
            instructions = voice_text or heard
        else:
            parsed = None
    elif nodes == "mixed":
        extraction, ocr_model = read_receipt(receipt_path)
        restore_idr_extraction(extraction)
        timings["ocr_s"] = round(time.perf_counter() - t0, 3)
        instructions = voice_text
        speech_model = "typed_text"
        input_mode = "typed_text"
        timings["transcribe_s"] = 0.0
    else:
        client = build_client()
        extraction = extract_receipt(client, receipt_path, model_name)
        ocr_model = model_name
        restore_idr_extraction(extraction)
        timings["ocr_s"] = round(time.perf_counter() - t0, 3)
        t1 = time.perf_counter()
        if voice_text:
            instructions = voice_text
            speech_model = "typed_text"
            input_mode = "typed_text"
            timings["transcribe_s"] = 0.0
        else:
            instructions = transcribe_audio(client, audio_path, model_name)
            speech_model = model_name
            input_mode = "voice"
            timings["transcribe_s"] = round(time.perf_counter() - t1, 3)

    if parsed is None:
        client = build_client()
        t2 = time.perf_counter()
        parsed = fuse_extraction(
            client,
            extraction,
            instructions,
            model_name,
            fast=(nodes == "mixed"),
            receipt_path=receipt_path if nodes == "mixed" else None,
        )
        timings["fusion_s"] = round(time.perf_counter() - t2, 3)
        fusion_model = model_name

    idr_scaled = restore_idr_thousands(parsed)
    printed_footer = dict(parsed.get("receipt_summary") or {})
    normalize_shared_labels(parsed, instructions)
    result = recalc_proportional_tax_tip(parsed)
    flags = collect_error_flags(result, printed_footer=printed_footer)
    if idr_scaled:
        flags.append(dict(IDR_RESTORE_FLAG))

    debug = {
        "architecture": "separated",
        "nodes": nodes,
        "input_mode": input_mode,
        "model": model_name,
        "node_models": {
            "ocr": ocr_model,
            "speech": speech_model,
            "fusion": fusion_model,
        },
        "timings": timings,
        "extraction": extraction,
        "transcript": instructions,
        "printed_footer": printed_footer,
        "flags": flags,
    }
    return result, debug
