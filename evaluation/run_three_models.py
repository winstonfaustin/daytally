"""
One Sanook run with three different models.

  .venv\\Scripts\\python evaluation\\run_three_models.py
  .venv\\Scripts\\python evaluation\\run_three_models.py --audio path\\to\\note.wav

Needs GEMINI_API_KEY. OCR is RapidOCR. Speech is faster-whisper small.
Gemini only fuses the text. The wizard is not involved.

If you do not pass --audio, this writes a computer reading of the Sanook
who-had-what sentence so Whisper has a file. That is not a restaurant recording.
The result JSON says so.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env", override=True)

from evaluation.compare_architectures import score_run  # noqa: E402
from services.gemini_client import resolve_model  # noqa: E402
from services.separated_pipeline import split_bill_separated  # noqa: E402

EVAL_DIR = Path(__file__).parent
RESULTS_DIR = EVAL_DIR / "results"
AUDIO_DIR = EVAL_DIR / "audio"
SPOKEN_NOTE = (
    "Computer reading of the Sanook who-had-what text so Whisper has audio. "
    "Not a restaurant recording."
)


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def speak_to_wav(text: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    safe = text.replace("'", "''")
    wav = str(dest).replace("'", "''")
    script = (
        "Add-Type -AssemblyName System.Speech; "
        "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        f"$synth.SetOutputToWaveFile('{wav}'); "
        f"$synth.Speak('{safe}'); "
        "$synth.Dispose()"
    )
    subprocess.run(
        ["powershell", "-NoProfile", "-Command", script],
        check=True,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Sanook split with OCR, Whisper, and Gemini.")
    parser.add_argument("--audio", default="", help="wav/webm of who had what. Optional.")
    args = parser.parse_args()

    case = load_json(EVAL_DIR / "live_cases.json")[0]
    golden = {c["id"]: c for c in load_json(EVAL_DIR / "golden_cases.json")}[
        case.get("golden_id") or case["id"]
    ]
    receipt = ROOT / case["receipt"]
    if not receipt.exists():
        print("receipt missing:", receipt)
        return 1

    audio_note = ""
    if args.audio:
        audio_path = Path(args.audio)
        if not audio_path.exists():
            print("audio missing:", audio_path)
            return 1
    else:
        audio_path = AUDIO_DIR / "sanook_who_had_what.wav"
        print("No --audio passed. Speaking the Sanook assignment to", audio_path)
        speak_to_wav(case["voice_text"], audio_path)
        audio_note = SPOKEN_NOTE

    model = resolve_model()
    print("fusion model", model)
    print("receipt", receipt.name)
    print("audio", audio_path)

    started = time.perf_counter()
    try:
        result, debug = split_bill_separated(
            str(receipt),
            audio_path=str(audio_path),
            model=model,
            nodes="mixed",
        )
    except Exception as exc:
        elapsed = round(time.perf_counter() - started, 3)
        print(f"FAIL after {elapsed}s: {exc}")
        return 1

    elapsed = round(time.perf_counter() - started, 3)
    score = score_run(result, golden)
    print(
        f"latency={elapsed}s  schema={score['schema_ok']}  "
        f"names={score['names_ok']}  totals±0.01={score['totals_within_0_01']}"
    )
    print("nodes", debug.get("node_models"))
    print("step times", debug.get("timings"))
    print("transcript:", debug.get("transcript"))

    RESULTS_DIR.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_path = RESULTS_DIR / f"three_models_{stamp}.json"
    payload = {
        "created_utc": stamp,
        "latency_target_s": 10.0,
        "latency_s": elapsed,
        "audio": str(audio_path),
        "audio_note": audio_note,
        "node_models": debug.get("node_models"),
        "timings": debug.get("timings"),
        "transcript": debug.get("transcript"),
        "score": score,
        "flags": debug.get("flags"),
        "result": result,
    }
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("Saved", out_path)
    return 0 if score["totals_within_0_01"] and score["names_ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
