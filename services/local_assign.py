"""Match typed who-had-what onto OCR lines. No Gemini call when every dish hits."""

from __future__ import annotations

import re
from decimal import Decimal, ROUND_HALF_UP

_STOP = {
    "the",
    "and",
    "with",
    "had",
    "for",
    "all",
    "shared",
    "everyone",
    "shares",
    "share",
    "evenly",
    "between",
    "three",
    "our",
}
_HAD_WORD = r"(?:had|has)"
_SHARED_CUE = r"(?:we all shared|everyone shares|everyone share|everyone shared|all shared)"
_HAD = re.compile(rf"(.+?)\s+{_HAD_WORD}\s+(.+)", re.IGNORECASE)
_SHARED = re.compile(rf"(?:{_SHARED_CUE})\s+(?:the\s+)?(.+)", re.IGNORECASE)


def assign_from_text(extraction: dict, text: str) -> dict | None:
    lines = [line for line in extraction.get("lines") or [] if line.get("line_total")]
    if not lines or not text.strip():
        return None

    people, shared_phrases = _parse(text)
    if len(people) < 2:
        return None

    used = set()
    for person in people:
        for phrase in person["phrases"]:
            picked = _take_lines(phrase, lines, used)
            if not picked:
                return None
            person["lines"].extend(lines[idx] for idx in picked)

    shared_lines = []
    for phrase in shared_phrases:
        picked = _take_lines(phrase, lines, used)
        if not picked:
            return None
        shared_lines.extend(lines[idx] for idx in picked)

    _keep_repeated_rows(lines, people, used)
    _keep_addon_with_dish_above(lines, people, used)

    if len(used) != len(lines):
        return None

    return _bill(extraction, people, shared_lines)


def _parse(text: str) -> tuple[list[dict], list[str]]:
    people = []
    shared = []
    # Whisper often returns one line with no full stops. Split before each next name and each shared cue.
    marked = re.sub(
        rf"(?i)\s+(?=(?:{_SHARED_CUE})\b)",
        "\n",
        text.strip(),
    )
    marked = re.sub(
        rf"(?i)\s+(?!(?:also)\s+{_HAD_WORD}\b)(?=[A-Za-z][A-Za-z']*\s+{_HAD_WORD}\b)",
        "\n",
        marked,
    )
    chunks = re.split(r"(?<=[.])\s+|\n+", marked)
    for chunk in chunks:
        chunk = chunk.strip(" .")
        if not chunk:
            continue
        shared_match = _SHARED.search(chunk)
        if shared_match:
            shared.append(_clean_phrase(shared_match.group(1)))
            continue
        had = _HAD.search(chunk)
        if not had:
            continue
        name = had.group(1).strip(" .")
        name = re.sub(r"\s+also$", "", name, flags=re.IGNORECASE).strip()
        phrases = [_clean_phrase(part) for part in re.split(r"\s+and\s+", had.group(2))]
        phrases = [phrase for phrase in phrases if phrase]
        if not name or not phrases:
            continue
        existing = next((person for person in people if person["name"].lower() == name.lower()), None)
        if existing:
            existing["phrases"].extend(phrases)
        else:
            people.append({"name": name, "phrases": phrases, "lines": []})
    return people, [phrase for phrase in shared if phrase]


def _keep_repeated_rows(lines: list[dict], people: list[dict], used: set[int]) -> None:
    """One person named the dish, and nobody else did, so every identical row is theirs."""
    for idx, line in enumerate(lines):
        if idx in used:
            continue
        key = _letters(line.get("item_name") or "")
        if not key:
            continue
        holders = [
            person
            for person in people
            if any(_letters(got.get("item_name") or "") == key for got in person["lines"])
        ]
        if len(holders) != 1:
            continue
        holders[0]["lines"].append(line)
        used.add(idx)


def _keep_addon_with_dish_above(lines: list[dict], people: list[dict], used: set[int]) -> None:
    """A printed add-on such as ++SEAFOOD stays with the dish on the row above it."""
    owners = {}
    for person in people:
        for got in person["lines"]:
            owners[id(got)] = person
    for idx, line in enumerate(lines):
        if idx in used or idx == 0:
            continue
        name = str(line.get("item_name") or "").strip()
        if not name or name[0].isalpha():
            continue
        owner = owners.get(id(lines[idx - 1]))
        if owner is None:
            continue
        owner["lines"].append(line)
        used.add(idx)
        owners[id(line)] = owner


