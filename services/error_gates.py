"""Flag combined-stage errors without forcing the user to re-enter the bill.

These gates compare the printed footer with assigned line items after
deterministic recalculation.
"""

from __future__ import annotations

from services.bill_calculator import participant_items_total

TOLERANCE = 0.02


def _round2(value: float) -> float:
    return round(float(value) + 1e-9, 2)


def collect_error_flags(
    data: dict,
    *,
    printed_footer: dict | None = None,
    expected_names: list[str] | None = None,
) -> list[dict]:
    flags: list[dict] = []
    participants = data.get("participants") or []
    summary = data.get("receipt_summary") or {}
    assigned = _round2(sum(participant_items_total(p) for p in participants))
    printed = printed_footer or {}

    printed_sub = printed.get("subtotal")
    if printed_sub is not None and abs(assigned - float(printed_sub)) > TOLERANCE:
        flags.append(
            {
                "code": "SUBTOTAL_DRIFT",
                "severity": "warn",
                "message": (
                    f"Assigned items sum to {assigned:.2f} but the receipt footer "
                    f"showed {float(printed_sub):.2f}. Check a missing or duplicated line."
                ),
            }
        )

    printed_grand = printed.get("grand_total")
    calc_grand = summary.get("grand_total")
    if (
        printed_grand is not None
        and calc_grand is not None
        and abs(float(calc_grand) - float(printed_grand)) > TOLERANCE
    ):
        flags.append(
            {
                "code": "GRAND_TOTAL_DRIFT",
                "severity": "warn",
                "message": (
                    f"Recalculated grand total {float(calc_grand):.2f} differs from "
                    f"printed {float(printed_grand):.2f}."
                ),
            }
        )

    empty = [p.get("name", "").strip() or "(unnamed)" for p in participants if not p.get("items_consumed")]
    if empty:
        flags.append(
            {
                "code": "EMPTY_PARTICIPANT",
                "severity": "warn",
                "message": f"No items assigned to: {', '.join(empty)}.",
            }
        )

    names = [str(p.get("name") or "").strip() for p in participants]
    if expected_names:
        expected = {n.strip().lower() for n in expected_names}
        extra = [n for n in names if n.lower() not in expected]
        missing = [n for n in expected_names if n.strip().lower() not in {x.lower() for x in names}]
        if extra:
            flags.append(
                {
                    "code": "UNEXPECTED_NAME",
                    "severity": "warn",
                    "message": f"Names not in the instructions: {', '.join(extra)}.",
                }
            )
        if missing:
            flags.append(
                {
                    "code": "MISSING_NAME",
                    "severity": "warn",
                    "message": f"Instructions named people who are missing: {', '.join(missing)}.",
                }
            )

    if not participants:
        flags.append(
            {
                "code": "NO_PARTICIPANTS",
                "severity": "error",
                "message": "No participants were returned. Re-run or type the split instructions.",
            }
        )

    return flags
