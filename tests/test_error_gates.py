"""Offline tests for combined-stage error flags."""

import unittest

from services.error_gates import collect_error_flags


class ErrorGateTests(unittest.TestCase):
    def test_subtotal_drift_when_assigned_items_miss_a_line(self):
        data = {
            "receipt_summary": {"subtotal": 20.0, "tax": 0, "tip": 0, "grand_total": 20.0},
            "participants": [
                {
                    "name": "A",
                    "items_consumed": [{"item_name": "x", "item_cost": 10.0}],
                    "tax_and_tip_share": 0,
                    "total_owed": 10.0,
                }
            ],
        }
        flags = collect_error_flags(data, printed_footer={"subtotal": 20.0, "grand_total": 20.0})
        codes = [f["code"] for f in flags]
        self.assertIn("SUBTOTAL_DRIFT", codes)

    def test_no_flags_when_footer_matches_assignment(self):
        data = {
            "receipt_summary": {"subtotal": 10.0, "tax": 0, "tip": 0, "grand_total": 10.0},
            "participants": [
                {
                    "name": "A",
                    "items_consumed": [{"item_name": "x", "item_cost": 10.0}],
                    "tax_and_tip_share": 0,
                    "total_owed": 10.0,
                }
            ],
        }
        flags = collect_error_flags(data, printed_footer={"subtotal": 10.0, "grand_total": 10.0})
        self.assertEqual(flags, [])

    def test_unexpected_and_missing_names(self):
        data = {
            "receipt_summary": {"subtotal": 10.0, "tax": 0, "tip": 0, "grand_total": 10.0},
            "participants": [
                {
                    "name": "Eve",
                    "items_consumed": [{"item_name": "x", "item_cost": 10.0}],
                    "tax_and_tip_share": 0,
                    "total_owed": 10.0,
                }
            ],
        }
        flags = collect_error_flags(data, expected_names=["Mevan", "Winston"])
        codes = [f["code"] for f in flags]
        self.assertIn("UNEXPECTED_NAME", codes)
        self.assertIn("MISSING_NAME", codes)
