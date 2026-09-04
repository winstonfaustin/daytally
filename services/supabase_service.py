"""Supabase auth and persistence helpers for DayTally."""

from __future__ import annotations

import os
import uuid
from functools import lru_cache
from typing import Any

from dotenv import load_dotenv
from supabase import Client, create_client

# Ensure .env is loaded even if this module is imported before app.py calls load_dotenv.
load_dotenv(override=True)


class SupabaseNotConfigured(RuntimeError):
    pass


def _env(*names: str) -> str:
    for name in names:
        value = os.getenv(name)
        if value is None:
            continue
        cleaned = value.strip().strip('"').strip("'")
        if cleaned:
            return cleaned
    return ""


def _missing_message() -> str:
    url = bool(_env("SUPABASE_URL"))
    anon = bool(_env("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_KEY"))
    missing = []
    if not url:
        missing.append("SUPABASE_URL")
    if not anon:
        missing.append("SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY)")
    return "Supabase env missing: " + ", ".join(missing) + ". Check daytally/.env and restart the server."


@lru_cache(maxsize=1)
def get_anon_client() -> Client:
    url = _env("SUPABASE_URL")
    key = _env("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_KEY")
    if not url or not key:
        raise SupabaseNotConfigured(_missing_message())
    return create_client(url, key)


@lru_cache(maxsize=1)
def get_admin_client() -> Client:
    url = _env("SUPABASE_URL")
    key = _env(
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_SECRET_KEY",
        "SUPABASE_SERVICE_KEY",
    )
    if not url or not key:
        raise SupabaseNotConfigured(
            "Supabase env missing: SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY). Check daytally/.env and restart."
        )
    return create_client(url, key)


def is_configured() -> bool:
    return bool(
        _env("SUPABASE_URL")
        and _env("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_KEY")
    )

def register_user(email: str, password: str, display_name: str) -> dict[str, Any]:
    client = get_anon_client()
    result = client.auth.sign_up(
        {
            "email": email,
            "password": password,
            "options": {"data": {"display_name": display_name}},
        }
    )
    user = result.user
    session = result.session
    if not user:
        raise ValueError("Sign up failed. If Confirm email is on, check your inbox first.")

    try:
        admin = get_admin_client()
        admin.table("profiles").upsert(
            {"id": user.id, "display_name": display_name}
        ).execute()
    except Exception:
        # Profile row can be created on first login if this fails.
        pass

    if not session:
        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "name": display_name,
            },
            "access_token": None,
            "refresh_token": None,
            "needs_email_confirmation": True,
            "message": "Account created. Please confirm your email, then log in.",
        }

    return _session_payload(user, session, display_name)


def login_user(email: str, password: str) -> dict[str, Any]:
    client = get_anon_client()
    result = client.auth.sign_in_with_password({"email": email, "password": password})
    user = result.user
    session = result.session
    if not user or not session:
        raise ValueError("Login failed. Check email and password.")

    display_name = _display_name_for(user)
    _ensure_profile(user.id, display_name)
    return _session_payload(user, session, display_name)


def google_oauth_url(redirect_to: str) -> str:
    from urllib.parse import urlencode

    url = _env("SUPABASE_URL").rstrip("/")
    if not url:
        raise SupabaseNotConfigured(_missing_message())
    # Also ensure anon client can be created (validates keys).
    get_anon_client()
    qs = urlencode({"provider": "google", "redirect_to": redirect_to})
    return f"{url}/auth/v1/authorize?{qs}"


def session_from_access_token(access_token: str, refresh_token: str = "") -> dict[str, Any]:
    user_info = user_from_token(access_token)
    _ensure_profile(user_info["id"], user_info["name"])
    # Prefer saved profile name over a fresh Google full_name on every login.
    user_info = get_profile(user_info["id"])
    return {
        "user": user_info,
        "access_token": access_token,
        "refresh_token": refresh_token or "",
    }