def _clean_phrase(phrase: str) -> str:
    phrase = phrase.strip(" .")
    phrase = re.sub(r"^(?:the\s+)+", "", phrase, flags=re.IGNORECASE)
    phrase = re.sub(r"^\d+\s+", "", phrase)
    phrase = re.sub(r"\s+evenly.*$", "", phrase, flags=re.IGNORECASE)
    phrase = re.sub(r"\s+between\b.*$", "", phrase, flags=re.IGNORECASE)
    return phrase.strip()


def _words(text: str) -> set[str]:
    text = re.sub(r"\b\d{3}\b", " ", text.lower())
    text = re.sub(r"[^a-z\s]", " ", text)
    return {word for word in text.split() if len(word) > 2 and word not in _STOP}


def _letters(text: str) -> str:
    return re.sub(r"[^a-z]", "", text.lower())


def _one_letter_off(word: str, token: str) -> bool:
    if len(word) < 5 or len(token) < 5 or abs(len(word) - len(token)) > 1:
        return False
    if len(word) == len(token):
        return sum(a != b for a, b in zip(word, token)) == 1
    longer, shorter = (word, token) if len(word) > len(token) else (token, word)
    for idx in range(len(longer)):
        if longer[:idx] + longer[idx + 1 :] == shorter:
            return True
    return False


def _word_hits(word: str, item_name: str) -> bool:
    tokens = _words(item_name)
    blob = _letters(item_name)
    if word in tokens or (len(word) >= 4 and word in blob):
        return True
    return any(_one_letter_off(word, token) for token in tokens)


def _overlap(phrase: str, item_name: str) -> int:
    return sum(1 for word in _words(phrase) if _word_hits(word, item_name))


def _distinctive_hit(phrase: str, item_name: str) -> bool:
    for word in _words(phrase):
        if len(word) < 4:
            continue
        if _word_hits(word, item_name):
            return True
    return False


def _take_lines(phrase: str, lines: list[dict], used: set[int]) -> list[int] | None:
    """One spoken phrase can name two dishes when the 'and' is missing."""
    found = []
    remaining = phrase
    while _words(remaining):
        idx = _best_line(remaining, lines, used)
        if idx is None:
            break
        found.append(idx)
        used.add(idx)
        item_name = lines[idx].get("item_name") or ""
        kept = [word for word in _words(remaining) if not _word_hits(word, item_name)]
        if not kept:
            break
        remaining = " ".join(kept)
    if not found:
        return None
    return found


def _best_line(phrase: str, lines: list[dict], used: set[int]) -> int | None:
    if not _words(phrase):
        return None
    scored = []
    for idx, line in enumerate(lines):
        if idx in used:
            continue
        scored.append((_overlap(phrase, line.get("item_name") or ""), idx))
    scored.sort(reverse=True)
    if not scored or scored[0][0] < 1:
        return None
    if len(scored) > 1 and scored[0][0] == scored[1][0]:
        top = scored[0][0]
        tied = [idx for score, idx in scored if score == top]
        names = {_letters(lines[idx].get("item_name") or "") for idx in tied}
        if len(names) != 1:
            return None
        return tied[0]
    if scored[0][0] >= 2:
        return scored[0][1]
    item_name = lines[scored[0][1]].get("item_name") or ""
    if _distinctive_hit(phrase, item_name):
        return scored[0][1]
    return None


def _split_cost(amount: float, count: int) -> list[float]:
    quantum = Decimal("0.01")
    pool = Decimal(str(amount))
    share = (pool / count).quantize(quantum, rounding=ROUND_HALF_UP)
    shares = [share] * count
    shares[-1] = pool - share * (count - 1)
    return [float(part) for part in shares]


def _bill(extraction: dict, people: list[dict], shared_lines: list[dict]) -> dict:
    participants = []
    for person in people:
        items = [
            {"item_name": line["item_name"], "item_cost": float(line["line_total"])}
            for line in person["lines"]
        ]
        participants.append(
            {
                "name": person["name"],
                "items_consumed": items,
                "tax_and_tip_share": 0,
                "total_owed": 0,
            }
        )

    if shared_lines and participants:
        for line in shared_lines:
            costs = _split_cost(float(line["line_total"]), len(participants))
            for person, cost in zip(participants, costs):
                person["items_consumed"].append(
                    {"item_name": f"{line['item_name']} (shared)", "item_cost": cost}
                )

    summary = {
        "subtotal": float(extraction.get("subtotal") or 0),
        "tax": float(extraction.get("tax") or 0),
        "tip": float(extraction.get("tip") or 0),
        "grand_total": float(extraction.get("grand_total") or 0),
    }
    return {
        "event_details": {
            "title": extraction.get("merchant") or "Bill split",
            "date": extraction.get("date") or "",
            "currency": extraction.get("currency") or "SGD",
        },
        "receipt_summary": summary,
        "participants": participants,
    }
