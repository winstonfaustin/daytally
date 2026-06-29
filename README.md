# DayTally

CM3070 FYP. Multimodal student bill-splitting app.
Template 4.1 Orchestrating AI models to achieve a goal.

A student photographs a meal receipt and types or says who had each dish. RapidOCR reads the printed prices. faster-whisper turns speech into text on this machine. The app matches each dish locally. Gemini is called only when a dish does not match. The student checks the shares, then confirms. Service charge is split from the food subtotal. GST is split from food plus service when that matches the printed tax.

The submitted site is https://daytally.info

## Run locally

From this folder on Windows:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-local.txt
```

`requirements-local.txt` installs RapidOCR and faster-whisper. Those libraries run on your PC.

Create `.env` in this folder. Do not commit it.

```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
FLASK_DEBUG=true
```

The code default is `gemini-2.5-flash`. The public site sets `GEMINI_MODEL` to `gemini-3.6-flash`.

```bash
python app.py
```

Open http://localhost:5000

Without the Supabase keys below, the wizard still runs on this machine. Confirmed bills stay in the browser. Sign-in and cloud sync need Supabase.

## Tests

These do not call Gemini:

```bash
python -m unittest discover -s tests -v
python evaluation/run_evaluation.py
```

These call Gemini and need `GEMINI_API_KEY`:

```bash
python evaluation/compare_architectures.py
python evaluation/run_three_models.py
```

`SANOOK.jpg` is the labelled receipt used by the live checks.

## Layout

| Path | Role |
|------|------|
| `app.py` | Flask server |
| `services/` | OCR, speech, matching, GST, and Gemini |
| `prompts/system_prompt.py` | Prompt sent to Gemini |
| `templates/`, `static/` | Wizard, history, calendar, and chatbot |
| `tests/` | Unit tests |
| `evaluation/` | Sanook case and the timing harness |
| `supabase_profile.sql` | Adds the preferences column on `profiles` |

## Supabase

Add these to `.env`. Do not commit the file.

```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Turn on Email auth in the Supabase project. The app reads and writes `profiles`, `splits`, and `events`. Run `supabase_profile.sql` once in the Supabase SQL editor so profile preferences can sync. Restart `python app.py`, create a profile with email, and a confirmed split syncs to the cloud.

If the Python client rejects `sb_publishable_` or `sb_secret_` keys, use the legacy anon and service_role values from Supabase API Keys.
