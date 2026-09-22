"""Recalculate bill splits with proportional tax and service charge allocation."""

from __future__ import annotations

import re
from decimal import Decimal, ROUND_HALF_UP

from services.idr_amounts import is_idr

_CENT = Decimal("0.01")
_RUPIAH = Decimal("1")

_SHARED_CUE = re.compile(
    r"\bshared\b|"
    r"we all share|"
    r"everyone shares?|"
    r"split (?:the |this )?(?:between|among|with)\b|"
    r"between (?:us|all of us)\b",
    re.IGNORECASE,
)
_SHARED_SUFFIX = re.compile(r"\s*\(\s*shared\s*\)\s*$", re.IGNORECASE)


def _to_decimal(value: float | int | str) -> Decimal:
    return Decimal(str(value))


def _quantum(data: dict | None = None) -> Decimal:
    currency = ((data or {}).get("event_details") or {}).get("currency")
    return _RUPIAH if is_idr(currency) else _CENT


def _round_money(value: float | Decimal, quantum: Decimal = _CENT) -> float:
    return float(_to_decimal(value).quantize(quantum, rounding=ROUND_HALF_UP))


def _round2(value: float | Decimal) -> float:
    return _round_money(value, _CENT)


def _allocate_pool(
    pool: Decimal, weights: list[Decimal], quantum: Decimal = _CENT
) -> list[Decimal]:
    """Split a dollar pool across weights using ROUND_HALF_UP; last person gets remainder."""
    if not weights:
        return []
    weight_sum = sum(weights)
    if weight_sum <= 0:
        even = (pool / len(weights)).quantize(quantum, rounding=ROUND_HALF_UP)
        shares = [even] * len(weights)
        shares[-1] = pool - sum(shares[:-1])
        return shares

    assigned = Decimal("0")
    shares: list[Decimal] = []
    for index, weight in enumerate(weights):
        if index == len(weights) - 1:
            share = pool - assigned
        else:
            share = (pool * weight / weight_sum).quantize(quantum, rounding=ROUND_HALF_UP)
            assigned += share
        shares.append(share)
    return shares


def participant_items_total(participant: dict) -> float:
    return sum(float(item.get("item_cost") or 0) for item in participant.get("items_consumed", []))


def instructions_mark_shared(instructions: str | None) -> bool:
    """True only when the user explicitly said something was shared."""
    text = str(instructions or "").strip()
    if not text:
        return False
    return bool(_SHARED_CUE.search(text))


def normalize_shared_labels(data: dict, instructions: str | None = None) -> dict:
    """Strip '(shared)' from item names unless instructions explicitly mentioned sharing.

    Only applies when typed/transcript instructions are available. Receipt qty>1 + same
    drink on two people is not 'shared' — only the Shared form field / phrases like
    'we all shared' should keep the label.
    """
    text = str(instructions or "").strip()
    if not text:
        return data
    if instructions_mark_shared(text):
        return data
    for person in data.get("participants") or []:
        for item in person.get("items_consumed") or []:
            name = str(item.get("item_name") or "")
            cleaned = _SHARED_SUFFIX.sub("", name).strip()
            if cleaned:
                item["item_name"] = cleaned
    return data


def recalc_participant_total(participant: dict, quantum: Decimal = _CENT) -> None:
    items_total = participant_items_total(participant)
    tax_tip = float(participant.get("tax_and_tip_share") or 0)
    participant["total_owed"] = _round_money(items_total + tax_tip, quantum)


def recalc_proportional_tax_tip(data: dict) -> dict:
    """Split service charge by food subtotal, then GST by food plus service share."""
    participants = data.get("participants", [])
    summary = data.get("receipt_summary", {})
    quantum = _quantum(data)

    tax = _to_decimal(summary.get("tax") or 0)
    tip = _to_decimal(summary.get("tip") or 0)

    item_totals = [_to_decimal(participant_items_total(person)) for person in participants]
    items_subtotal = sum(item_totals)

    summary["subtotal"] = _round_money(items_subtotal, quantum)
    summary["grand_total"] = _round_money(items_subtotal + tax + tip, quantum)

    if not participants:
        return data

    if items_subtotal <= 0:
        service_shares = _allocate_pool(tip, item_totals, quantum)
        gst_shares = _allocate_pool(tax, item_totals, quantum)
        for person, service_share, gst_share in zip(participants, service_shares, gst_shares):
            person["tax_and_tip_share"] = _round_money(service_share + gst_share, quantum)
            recalc_participant_total(person, quantum)
        return data

    service_shares = _allocate_pool(tip, item_totals, quantum)
    gst_bases = [food + service for food, service in zip(item_totals, service_shares)]
    gst_shares = _allocate_pool(tax, gst_bases, quantum)

    for person, service_share, gst_share in zip(participants, service_shares, gst_shares):
        person["tax_and_tip_share"] = _round_money(service_share + gst_share, quantum)
        recalc_participant_total(person, quantum)

    return data
