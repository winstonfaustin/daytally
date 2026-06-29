"""Recalculate bill splits with proportional tax and service charge allocation."""

from decimal import Decimal, ROUND_HALF_UP

_CENT = Decimal("0.01")


def _to_decimal(value: float | int | str) -> Decimal:
    return Decimal(str(value))


def _round2(value: float | Decimal) -> float:
    return float(_to_decimal(value).quantize(_CENT, rounding=ROUND_HALF_UP))


def _allocate_pool(pool: Decimal, weights: list[Decimal]) -> list[Decimal]:
    """Split a dollar pool across weights using ROUND_HALF_UP; last person gets remainder."""
    if not weights:
        return []
    weight_sum = sum(weights)
    if weight_sum <= 0:
        even = (pool / len(weights)).quantize(_CENT, rounding=ROUND_HALF_UP)
        shares = [even] * len(weights)
        shares[-1] = pool - sum(shares[:-1])
        return shares

    assigned = Decimal("0")
    shares: list[Decimal] = []
    for index, weight in enumerate(weights):
        if index == len(weights) - 1:
            share = pool - assigned
        else:
            share = (pool * weight / weight_sum).quantize(_CENT, rounding=ROUND_HALF_UP)
            assigned += share
        shares.append(share)
    return shares


def participant_items_total(participant: dict) -> float:
    return sum(float(item.get("item_cost") or 0) for item in participant.get("items_consumed", []))


def recalc_participant_total(participant: dict) -> None:
    items_total = participant_items_total(participant)
    tax_tip = float(participant.get("tax_and_tip_share") or 0)
    participant["total_owed"] = _round2(items_total + tax_tip)


def recalc_proportional_tax_tip(data: dict) -> dict:
    """Split service charge by food subtotal, then GST by food plus service share."""
    participants = data.get("participants", [])
    summary = data.get("receipt_summary", {})

    tax = _to_decimal(summary.get("tax") or 0)
    tip = _to_decimal(summary.get("tip") or 0)

    item_totals = [_to_decimal(participant_items_total(person)) for person in participants]
    items_subtotal = sum(item_totals)

    summary["subtotal"] = _round2(items_subtotal)
    summary["grand_total"] = _round2(items_subtotal + tax + tip)

    if not participants:
        return data

    if items_subtotal <= 0:
        service_shares = _allocate_pool(tip, item_totals)
        gst_shares = _allocate_pool(tax, item_totals)
        for person, service_share, gst_share in zip(participants, service_shares, gst_shares):
            person["tax_and_tip_share"] = _round2(service_share + gst_share)
            recalc_participant_total(person)
        return data

    service_shares = _allocate_pool(tip, item_totals)
    gst_bases = [food + service for food, service in zip(item_totals, service_shares)]
    gst_shares = _allocate_pool(tax, gst_bases)

    for person, service_share, gst_share in zip(participants, service_shares, gst_shares):
        person["tax_and_tip_share"] = _round2(service_share + gst_share)
        recalc_participant_total(person)

    return data
