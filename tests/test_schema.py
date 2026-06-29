"""Unit tests for Pydantic bill split schema validation."""

import unittest

from pydantic import ValidationError

from models.schema import BillSplitResult


VALID_PAYLOAD = {
  "event_details": {
    "title": "Sanook Kitchen",
    "date": "23/06/2026",
    "currency": "SGD",
  },
  "receipt_summary": {
    "subtotal": 37.00,
    "tax": 3.66,
    "tip": 3.70,
    "grand_total": 44.36,
  },
  "participants": [
    {
      "name": "Mevan",
      "items_consumed": [{"item_name": "Deep-fried Chicken with Thai Herb", "item_cost": 8.90}],
      "tax_and_tip_share": 2.90,
      "total_owed": 17.50,
    },
    {
      "name": "Winston",
      "items_consumed": [{"item_name": "Pineapple Fried Rice with Prawn", "item_cost": 7.90}],
      "tax_and_tip_share": 2.23,
      "total_owed": 13.43,
    },
    {
      "name": "Albert",
      "items_consumed": [{"item_name": "Honey Chicken Rice", "item_cost": 7.90}],
      "tax_and_tip_share": 2.23,
      "total_owed": 13.43,
    },
  ],
}


class SchemaTests(unittest.TestCase):
  def test_valid_payload_parses(self):
    result = BillSplitResult.model_validate(VALID_PAYLOAD)
    self.assertEqual(result.event_details.currency, "SGD")
    self.assertEqual(len(result.participants), 3)

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
