"""One-shot live multimodal test for Sanook Kitchen receipt (not part of offline suite)."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env", override=True)

from models.schema import BillSplitResult  # noqa: E402
from services.gemini_service import split_bill_from_uploads  # noqa: E402

RECEIPT = ROOT / "SANOOK.jpg"
VOICE_TEXT = (
    "Mevan had the 2 Thai fragrant steam rice and the deep-fried chicken with Thai herb. "
    "Winston had the pineapple fried rice. Albert had the honey chicken rice. "
    "Everyone shares the stir-fried beef with kai lan evenly between the three of us."
)

GROUND_TRUTH = {
    "Mevan": {"pre_tax": 14.60, "total_owed": 17.50},
    "Winston": {"pre_tax": 11.20, "total_owed": 13.43},
    "Albert": {"pre_tax": 11.20, "total_owed": 13.43},
}


def main() -> int:
    if not RECEIPT.exists():
        print(f"ERROR: receipt not found at {RECEIPT}")
        return 1

    print("Live multimodal test: sanook_kitchen")
    print("Receipt:", RECEIPT)
    print("Voice text:", VOICE_TEXT)
    print("-" * 60)

    start = time.perf_counter()
    try:
        result, debug = split_bill_from_uploads(str(RECEIPT), voice_text=VOICE_TEXT)
    except Exception as exc:
        elapsed = time.perf_counter() - start
        print(f"ERROR after {elapsed:.2f}s: {exc}")
        return 1
    elapsed = time.perf_counter() - start

    schema_ok = False
    schema_error = None
    try:
        BillSplitResult.model_validate(result)
        schema_ok = True
    except Exception as exc:
        schema_error = str(exc)

    print(f"Wall-clock latency: {elapsed:.2f} seconds")
    print(f"BillSplitResult validation (first attempt): {'PASS' if schema_ok else 'FAIL'}")
    if schema_error:
        print(f"Validation error: {schema_error}")
    print(f"Input mode: {debug.get('input_mode', 'unknown')}")
    print("-" * 60)
    print("Full response JSON:")
    print(json.dumps(result, indent=2))
    print("-" * 60)
    print("Per-person comparison vs calculator ground truth:")
    for person in result.get("participants", []):
        name = person["name"]
        gt = GROUND_TRUTH.get(name)
        model_total = float(person.get("total_owed", 0))
        items = person.get("items_consumed", [])
        items_total = sum(float(i.get("item_cost", 0)) for i in items)
        if gt:
            diff = round(model_total - gt["total_owed"], 2)
            print(
                f"  {name}: items={items_total:.2f} (gt pre-tax {gt['pre_tax']:.2f}), "
                f"tax_tip={person.get('tax_and_tip_share')}, total={model_total:.2f} "
                f"(gt {gt['total_owed']:.2f}), diff={diff:+.2f}"
            )
            for item in items:
                print(f"    - {item.get('item_name')}: ${item.get('item_cost')}")
        else:
            print(f"  {name}: UNEXPECTED PARTICIPANT, total={model_total:.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
