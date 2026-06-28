"""Unit tests for Pydantic bill split schema validation."""

import unittest

from pydantic import ValidationError

from models.schema import BillSplitResult


VALID_PAYLOAD = {
  "event_details": {
    "title": "White Restaurant",
    "date": "June 2026",
    "currency": "SGD",
  },
  "receipt_summary": {
    "subtotal": 49.20,
    "tax": 3.79,
    "tip": 4.92,
    "grand_total": 57.91,
  },
  "participants": [
    {
      "name": "Winston",
      "items_consumed": [{"item_name": "Dish A", "item_cost": 15.80}],
      "tax_and_tip_share": 2.80,
      "total_owed": 18.60,
    },
    {
      "name": "Hanzel",
      "items_consumed": [{"item_name": "Dish B", "item_cost": 33.40}],
      "tax_and_tip_share": 5.91,
      "total_owed": 39.31,
    },
  ],
}


class SchemaTests(unittest.TestCase):
  def test_valid_payload_parses(self):
    result = BillSplitResult.model_validate(VALID_PAYLOAD)
    self.assertEqual(result.event_details.currency, "SGD")
    self.assertEqual(len(result.participants), 2)

  def test_missing_participants_rejected(self):
    bad = dict(VALID_PAYLOAD)
    bad.pop("participants")
    with self.assertRaises(ValidationError):
      BillSplitResult.model_validate(bad)

  def test_invalid_currency_type_rejected(self):
    bad = dict(VALID_PAYLOAD)
    bad["event_details"] = dict(VALID_PAYLOAD["event_details"])
    bad["event_details"]["currency"] = 123
    with self.assertRaises(ValidationError):
      BillSplitResult.model_validate(bad)

  def test_negative_total_rejected_if_wrong_type(self):
    bad = dict(VALID_PAYLOAD)
    bad["receipt_summary"] = dict(VALID_PAYLOAD["receipt_summary"])
    bad["receipt_summary"]["grand_total"] = "not-a-number"
    with self.assertRaises(ValidationError):
      BillSplitResult.model_validate(bad)


if __name__ == "__main__":
  unittest.main()
