"""Restore Indonesian rupiah amounts when OCR drops thousand separators.

Baku writing is Rp50.000,00 (PUEBI): dot groups thousands, comma plus
two digits is sen. Sen is dropped. JSON and the UI store whole rupiah
(50000), not 50 and not 50.000,00.

Models often parse 50.000,00 as 50. Restaurant IDR lines are almost
never below 1,000, so those truncated totals are scaled by 1,000.
"""

from __future__ import annotations

import re

IDR_CODES = {"IDR", "RP", "RUPIAH"}
SCALE = 1000
# Meals printed as Rp 56 would be implausible. Keep real small snacks (< 1000) unscaled
# only if the footer is already in thousands.
TRUNCATE_MAX = 1000

IDR_RESTORE_FLAG = {
    "code": "IDR_THOUSANDS_RESTORED",
    "severity": "warn",
    "message": (
        "Indonesian amounts looked like thousands were dropped "
        "(50 instead of Rp50.000,00). Values were multiplied by 1,000. "
        "Check the printed receipt."
    ),
}


_OFFICIAL = re.compile(r"^(\d{1,3}(?:\.\d{3})+)(?:,\d{2})?$")
_COMMA_THOUSANDS_SEN = re.compile(r"^(\d{1,3}(?:,\d{3})+),\d{2}$")
_COMMA_THOUSANDS = re.compile(r"^(\d{1,3}(?:,\d{3})+)$")
_K_OR_RIBU = re.compile(
    r"^(\d+(?:[.,]\d+)?)\s*(k|rb|ribu)$",
    re.IGNORECASE,
)


def parse_idr_printed(text: object) -> int | None:
    """Parse printed rupiah. Drops sen. Accepts baku and POS 50,000 / 50k."""
    raw = str(text or "").strip()
    raw = re.sub(r"^(rp|idr)\s*", "", raw, flags=re.IGNORECASE)
    raw = raw.replace(" ", "").replace(",-", "").replace(".-", "")
    if not raw:
        return None
    match = _OFFICIAL.fullmatch(raw)
    if match:
        return int(match.group(1).replace(".", ""))
    match = _COMMA_THOUSANDS_SEN.fullmatch(raw)
    if match:
        return int(match.group(1).replace(",", ""))
    match = _COMMA_THOUSANDS.fullmatch(raw)
    if match:
        return int(match.group(1).replace(",", ""))
    match = _K_OR_RIBU.fullmatch(raw)
    if match:
        amount = match.group(1).replace(".", "").replace(",", "")
        try:
            return int(float(amount) * 1000)
        except ValueError:
            return None
    return None


def is_idr(currency: object) -> bool:
    return str(currency or "").strip().upper() in IDR_CODES


def normalize_currency_code(data: dict) -> None:
    event = data.setdefault("event_details", {})
    if is_idr(event.get("currency")):
        event["currency"] = "IDR"


def _money_values(data: dict) -> list[float]:
    summary = data.get("receipt_summary") or {}
    values = [
        float(summary.get("subtotal") or 0),
        float(summary.get("tax") or 0),
        float(summary.get("tip") or 0),
        float(summary.get("grand_total") or 0),
    ]
    for person in data.get("participants") or []:
        values.append(float(person.get("tax_and_tip_share") or 0))
        values.append(float(person.get("total_owed") or 0))
        for item in person.get("items_consumed") or []:
            values.append(float(item.get("item_cost") or 0))
    return values


def looks_truncated_idr(data: dict) -> bool:
    if not is_idr((data.get("event_details") or {}).get("currency")):
        return False
    positives = [v for v in _money_values(data) if v > 0]
    if not positives:
        return False
    return max(positives) < TRUNCATE_MAX


def _scale_number(value: object) -> float:
    return float(value or 0) * SCALE


def restore_idr_thousands(data: dict) -> bool:
    """Multiply money fields by 1000 when IDR totals look truncated. Returns True if scaled."""
    normalize_currency_code(data)
    if not looks_truncated_idr(data):
        return False

    summary = data.setdefault("receipt_summary", {})
    for key in ("subtotal", "tax", "tip", "grand_total"):
        summary[key] = _scale_number(summary.get(key))

    for person in data.get("participants") or []:
        person["tax_and_tip_share"] = _scale_number(person.get("tax_and_tip_share"))
        person["total_owed"] = _scale_number(person.get("total_owed"))
        for item in person.get("items_consumed") or []:
            item["item_cost"] = _scale_number(item.get("item_cost"))
    return True


def restore_idr_extraction(extraction: dict) -> bool:
    """Scale OCR-only ReceiptExtraction the same way."""
    if is_idr(extraction.get("currency")):
        extraction["currency"] = "IDR"
    elif not is_idr(extraction.get("currency")):
        return False

    values = [
        float(extraction.get("subtotal") or 0),
        float(extraction.get("tax") or 0),
        float(extraction.get("tip") or 0),
        float(extraction.get("grand_total") or 0),
    ]
    for line in extraction.get("lines") or []:
        values.append(float(line.get("line_total") or 0))
    positives = [v for v in values if v > 0]
    if not positives or max(positives) >= TRUNCATE_MAX:
        return False

    for key in ("subtotal", "tax", "tip", "grand_total"):
        extraction[key] = _scale_number(extraction.get(key))
    for line in extraction.get("lines") or []:
        line["line_total"] = _scale_number(line.get("line_total"))
    return True
