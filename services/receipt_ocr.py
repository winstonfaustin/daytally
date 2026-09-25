"""Receipt photo to printed lines. RapidOCR reads the image. Gemini does not."""

from __future__ import annotations

import re
from pathlib import Path

from services.idr_amounts import parse_idr_printed

OCR_MODEL = "rapidocr-onnxruntime"
_ocr_engine = None
_MAX_EDGE = 1600

_MONEY = re.compile(r"^\d+\.\d{2}$")
_TRAILING_MONEY = re.compile(
    r"(?P<amount>\d{1,3}(?:,\d{3})+|\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+\.\d{2})$"
)
_QTY = re.compile(r"^\d{1,2}$")
_ITEM_CODE = re.compile(r"^(?:\d{3}|\d{2}[Il|])", re.IGNORECASE)
_SUBTOTAL = re.compile(r"sub\s*total", re.IGNORECASE)
_SERVICE = re.compile(r"service", re.IGNORECASE)
_GST_TAX = re.compile(r"^gst(?:\s|\d|%)", re.IGNORECASE)
_PPN = re.compile(r"\bppn\b", re.IGNORECASE)
_GST_REG = re.compile(r"\d{6,}")
_TOTAL = re.compile(r"^total$", re.IGNORECASE)
_DATE = re.compile(r"(\d{1,2})/(\d{1,2})/(\d{4})")
_SKIP = re.compile(
    r"^(sales\s*no|table\s*no|status|register|user\b|cover\b|qty\b|items\b|amount\b|"
    r"payment|visa|mastercard|change\b|cashier|date\b|holland|singapore|lor\b|aniount)",
    re.IGNORECASE,
)


def shrink_for_ocr(path: str) -> tuple[str, str | None]:
    """Shrink a large phone photo. A soft grey thermal photo is sharpened once."""
    from PIL import Image

    img = Image.open(path)
    img = img.convert("RGB")
    width, height = img.size
    edge = max(width, height)
    if edge > _MAX_EDGE:
        scale = _MAX_EDGE / edge
        img = img.resize((max(1, int(width * scale)), max(1, int(height * scale))), Image.Resampling.LANCZOS)
        shrunk = True
    else:
        shrunk = False
    if not shrunk and not _needs_cleanup(img):
        return path, None
    if _needs_cleanup(img):
        img = _sharpen_soft_receipt(img)
    out = str(Path(path).with_name(Path(path).stem + ".ocr.jpg"))
    img.save(out, "JPEG", quality=90)
    return out, out


def _needs_cleanup(img) -> bool:
    """True when the print sits in a narrow grey band. Sharp black-on-white stays as shot."""
    lo, hi = img.convert("L").getextrema()
    return (hi - lo) < 90


def _sharpen_soft_receipt(img):
    from PIL import ImageFilter, ImageOps

    gray = ImageOps.autocontrast(img.convert("L"), cutoff=1)
    sharp = gray.filter(ImageFilter.UnsharpMask(radius=1.4, percent=140, threshold=3))
    return sharp.convert("RGB")


def read_receipt(path: str) -> tuple[dict, str]:
    global _ocr_engine
    from rapidocr_onnxruntime import RapidOCR

    if _ocr_engine is None:
        _ocr_engine = RapidOCR()
    ocr_path, shrunk = shrink_for_ocr(path)
    try:
        rows, _elapsed = _ocr_engine(ocr_path)
    finally:
        if shrunk:
            Path(shrunk).unlink(missing_ok=True)
    texts = []
    for row in rows or []:
        text = str(row[1]).strip()
        if text:
            texts.append(text)
    if not texts:
        raise RuntimeError("OCR returned no text from the receipt.")
    extraction = lines_to_extraction(texts)
    extraction["raw_lines"] = texts
    return extraction, OCR_MODEL


