from pydantic import BaseModel


class EventDetails(BaseModel):
    title: str
    date: str
    currency: str


class ReceiptSummary(BaseModel):
    subtotal: float
    tax: float
    tip: float
    grand_total: float


class ConsumedItem(BaseModel):
    item_name: str
    item_cost: float


class Participant(BaseModel):
    name: str
    items_consumed: list[ConsumedItem]
    tax_and_tip_share: float
    total_owed: float


class BillSplitResult(BaseModel):
    event_details: EventDetails
    receipt_summary: ReceiptSummary
    participants: list[Participant]


class ExtractedLine(BaseModel):
    item_name: str
    quantity: str
    line_total: float


class ReceiptExtraction(BaseModel):
    """OCR-only stage output for the separated pipeline."""

    merchant: str
    date: str
    currency: str
    lines: list[ExtractedLine]
    subtotal: float
    tax: float
    tip: float
    grand_total: float


class VoiceTranscript(BaseModel):
    transcript: str
