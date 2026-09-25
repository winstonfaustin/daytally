"""Local dish match. No OCR model and no Gemini."""

import unittest

from services.bill_calculator import recalc_proportional_tax_tip
from services.local_assign import assign_from_text
from services.receipt_ocr import lines_to_extraction

# RapidOCR on SANOOK.jpg, prices before the names, codes glued to the words.
RAW_SANOOK = [
    "Sanook Kitchen",
    "Date:23/06/202607:38:01PM",
    "8.90",
    "503Deep-fried Chicken with",
    "ThaiHerb",
    "2.40",
    "709ThaiFragrantSteam",
    "Rice",
    "7.90",
    "70l Pineapple Fried Rice with",
    "Prawn",
    "507Stir--fried Beef withkai",
    "9.90",
    "Lan",
    "704 Honey Chicken Rice",
    "7.90",
    "Sub Total",
    "37.00",
    "SERVICE CHARGE 10%",
    "3.70",
    "GST9%",
    "3.66",
    "Total",
    "44.36",
    "VISA",
    "***#*5935",
    "44.36",
]

SANOOK_LINES = [
    "Sanook Kitchen",
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
]

FORM = (
    "Mevan had 2 Thai fragrant steam rice and the deep-fried chicken with Thai herb. "
    "Winston had pineapple fried rice. "
    "Albert had honey chicken rice. "
    "We all shared stir-fried beef with kai lan."
)

VOICE = (
    "Mevan had the 2 Thai fragrant steam rice and the deep-fried chicken with Thai herb. "
    "Winston had the pineapple fried rice. "
    "Albert had the honey chicken rice. "
    "Everyone shares the stir-fried beef with kai lan evenly between the three of us."
)


