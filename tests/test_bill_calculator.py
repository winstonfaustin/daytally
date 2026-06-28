"""Unit tests for proportional GST and service charge allocation."""

import unittest

from services.bill_calculator import recalc_proportional_tax_tip


def _base_participants():
    return [
        {
            "name": "Winston",
            "items_consumed": [{"item_name": "items", "item_cost": 15.80}],
            "tax_and_tip_share": 0,
            "total_owed": 0,
        },
        {
            "name": "Hanzel",
            "items_consumed": [{"item_name": "items", "item_cost": 33.40}],
            "tax_and_tip_share": 0,
            "total_owed": 0,
        },
    ]


class BillCalculatorTests(unittest.TestCase):
  def test_white_restaurant_proportional_split(self):
    """Ground truth from informal White Restaurant receipt evaluation."""
    data = {
      "receipt_summary": {
        "subtotal": 49.20,
        "tax": 3.79,
        "tip": 4.92,
        "grand_total": 57.91,
      },
      "participants": _base_participants(),
    }
    result = recalc_proportional_tax_tip(data)
    winston = result["participants"][0]
    hanzel = result["participants"][1]

    self.assertEqual(winston["tax_and_tip_share"], 2.80)
    self.assertEqual(winston["total_owed"], 18.60)
    self.assertEqual(hanzel["tax_and_tip_share"], 5.91)
    self.assertEqual(hanzel["total_owed"], 39.31)
    self.assertEqual(result["receipt_summary"]["grand_total"], 57.91)

  def test_participant_totals_sum_to_grand_total(self):
    data = {
      "receipt_summary": {
        "subtotal": 49.20,
        "tax": 3.79,
        "tip": 4.92,
        "grand_total": 57.91,
      },
      "participants": _base_participants(),
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


if __name__ == "__main__":
  unittest.main()
