"""IDR thousand-separator restore."""

import unittest

from services.bill_calculator import recalc_proportional_tax_tip
from services.idr_amounts import (
    looks_truncated_idr,
    parse_idr_printed,
    restore_idr_extraction,
    restore_idr_thousands,
)


class IdrAmountTests(unittest.TestCase):
    def test_parse_official_rp50_000_00_drops_sen(self):
        self.assertEqual(parse_idr_printed("Rp50.000,00"), 50000)
        self.assertEqual(parse_idr_printed("50.000,00"), 50000)
        self.assertEqual(parse_idr_printed("56.000,00"), 56000)
        self.assertEqual(parse_idr_printed("56,000,00"), 56000)
        self.assertEqual(parse_idr_printed("56.000"), 56000)
        self.assertEqual(parse_idr_printed("50,000"), 50000)
        self.assertEqual(parse_idr_printed("50k"), 50000)
        self.assertEqual(parse_idr_printed("50 rb"), 50000)
        self.assertEqual(parse_idr_printed("50ribu"), 50000)

    def test_scales_56_to_56000(self):
        data = {
            "event_details": {"title": "Warung", "date": "2026", "currency": "IDR"},
            "receipt_summary": {
                "subtotal": 56.0,
                "tax": 0,
                "tip": 0,
                "grand_total": 56.0,
            },
            "participants": [
                {
                    "name": "A",
                    "items_consumed": [{"item_name": "Nasi", "item_cost": 56.0}],
                    "tax_and_tip_share": 0,
                    "total_owed": 56.0,
                }
            ],
        }
        self.assertTrue(looks_truncated_idr(data))
        self.assertTrue(restore_idr_thousands(data))
        self.assertEqual(data["participants"][0]["items_consumed"][0]["item_cost"], 56000)
        self.assertEqual(data["receipt_summary"]["grand_total"], 56000)

    def test_does_not_scale_already_thousands(self):
        data = {
            "event_details": {"currency": "IDR"},
            "receipt_summary": {
                "subtotal": 56000,
                "tax": 0,
                "tip": 0,
                "grand_total": 56000,
            },
            "participants": [
                {
                    "name": "A",
                    "items_consumed": [{"item_name": "Nasi", "item_cost": 56000}],
                    "tax_and_tip_share": 0,
                    "total_owed": 56000,
                }
            ],
        }
        self.assertFalse(restore_idr_thousands(data))
        self.assertEqual(data["receipt_summary"]["grand_total"], 56000)

    def test_does_not_scale_sgd(self):
        data = {
            "event_details": {"currency": "SGD"},
            "receipt_summary": {
                "subtotal": 56.0,
                "tax": 0,
                "tip": 0,
                "grand_total": 56.0,
            },
            "participants": [
                {
                    "name": "A",
                    "items_consumed": [{"item_name": "x", "item_cost": 56.0}],
                    "tax_and_tip_share": 0,
                    "total_owed": 56.0,
                }
            ],
        }
        self.assertFalse(restore_idr_thousands(data))
        self.assertEqual(data["receipt_summary"]["grand_total"], 56.0)

    def test_extraction_scales_line_totals(self):
        extraction = {
            "merchant": "Warung",
            "date": "2026",
            "currency": "IDR",
            "lines": [{"item_name": "Nasi", "quantity": "1", "line_total": 56.0}],
            "subtotal": 56.0,
            "tax": 0,
            "tip": 0,
            "grand_total": 56.0,
        }
        self.assertTrue(restore_idr_extraction(extraction))
        self.assertEqual(extraction["lines"][0]["line_total"], 56000)

    def test_calculator_keeps_whole_rupiah(self):
        data = {
            "event_details": {"currency": "IDR"},
            "receipt_summary": {"subtotal": 0, "tax": 11000, "tip": 0, "grand_total": 0},
            "participants": [
                {
                    "name": "A",
                    "items_consumed": [{"item_name": "x", "item_cost": 56000}],
                    "tax_and_tip_share": 0,
                    "total_owed": 0,
                },
                {
                    "name": "B",
                    "items_consumed": [{"item_name": "y", "item_cost": 56000}],
                    "tax_and_tip_share": 0,
                    "total_owed": 0,
                },
            ],
        }
        recalc_proportional_tax_tip(data)
        self.assertEqual(data["receipt_summary"]["subtotal"], 112000)
        for person in data["participants"]:
            self.assertEqual(person["tax_and_tip_share"], int(person["tax_and_tip_share"]))
            self.assertEqual(person["total_owed"], int(person["total_owed"]))


if __name__ == "__main__":
    unittest.main()