def _ensure_profile(user_id: str, display_name: str) -> None:
    try:
        admin = get_admin_client()
        existing = (
            admin.table("profiles")
            .select("display_name")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        rows = existing.data or []
        if rows and str(rows[0].get("display_name") or "").strip():
            return
        admin.table("profiles").upsert(
            {"id": user_id, "display_name": display_name or "User"}
        ).execute()
    except Exception:
        pass


def user_from_token(access_token: str) -> dict[str, Any]:
    admin = get_admin_client()
    result = admin.auth.get_user(access_token)
    user = result.user
    if not user:
        raise ValueError("Invalid or expired session. Please log in again.")
    return get_profile(user.id)


def get_profile(user_id: str) -> dict[str, Any]:
    admin = get_admin_client()
    auth_user = admin.auth.admin.get_user_by_id(user_id).user
    if not auth_user:
        raise ValueError("User not found.")

    row: dict[str, Any] = {}
    try:
        result = admin.table("profiles").select("*").eq("id", user_id).limit(1).execute()
        rows = result.data or []
        row = rows[0] if rows else {}
    except Exception:
        row = {}

    prefs = _as_prefs(row.get("preferences"))
    meta = getattr(auth_user, "user_metadata", None) or {}
    if not isinstance(meta, dict):
        meta = {}
    meta_prefs = _as_prefs(meta.get("preferences"))
    merged = {**meta_prefs, **prefs}
    for key in (
        "payment_profiles",
        "default_payment_id",
        "payment_method",
        "payment_handle",
        "bank_name",
        "account_number",
        "payment_note",
    ):
        if key not in merged and meta.get(key) not in (None, ""):
            merged[key] = meta[key]

    display_name = (
        (meta.get("display_name") or "").strip()
        or (row.get("display_name") or "").strip()
        or _display_name_for(auth_user)
    )

    profiles = _normalize_payment_profiles(merged.get("payment_profiles"))
    if not profiles:
        profiles = _legacy_payment_profiles(merged)
    default_payment_id = str(merged.get("default_payment_id") or "").strip()
    if default_payment_id and not any(p["id"] == default_payment_id for p in profiles):
        default_payment_id = ""
    if not default_payment_id and profiles:
        default_payment_id = profiles[0]["id"]

    return {
        "id": user_id,
        "email": getattr(auth_user, "email", None),
        "name": display_name,
        "payment_profiles": profiles,
        "default_payment_id": default_payment_id,
    }


def update_profile(user_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    display_name = str(updates.get("name") or updates.get("display_name") or "").strip()
    if len(display_name) < 2:
        raise ValueError("Display name must be at least 2 characters.")

    profiles = _normalize_payment_profiles(updates.get("payment_profiles"))
    default_payment_id = str(updates.get("default_payment_id") or "").strip()
    if default_payment_id and not any(p["id"] == default_payment_id for p in profiles):
        default_payment_id = profiles[0]["id"] if profiles else ""
    if not default_payment_id and profiles:
        default_payment_id = profiles[0]["id"]

    prefs = {
        "payment_profiles": profiles,
        "default_payment_id": default_payment_id,
    }

    admin = get_admin_client()
    admin.auth.admin.update_user_by_id(
        user_id,
        {
            "user_metadata": {
                "display_name": display_name,
                "full_name": display_name,
                "name": display_name,
                "preferences": prefs,
                "payment_profiles": profiles,
                "default_payment_id": default_payment_id,
            }
        },
    )

    payload = {"id": user_id, "display_name": display_name, "preferences": prefs}
    try:
        admin.table("profiles").upsert(payload).execute()
    except Exception:
        admin.table("profiles").upsert(
            {"id": user_id, "display_name": display_name}
        ).execute()

    return get_profile(user_id)


def _normalize_payment_profiles(raw: Any) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, str]] = []
    for item in raw[:8]:
        if not isinstance(item, dict):
            continue
        label = str(item.get("label") or "").strip()[:40]
        method = str(item.get("method") or "").strip()[:40]
        if not label and not method:
            continue
        pid = str(item.get("id") or "").strip() or f"pay_{uuid.uuid4().hex[:10]}"
        out.append(
            {
                "id": pid[:40],
                "label": label or method or "Payment",
                "method": method,
                "handle": str(item.get("handle") or "").strip()[:80],
                "bank_name": str(item.get("bank_name") or "").strip()[:80],
                "account_number": str(item.get("account_number") or "").strip()[:80],
                "note": str(item.get("note") or "").strip()[:200],
            }
        )
    return out