class LocalAssignTests(unittest.TestCase):
    def test_form_text_matches_sanook_totals(self):
        extraction = lines_to_extraction(SANOOK_LINES)
        bill = assign_from_text(extraction, FORM)
        self.assertIsNotNone(bill)
        result = recalc_proportional_tax_tip(bill)
        by_name = {p["name"]: p["total_owed"] for p in result["participants"]}
        self.assertEqual(by_name["Mevan"], 17.50)
        self.assertEqual(by_name["Winston"], 13.43)
        self.assertEqual(by_name["Albert"], 13.43)

    def test_real_ocr_lines_still_match(self):
        extraction = lines_to_extraction(RAW_SANOOK)
        self.assertEqual(len(extraction["lines"]), 5)
        self.assertEqual(extraction["tax"], 3.66)
        self.assertEqual(extraction["date"], "23/06/2026")
        bill = assign_from_text(extraction, FORM)
        self.assertIsNotNone(bill)
        self.assertEqual(bill["event_details"]["date"], "23/06/2026")
        result = recalc_proportional_tax_tip(bill)
        by_name = {p["name"]: p["total_owed"] for p in result["participants"]}
        self.assertEqual(by_name["Mevan"], 17.50)
        self.assertEqual(by_name["Winston"], 13.43)
        self.assertEqual(by_name["Albert"], 13.43)

    def test_run_on_whisper_line_still_matches(self):
        extraction = lines_to_extraction(RAW_SANOOK)
        heard = (
            "Mevan had 2 Thai fragrant steam rice and the deep-fried chicken with Thai herb "
            "Winston had pineapple fried rice Albert had honey chicken rice "
            "We all shared stir-fried beef with kai lan"
        )
        bill = assign_from_text(extraction, heard)
        self.assertIsNotNone(bill)
        result = recalc_proportional_tax_tip(bill)
        by_name = {p["name"]: p["total_owed"] for p in result["participants"]}
        self.assertEqual(by_name["Mevan"], 17.50)
        self.assertEqual(by_name["Winston"], 13.43)
        self.assertEqual(by_name["Albert"], 13.43)

    def test_short_unique_words_match_each_dish(self):
        extraction = lines_to_extraction(RAW_SANOOK)
        heard = (
            "Mevan had steam and herb. "
            "Winston had pineapple. "
            "Albert had honey. "
            "We all shared beef."
        )
        bill = assign_from_text(extraction, heard)
        self.assertIsNotNone(bill)
        result = recalc_proportional_tax_tip(bill)
        by_name = {p["name"]: p["total_owed"] for p in result["participants"]}
        self.assertEqual(by_name["Mevan"], 17.50)
        self.assertEqual(by_name["Winston"], 13.43)
        self.assertEqual(by_name["Albert"], 13.43)

    def test_also_had_stays_on_the_same_person(self):
        extraction = lines_to_extraction(RAW_SANOOK)
        heard = (
            "Mervan had deep fried chicken if Thai herb Albert had honey chicken rice. "
            "Mervan also had steam rice. "
            "Winston had pineapple fried rice and everyone shared the steep red beef."
        )
        bill = assign_from_text(extraction, heard)
        self.assertIsNotNone(bill)
        result = recalc_proportional_tax_tip(bill)
        by_name = {p["name"]: p["total_owed"] for p in result["participants"]}
        self.assertEqual(set(by_name), {"Mervan", "Winston", "Albert"})
        self.assertEqual(by_name["Mervan"], 17.50)
        self.assertEqual(by_name["Winston"], 13.43)
        self.assertEqual(by_name["Albert"], 13.43)

    def test_missing_and_still_assigns_both_dishes(self):
        extraction = lines_to_extraction(RAW_SANOOK)
        heard = (
            "Evan had deep fried chicken if they hurt her with two steam rice. "
            "Winston had pineapple fried rice. "
            "Albert has honey chicken rice. "
            "Everyone shares the steafret beef."
        )
        bill = assign_from_text(extraction, heard)
        self.assertIsNotNone(bill)
        result = recalc_proportional_tax_tip(bill)
        by_name = {p["name"]: p["total_owed"] for p in result["participants"]}
        self.assertEqual(by_name["Evan"], 17.50)
        self.assertEqual(by_name["Winston"], 13.43)
        self.assertEqual(by_name["Albert"], 13.43)

    def test_real_whisper_misses_still_match_sanook(self):
        extraction = lines_to_extraction(RAW_SANOOK)
        heard = (
            "My friend had deep fried chicken with Thai herb and two Thai fragrant steam rice. "
            "Winston had pineapple fried rice with front. "
            "Albert has honey chicken rice. "
            "Everyone shared the stehe fried beef with Kainan."
        )
        bill = assign_from_text(extraction, heard)
        self.assertIsNotNone(bill)
        result = recalc_proportional_tax_tip(bill)
        by_name = {p["name"]: p["total_owed"] for p in result["participants"]}
        self.assertEqual(by_name["Winston"], 13.43)
        self.assertEqual(by_name["Albert"], 13.43)
        self.assertEqual(by_name["friend"], 17.50)

    def test_one_letter_dish_miss_still_matches(self):
        extraction = lines_to_extraction(RAW_SANOOK)
        heard = (
            "Mevan had steam and herb. "
            "Winston had pineaple. "
            "Albert had honney. "
            "We all shared beef."
        )
        bill = assign_from_text(extraction, heard)
        self.assertIsNotNone(bill)
        result = recalc_proportional_tax_tip(bill)
        by_name = {p["name"]: p["total_owed"] for p in result["participants"]}
        self.assertEqual(by_name["Mevan"], 17.50)
        self.assertEqual(by_name["Winston"], 13.43)
        self.assertEqual(by_name["Albert"], 13.43)

    def test_shared_word_rice_does_not_guess(self):
        extraction = lines_to_extraction(RAW_SANOOK)
        heard = (
            "Mevan had herb. "
            "Winston had pineapple. "
            "Albert had rice. "
            "We all shared beef."
        )
        self.assertIsNone(assign_from_text(extraction, heard))

    def test_two_identical_rows_assign_to_two_people(self):
        extraction = {
            "subtotal": 78000,
            "tax": 0,
            "tip": 0,
            "grand_total": 78000,
            "lines": [
                {"item_name": "ICED LYCHEE TEA", "line_total": 39000},
                {"item_name": "ICED LYCHEE TEA", "line_total": 39000},
            ],
        }
        bill = assign_from_text(
            extraction,
            "Mel had iced lychee tea. Val had iced lychee tea.",
        )
        self.assertIsNotNone(bill)
        costs = [
            item["item_cost"]
            for person in bill["participants"]
            for item in person["items_consumed"]
        ]
        self.assertEqual(sorted(costs), [39000, 39000])

    def test_one_person_keeps_both_copies_and_the_addon(self):
        extraction = {
            "subtotal": 218000,
            "tax": 0,
            "tip": 0,
            "grand_total": 218000,
            "currency": "IDR",
            "lines": [
                {"item_name": "ICED LYCHEE TEA", "line_total": 39000},
                {"item_name": "ICED LYCHEE TEA", "line_total": 39000},
                {"item_name": "AGLIO OLIO", "line_total": 63000},
                {"item_name": "++SEAFOOD", "line_total": 21000},
                {"item_name": "TRUFFLE FRIES", "line_total": 55000},
                {"item_name": "PAN SEARED CHICKEN", "line_total": 108000},
                {"item_name": "ICED BLACK COFFEE", "line_total": 39000},
                {"item_name": "CHICKEN QUESADILLA", "line_total": 62000},
            ],
        }
        heard = (
            "Valencia had aglio olio and lychee tea. "
            "Melvin had pan seared chicken and black coffee. "
            "Adrian had chicken quesadilla. "
            "Everyone shared the truffle fries."
        )
        bill = assign_from_text(extraction, heard)
        self.assertIsNotNone(bill)
        by_name = {person["name"]: person["items_consumed"] for person in bill["participants"]}
        valencia = [item["item_name"] for item in by_name["Valencia"]]
        self.assertEqual(valencia.count("ICED LYCHEE TEA"), 2)
        self.assertIn("AGLIO OLIO", valencia)
        self.assertIn("++SEAFOOD", valencia)
        self.assertNotIn("ICED LYCHEE TEA", [item["item_name"] for item in by_name["Melvin"]])

    def test_spoken_script_matches_the_same_lines(self):
        extraction = lines_to_extraction(SANOOK_LINES)
        bill = assign_from_text(extraction, VOICE)
        self.assertIsNotNone(bill)
        names = [p["name"] for p in bill["participants"]]
        self.assertEqual(names, ["Mevan", "Winston", "Albert"])
