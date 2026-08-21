"""
Live comparison of the unified call and the separated bill path.

Does call the Gemini API. Needs GEMINI_API_KEY in .env.

Usage (from the daytally folder):
  .venv\\Scripts\\python evaluation\\compare_architectures.py
  .venv\\Scripts\\python evaluation\\compare_architectures.py --models gemini-2.5-flash gemini-2.5-pro
  .venv\\Scripts\\python evaluation\\compare_architectures.py --architectures unified separated

Compares unified (one multimodal call) vs separated (OCR + transcript + fusion)
on the same live_cases.json inputs. Scores totals against golden_cases.json.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env", override=True)

from models.schema import BillSplitResult  # noqa: E402
from services.bill_calculator import participant_items_total  # noqa: E402
from services.gemini_service import split_bill_from_uploads  # noqa: E402
from services.separated_pipeline import split_bill_separated  # noqa: E402

EVAL_DIR = Path(__file__).parent
RESULTS_DIR = EVAL_DIR / "results"
TOLERANCE = 0.01


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def score_run(result: dict, golden: dict) -> dict:
    expected = golden["expected_after_calculator"]
    names_ok = True
    totals_ok = True
    details = []
    by_name = {p["name"]: p for p in result.get("participants", [])}

    for name, fields in expected.items():
        person = by_name.get(name)
        if person is None:
            names_ok = False
            totals_ok = False
            details.append({"name": name, "status": "missing"})
            continue
        model_total = float(person.get("total_owed") or 0)
        gt_total = float(fields["total_owed"])
        food = participant_items_total(person)
        gt_food = float(golden["participant_food_totals"][name])
        total_pass = abs(model_total - gt_total) <= TOLERANCE
        food_pass = abs(food - gt_food) <= 0.05
        if not total_pass:
            totals_ok = False
        details.append(
            {
                "name": name,
                "food": food,
                "food_gt": gt_food,
                "total": model_total,
                "total_gt": gt_total,
                "total_pass": total_pass,
                "food_pass": food_pass,
            }
        )

    schema_ok = True
    try:
        BillSplitResult.model_validate(result)
    except Exception:
        schema_ok = False

    return {
        "schema_ok": schema_ok,
        "names_ok": names_ok,
        "totals_within_0_01": totals_ok,
        "people": details,
    }


def run_one(architecture: str, case: dict, model: str) -> dict:
    receipt = ROOT / case["receipt"]
    if not receipt.exists():
        return {
            "ok": False,
            "error": f"receipt missing: {receipt}",
            "latency_s": None,
        }

    start = time.perf_counter()
    try:
        if architecture == "unified":
            result, debug = split_bill_from_uploads(
                str(receipt),
                voice_text=case["voice_text"],
                model=model,
            )
        elif architecture == "separated":
            result, debug = split_bill_separated(
                str(receipt),
                voice_text=case["voice_text"],
                model=model,
            )
        else:
            raise ValueError(f"Unknown architecture: {architecture}")
        elapsed = round(time.perf_counter() - start, 3)
        return {
            "ok": True,
            "latency_s": elapsed,
            "result": result,
            "debug": debug,
            "error": None,
        }
    except Exception as exc:
        elapsed = round(time.perf_counter() - start, 3)
        return {
            "ok": False,
            "latency_s": elapsed,
            "result": None,
            "debug": None,
            "error": str(exc),
        }


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare unified vs separated bill-split pipelines.")
    parser.add_argument(
        "--models",
        nargs="+",
        default=["gemini-2.5-flash"],
        help="Gemini model ids to test",
    )
    parser.add_argument(
        "--architectures",
        nargs="+",
        default=["unified", "separated"],
        help="Pipelines to run",
    )
    args = parser.parse_args()

    live_cases = load_json(EVAL_DIR / "live_cases.json")
    golden_by_id = {c["id"]: c for c in load_json(EVAL_DIR / "golden_cases.json")}

    rows = []
    print("DayTally architecture comparison (LIVE API)")
    print("=" * 60)

    for case in live_cases:
        golden = golden_by_id.get(case.get("golden_id") or case["id"])
        for architecture in args.architectures:
            for model in args.models:
                label = f"{case['id']} | {architecture} | {model}"
                print(f"\nRunning {label}")
                raw = run_one(architecture, case, model)
                row = {
                    "case_id": case["id"],
                    "architecture": architecture,
                    "model": model,
                    "ok": raw["ok"],
                    "latency_s": raw["latency_s"],
                    "error": raw["error"],
                    "flags": (raw.get("debug") or {}).get("flags") or [],
                    "score": None,
                }
                if raw["ok"] and golden:
                    row["score"] = score_run(raw["result"], golden)
                    s = row["score"]
                    print(
                        f"  latency={raw['latency_s']:.2f}s  schema={s['schema_ok']}  "
                        f"names={s['names_ok']}  totals±0.01={s['totals_within_0_01']}"
                    )
                elif raw["ok"]:
                    print(f"  latency={raw['latency_s']:.2f}s  (no golden case to score)")
                else:
                    print(f"  FAIL after {raw['latency_s']:.2f}s: {raw['error']}")
                rows.append(row)

    RESULTS_DIR.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_path = RESULTS_DIR / f"compare_{stamp}.json"
    payload = {
        "created_utc": stamp,
        "latency_target_s": 10.0,
        "models": args.models,
        "architectures": args.architectures,
        "rows": rows,
    }
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("\nSaved", out_path)
    return 0 if all(r["ok"] for r in rows) else 1


if __name__ == "__main__":
    raise SystemExit(main())