def _legacy_payment_profiles(merged: dict[str, Any]) -> list[dict[str, str]]:
    """Convert old single payment fields into one profile if present."""
    method = str(merged.get("payment_method") or "").strip()
    handle = str(merged.get("payment_handle") or "").strip()
    bank = str(merged.get("bank_name") or "").strip()
    account = str(merged.get("account_number") or "").strip()
    note = str(merged.get("payment_note") or "").strip()
    if not any([method, handle, bank, account, note]):
        return []
    return [
        {
            "id": "pay_legacy",
            "label": method or "Payment",
            "method": method,
            "handle": handle,
            "bank_name": bank,
            "account_number": account,
            "note": note,
        }
    ]


def _as_prefs(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str) and value.strip():
        import json

        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def save_split(user_id: str, data: dict[str, Any], local_id: str | None = None) -> dict[str, Any]:
    admin = get_admin_client()
    event = data.get("event_details") or {}
    row = {
        "user_id": user_id,
        "title": event.get("title") or "Bill split",
        "event_date": event.get("date") or "",
        "currency": event.get("currency") or "SGD",
        "paid_by": data.get("paid_by") or "",
        "payload": data,
    }
    result = admin.table("splits").insert(row).execute()
    saved = (result.data or [None])[0]
    if not saved:
        raise ValueError("Could not save split to Supabase.")
    return {
        "id": saved["id"],
        "local_id": local_id,
        "savedAt": saved.get("created_at"),
        "data": data,
    }


def list_splits(user_id: str) -> list[dict[str, Any]]:
    admin = get_admin_client()
    result = (
        admin.table("splits")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    rows = result.data or []
    return [
        {
            "id": row["id"],
            "userId": row["user_id"],
            "savedAt": row.get("created_at"),
            "eventId": None,
            "data": row.get("payload") or {},
            "paid_by": row.get("paid_by"),
        }
        for row in rows
    ]


def save_event(user_id: str, event: dict[str, Any]) -> dict[str, Any]:
    admin = get_admin_client()
    row = {
        "user_id": user_id,
        "title": event.get("title") or "Event",
        "event_date": event.get("date") or "",
        "notes": event.get("notes") or "",
        "split_ids": event.get("splitIds") or event.get("split_ids") or [],
    }
    if event.get("id") and not str(event["id"]).startswith("evt_"):
        result = (
            admin.table("events")
            .update(row)
            .eq("id", event["id"])
            .eq("user_id", user_id)
            .execute()
        )
        saved = (result.data or [None])[0]
    else:
        result = admin.table("events").insert(row).execute()
        saved = (result.data or [None])[0]
    if not saved:
        raise ValueError("Could not save event to Supabase.")
    return {
        "id": saved["id"],
        "userId": saved["user_id"],
        "title": saved["title"],
        "date": saved["event_date"],
        "notes": saved.get("notes") or "",
        "splitIds": saved.get("split_ids") or [],
        "createdAt": saved.get("created_at"),
    }


def list_events(user_id: str) -> list[dict[str, Any]]:
    admin = get_admin_client()
    result = (
        admin.table("events")
        .select("*")
        .eq("user_id", user_id)
        .order("event_date", desc=True)
        .limit(50)
        .execute()
    )
    rows = result.data or []
    return [
        {
            "id": row["id"],
            "userId": row["user_id"],
            "title": row["title"],
            "date": row["event_date"],
            "notes": row.get("notes") or "",
            "splitIds": row.get("split_ids") or [],
            "createdAt": row.get("created_at"),
        }
        for row in rows
    ]


def _display_name_for(user: Any) -> str:
    meta = getattr(user, "user_metadata", None) or {}
    if isinstance(meta, dict):
        name = (
            meta.get("display_name")
            or meta.get("full_name")
            or meta.get("name")
            or ""
        ).strip()
        if name:
            return name
    email = getattr(user, "email", None) or ""
    return email.split("@")[0] if email else "User"


def _session_payload(user: Any, session: Any, display_name: str) -> dict[str, Any]:
    try:
        profile = get_profile(user.id)
        if display_name and profile.get("name") != display_name:
            profile = {**profile, "name": display_name}
    except Exception:
        profile = {
            "id": user.id,
            "email": user.email,
            "name": display_name,
            "payment_profiles": [],
            "default_payment_id": "",
        }
    return {
        "user": profile,
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
    }
