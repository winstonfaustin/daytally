"""
Run automated evaluation checks for DayTally.

Usage (from daytally folder):
  .venv\\Scripts\\python evaluation\\run_evaluation.py

This script does not call the Gemini API. It validates:
  - Pydantic schema compliance on sample payloads
  - Deterministic bill_calculator.py ground truth cases
  - unittest suite pass rate
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from models.schema import BillSplitResult  # noqa: E402
from services.bill_calculator import recalc_proportional_tax_tip  # noqa: E402


def load_golden_cases() -> list[dict]:
  path = Path(__file__).parent / "golden_cases.json"
  return json.loads(path.read_text(encoding="utf-8"))


def check_schema() -> tuple[int, int]:
  passed = 0
  total = 0
  sample = {
    "event_details": {"title": "Test", "date": "2026", "currency": "SGD"},
    "receipt_summary": {"subtotal": 10.0, "tax": 1.0, "tip": 1.0, "grand_total": 12.0},
    "participants": [
      {
        "name": "A",
        "items_consumed": [{"item_name": "x", "item_cost": 10.0}],
        "tax_and_tip_share": 2.0,
        "total_owed": 12.0,
      }
    ],
  }
  for _ in range(3):
    total += 1
    try:
      BillSplitResult.model_validate(sample)
      passed += 1
    except Exception:
      pass
  return passed, total


def check_golden_cases() -> tuple[int, int]:
  passed = 0
  total = 0
  for case in load_golden_cases():
    total += 1
    food = case["participant_food_totals"]
    participants = [
      {
        "name": name,
        "items_consumed": [{"item_name": "items", "item_cost": amount}],
        "tax_and_tip_share": 0,
        "total_owed": 0,
      }
      for name, amount in food.items()
    ]
    data = {
      "event_details": {
        "title": case.get("id", "case"),
        "date": "",
        "currency": case.get("expected_currency", "SGD"),
      },
      "receipt_summary": dict(case["receipt_summary"]),
      "participants": participants,
    }
    result = recalc_proportional_tax_tip(data)
    tol = float(case.get("tolerance", 0.01))
    ok = True
    for name, expected in case["expected_after_calculator"].items():
      person = next(p for p in result["participants"] if p["name"] == name)
      for field, target in expected.items():
        if abs(float(person[field]) - float(target)) > tol:
          ok = False
    if ok:
      passed += 1
    print(f"  [{'PASS' if ok else 'FAIL'}] {case['id']}")
  return passed, total


def run_unittests() -> bool:
  proc = subprocess.run(
    [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-q"],
    cwd=ROOT,
    capture_output=True,
    text=True,
  )
  if proc.stdout:
    print(proc.stdout.strip())
  if proc.stderr:
    print(proc.stderr.strip())
  return proc.returncode == 0


def main() -> int:
  print("DayTally automated evaluation (offline)")
  print("=" * 40)

  schema_pass, schema_total = check_schema()
  print(f"\nSchema validation: {schema_pass}/{schema_total} sample payloads accepted")

  print("\nGolden calculator cases:")
  golden_pass, golden_total = check_golden_cases()
  print(f"Calculator ground truth: {golden_pass}/{golden_total} cases passed")

  print("\nUnit test suite:")
  tests_ok = run_unittests()
  print("Unit tests:", "ALL PASSED" if tests_ok else "FAILED")

  print("\n" + "=" * 40)
  print("Offline suite complete. For live architecture comparison:")
  print("  python evaluation/compare_architectures.py")
  return 0 if tests_ok and golden_pass == golden_total else 1


if __name__ == "__main__":
  raise SystemExit(main())
