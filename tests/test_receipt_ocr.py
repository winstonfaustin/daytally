"""OCR line joining. No model download."""

import tempfile
import unittest
from pathlib import Path

from PIL import Image

from services.receipt_ocr import lines_to_extraction, prices_match_footer, shrink_for_ocr


SANOOK_LINES = [
    "Sanook Kitchen",
    "Date:23/06/202607:38:01PM",
    "Holland Village",
    "GST: 200711627G",
    "1",
    "503 Deep-fried Chicken with",
    "8.90",
    "Thai Herb",
    "2",
    "709 Thai Fragrant Steam",
    "2.40",
    "Rice",
    "1",
    "701 Pineapple Fried Rice with",
    "7.90",
    "Prawn",
    "1",
    "507 Stir-fried Beef with Kai",
    "9.90",
    "Lan",
    "1",
    "704 Honey Chicken Rice",
    "7.90",
    "Sub Total",
    "37.00",
    "SERVICE CHARGE 10%",
    "3.70",
    "GST 9%",
    "3.66",
    "Total",
    "44.36",
    "VISA",
    "44.36",
]


class ReceiptOcrParseTests(unittest.TestCase):
    def test_sanook_columns_join_into_priced_lines(self):
        data = lines_to_extraction(SANOOK_LINES)
        self.assertEqual(data["currency"], "SGD")
        self.assertEqual(data["subtotal"], 37.00)
        self.assertEqual(data["tip"], 3.70)
        self.assertEqual(data["tax"], 3.66)
        self.assertEqual(data["grand_total"], 44.36)
        self.assertEqual(data["date"], "23/06/2026")
        self.assertEqual(len(data["lines"]), 5)
        self.assertEqual(data["lines"][0]["line_total"], 8.90)
        self.assertIn("Thai Herb", data["lines"][0]["item_name"])
        self.assertEqual(data["lines"][1]["line_total"], 2.40)
        self.assertIn("Rice", data["lines"][1]["item_name"])
        self.assertEqual(data["lines"][3]["line_total"], 9.90)
        self.assertIn("Lan", data["lines"][3]["item_name"])

    def test_two_identical_idr_rows_both_stay(self):
        lines = [
            "1 ICED LYCHEE TEA 39,000",
            "1 ICED LYCHEE TEA 39,000",
            "1 AGLIO OLIO 63,000",
            "SUBTOTAL 141,000",
            "PPN 10% 14,100",
            "Service Charge 5% 7,755",
            "TOTAL 162,855",
        ]
        data = lines_to_extraction(lines)
        self.assertEqual(data["currency"], "IDR")
        teas = [line for line in data["lines"] if "LYCHEE" in line["item_name"]]
        self.assertEqual(len(teas), 2)
        self.assertEqual([line["line_total"] for line in teas], [39000, 39000])
        self.assertEqual(sum(line["line_total"] for line in data["lines"]), 141000)
        self.assertEqual(data["subtotal"], 141000)

    def test_wrong_prices_do_not_match_the_footer(self):
        self.assertFalse(
            prices_match_footer(
                {
                    "currency": "IDR",
                    "subtotal": 426000,
                    "lines": [
                        {"item_name": "CED LYCHEE TEA", "line_total": 39000},
                        {"item_name": "GLIO OLIO", "line_total": 89000},
                    ],
                }
            )
        )
        self.assertTrue(
            prices_match_footer(
                {
                    "currency": "SGD",
                    "subtotal": 37.0,
                    "lines": [{"item_name": "Rice", "line_total": 37.0}],
                }
            )
        )

    def test_large_photo_is_shrunk_before_ocr(self):
        with tempfile.TemporaryDirectory() as folder:
            src = Path(folder) / "receipt.jpg"
            Image.new("RGB", (3200, 2400), "white").save(src, "JPEG")
            ocr_path, shrunk = shrink_for_ocr(str(src))
            self.assertIsNotNone(shrunk)
            with Image.open(ocr_path) as img:
                self.assertLessEqual(max(img.size), 1600)
            Path(shrunk).unlink()

    def test_sharp_photo_is_not_rewritten(self):
        with tempfile.TemporaryDirectory() as folder:
            src = Path(folder) / "receipt.jpg"
            img = Image.new("RGB", (400, 600), "white")
            for y in range(40, 560, 16):
                for x in range(40, 360):
                    img.putpixel((x, y), (0, 0, 0))
            img.save(src, "JPEG")
            ocr_path, shrunk = shrink_for_ocr(str(src))
            self.assertEqual(ocr_path, str(src))
            self.assertIsNone(shrunk)

    def test_faded_photo_is_rewritten_for_ocr(self):
        with tempfile.TemporaryDirectory() as folder:
            src = Path(folder) / "receipt.jpg"
            Image.new("RGB", (400, 600), (180, 180, 180)).save(src, "JPEG")
            ocr_path, shrunk = shrink_for_ocr(str(src))
            self.assertIsNotNone(shrunk)
            self.assertNotEqual(ocr_path, str(src))
            Path(shrunk).unlink()
