"""Recalculate bill splits with proportional tax and service charge allocation."""


def _round2(value: float) -> float:
    return round(float(value), 2)


def participant_items_total(participant: dict) -> float:
    return sum(float(item.get("item_cost") or 0) for item in participant.get("items_consumed", []))


def recalc_participant_total(participant: dict) -> None:
    items_total = participant_items_total(participant)
    tax_tip = float(participant.get("tax_and_tip_share") or 0)
    participant["total_owed"] = _round2(items_total + tax_tip)


def recalc_proportional_tax_tip(data: dict) -> dict:
    """Split GST and service charge proportionally by each person's food subtotal."""
    participants = data.get("participants", [])
    summary = data.get("receipt_summary", {})

    tax = float(summary.get("tax") or 0)
    tip = float(summary.get("tip") or 0)
    total_tax_tip = tax + tip

    item_totals = [participant_items_total(person) for person in participants]
    items_subtotal = _round2(sum(item_totals))

    summary["subtotal"] = items_subtotal
    summary["grand_total"] = _round2(items_subtotal + tax + tip)

    if not participants:
        return data

    if items_subtotal <= 0:
        share = _round2(total_tax_tip / len(participants)) if participants else 0
        assigned = 0.0
        for index, person in enumerate(participants):
            if index == len(participants) - 1:
                person["tax_and_tip_share"] = _round2(total_tax_tip - assigned)
            else:
                person["tax_and_tip_share"] = share
                assigned += share
            recalc_participant_total(person)
        return data

    assigned = 0.0
    for index, person in enumerate(participants):
        if index == len(participants) - 1:
            person["tax_and_tip_share"] = _round2(total_tax_tip - assigned)
        else:
            share = _round2(total_tax_tip * (item_totals[index] / items_subtotal))
            person["tax_and_tip_share"] = share
            assigned += share
        recalc_participant_total(person)

    return data
