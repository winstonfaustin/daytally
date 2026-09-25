"""Spoken who-had-what to text. faster-whisper, not Gemini."""

from __future__ import annotations

import os

# small is the measured PC model. The public server sets WHISPER_SIZE=distil-small.en.
WHISPER_SIZE = os.getenv("WHISPER_SIZE", "small")
WHISPER_MODEL = f"faster-whisper-{WHISPER_SIZE}"

_model = None


def transcribe(path: str, hint: str | None = None) -> tuple[str, str]:
    global _model
    from faster_whisper import WhisperModel

    if _model is None:
        _model = WhisperModel(WHISPER_SIZE, device="cpu", compute_type="int8")
    segments, _info = _model.transcribe(
        path,
        language="en",
        initial_prompt=hint or None,
        beam_size=1,
        vad_filter=True,
        without_timestamps=True,
    )
    text = " ".join(segment.text.strip() for segment in segments).strip()
    if not text:
        raise RuntimeError("Whisper returned an empty transcript.")
    return text, WHISPER_MODEL
