import os

from google import genai

DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def build_client() -> genai.Client:
    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not api_key or api_key == "your_gemini_api_key_here":
        raise ValueError(
            "GEMINI_API_KEY is missing or still set to the placeholder. "
            "Get a key at https://aistudio.google.com/apikey and add it to daytally/.env"
        )
    return genai.Client(api_key=api_key)