def lines_to_extraction(texts: list[str]) -> dict:
    """Turn OCR lines into the ReceiptExtraction shape the fusion step already expects."""
    items: list[dict] = []
    footer = {"subtotal": 0.0, "tax": 0.0, "tip": 0.0, "grand_total": 0.0}
    pending_footer = None
    pending_money = None
    open_item = None
    in_items = False
    done = False
    saw_gst = False
    saw_idr = False

    def close_open():
        nonlocal open_item
        if open_item and open_item["item_name"] and open_item["line_total"]:
            items.append(open_item)
        open_item = None

    for raw in texts:
        if done:
            break
        line = " ".join(str(raw).split())
        if not line or set(line) <= {"*", "#"}:
            continue

        trailing = _TRAILING_MONEY.search(line)
        if trailing and not _MONEY.fullmatch(line):
            amount = _parse_amount(trailing.group("amount"))
            rest = line[: trailing.start()].strip(" .-")
            if amount is not None and rest:
                if "," in trailing.group("amount") or "." in trailing.group("amount") and "," in trailing.group("amount"):
                    saw_idr = True
                if re.search(r",\d{3}", trailing.group("amount")) or re.search(r"\.\d{3}", trailing.group("amount")):
                    saw_idr = True
                footer_key = _footer_key(rest)
                if footer_key:
                    close_open()
                    footer[footer_key] = amount
                    in_items = True
                    if footer_key == "grand_total":
                        done = True
                    if _PPN.search(rest):
                        saw_idr = True
                    if _GST_TAX.search(rest):
                        saw_gst = True
                    continue
                close_open()
                in_items = True
                name = re.sub(r"^\d{1,2}\s+", "", rest).strip()
                items.append({"item_name": name or rest, "quantity": "", "line_total": amount})
                continue

        if _parse_amount(line) is not None and (_MONEY.fullmatch(line) or parse_idr_printed(line) is not None):
            amount = _parse_amount(line)
            if pending_footer:
                footer[pending_footer] = amount
                if pending_footer == "grand_total":
                    done = True
                pending_footer = None
            elif open_item is not None and not open_item["line_total"]:
                open_item["line_total"] = amount
            else:
                pending_money = amount
            continue

        if _GST_TAX.match(line):
            saw_gst = True
        if _PPN.search(line):
            saw_idr = True
        footer_key = _footer_key(line)
        if footer_key:
            close_open()
            pending_footer = footer_key
            in_items = True
            continue

        if _SKIP.match(line) or _looks_like_header(line):
            continue

        if _QTY.fullmatch(line):
            in_items = True
            continue

        if _ITEM_CODE.match(line) or (pending_money is not None and not _looks_like_header(line)):
            close_open()
            in_items = True
            open_item = {
                "item_name": line,
                "quantity": "",
                "line_total": pending_money or 0.0,
            }
            pending_money = None
            continue

        if in_items and open_item is not None and not _looks_like_header(line):
            open_item["item_name"] = f"{open_item['item_name']} {line}".strip()
            continue

    close_open()
    priced = [item for item in items if item["line_total"]]
    if saw_gst:
        currency = "SGD"
    elif saw_idr or any(_PPN.search(str(line)) for line in texts):
        currency = "IDR"
    else:
        currency = ""
    merchant = texts[0] if texts else ""
    return {
        "merchant": merchant,
        "date": _find_date(texts),
        "currency": currency,
        "lines": priced,
        "subtotal": footer["subtotal"],
        "tax": footer["tax"],
        "tip": footer["tip"],
        "grand_total": footer["grand_total"],
    }


def _find_date(texts: list[str]) -> str:
    for raw in texts:
        match = _DATE.search(str(raw))
        if match:
            day, month, year = match.groups()
            return f"{int(day):02d}/{int(month):02d}/{year}"
    return ""


def _parse_amount(text: str) -> float | None:
    raw = str(text or "").strip()
    if _MONEY.fullmatch(raw):
        return float(raw)
    rupiah = parse_idr_printed(raw)
    if rupiah is None:
        return None
    return float(rupiah)


def _footer_key(line: str) -> str | None:
    if _SUBTOTAL.search(line):
        return "subtotal"
    if _SERVICE.search(line):
        return "tip"
    if _PPN.search(line):
        return "tax"
    if _GST_TAX.match(line) and not _GST_REG.search(line):
        return "tax"
    if _TOTAL.match(line.strip()):
        return "grand_total"
    return None




def prices_match_footer(extraction: dict) -> bool:
    """True when the priced rows already add up to the printed subtotal."""
    lines = [line for line in extraction.get("lines") or [] if line.get("line_total")]
    subtotal = float(extraction.get("subtotal") or 0)
    if not lines or subtotal <= 0:
        return False
    total = sum(float(line["line_total"]) for line in lines)
    tolerance = 1.0 if str(extraction.get("currency") or "").upper() == "IDR" else 0.05
    return abs(total - subtotal) <= tolerance


def _looks_like_header(line: str) -> bool:
    return bool(_SKIP.match(line) or _GST_REG.search(line))
