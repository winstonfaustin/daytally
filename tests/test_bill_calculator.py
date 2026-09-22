"""Unit tests for proportional GST and service charge allocation."""

import unittest

from services.bill_calculator import normalize_shared_labels, recalc_proportional_tax_tip


def _sanook_participants():
    return [
        {
            "name": "Mevan",
            "items_consumed": [{"item_name": "items", "item_cost": 14.60}],
            "tax_and_tip_share": 0,
            "total_owed": 0,
        },
        {
            "name": "Winston",
            "items_consumed": [{"item_name": "items", "item_cost": 11.20}],
            "tax_and_tip_share": 0,
            "total_owed": 0,
        },
        {
            "name": "Albert",
            "items_consumed": [{"item_name": "items", "item_cost": 11.20}],
            "tax_and_tip_share": 0,
            "total_owed": 0,
        },
    ]


def _sanook_summary():
    return {
        "subtotal": 37.00,
        "tax": 3.66,
        "tip": 3.70,
        "grand_total": 44.36,
    }


class BillCalculatorTests(unittest.TestCase):
  def test_sanook_kitchen_proportional_split(self):
    """Ground truth from Sanook Kitchen receipt with proportional GST and service charge."""
    data = {
      "receipt_summary": _sanook_summary(),
      "participants": _sanook_participants(),
    }
    result = recalc_proportional_tax_tip(data)
    by_name = {p["name"]: p for p in result["participants"]}

    self.assertEqual(by_name["Mevan"]["tax_and_tip_share"], 2.90)
    self.assertEqual(by_name["Mevan"]["total_owed"], 17.50)
    self.assertEqual(by_name["Winston"]["tax_and_tip_share"], 2.23)
    self.assertEqual(by_name["Winston"]["total_owed"], 13.43)
    self.assertEqual(by_name["Albert"]["tax_and_tip_share"], 2.23)
    self.assertEqual(by_name["Albert"]["total_owed"], 13.43)
    self.assertEqual(result["receipt_summary"]["grand_total"], 44.36)

  def test_participant_totals_sum_to_grand_total(self):
    data = {
      "receipt_summary": _sanook_summary(),
      "participants": _sanook_participants(),
    }
    result = recalc_proportional_tax_tip(data)
    owed_sum = sum(p["total_owed"] for p in result["participants"])
    self.assertAlmostEqual(owed_sum, result["receipt_summary"]["grand_total"], places=2)

  def test_even_split_when_food_subtotal_is_zero(self):
    data = {
      "receipt_summary": {"subtotal": 0, "tax": 6.00, "tip": 6.00, "grand_total": 12.00},
      "participants": [
        {"name": "A", "items_consumed": [], "tax_and_tip_share": 0, "total_owed": 0},
        {"name": "B", "items_consumed": [], "tax_and_tip_share": 0, "total_owed": 0},
        {"name": "C", "items_consumed": [], "tax_and_tip_share": 0, "total_owed": 0},
      ],
    }
    result = recalc_proportional_tax_tip(data)
    shares = [p["tax_and_tip_share"] for p in result["participants"]]
    self.assertEqual(shares, [4.00, 4.00, 4.00])

  def test_three_way_proportional_split(self):
    data = {
      "receipt_summary": {"subtotal": 60.00, "tax": 5.40, "tip": 0, "grand_total": 65.40},
      "participants": [
        {
          "name": "A",
          "items_consumed": [{"item_name": "x", "item_cost": 20.00}],
          "tax_and_tip_share": 0,
          "total_owed": 0,
        },
        {
          "name": "B",
          "items_consumed": [{"item_name": "y", "item_cost": 20.00}],
          "tax_and_tip_share": 0,
          "total_owed": 0,
        },
        {
          "name": "C",
          "items_consumed": [{"item_name": "z", "item_cost": 20.00}],
          "tax_and_tip_share": 0,
          "total_owed": 0,
        },
      ],
    }
    result = recalc_proportional_tax_tip(data)
    for person in result["participants"]:
      self.assertEqual(person["tax_and_tip_share"], 1.80)
      self.assertEqual(person["total_owed"], 21.80)


class SharedLabelTests(unittest.TestCase):
  def test_strips_shared_when_form_has_no_share_phrase(self):
    data = {
      "participants": [
        {
          "name": "Alice",
          "items_consumed": [{"item_name": "TEH O ICE (shared)", "item_cost": 1.8}],
        },
        {
          "name": "Bob",
          "items_consumed": [{"item_name": "TEH O ICE (shared)", "item_cost": 1.8}],
        },
      ]
    }
    normalize_shared_labels(
      data, "Alice had Teh O Ice. Bob had Teh O Ice."
    )
    self.assertEqual(data["participants"][0]["items_consumed"][0]["item_name"], "TEH O ICE")
    self.assertEqual(data["participants"][1]["items_consumed"][0]["item_name"], "TEH O ICE")

  def test_keeps_shared_when_explicit(self):
    data = {
      "participants": [
        {
          "name": "Alice",
          "items_consumed": [{"item_name": "Fries (shared)", "item_cost": 2.0}],
        }
      ]
    }
    normalize_shared_labels(data, "We all shared Fries. Alice had burger.")
    self.assertEqual(data["participants"][0]["items_consumed"][0]["item_name"], "Fries (shared)")


if __name__ == "__main__":
  unittest.main()
