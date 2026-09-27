"""Supabase auth and persistence helpers for DayTally."""

from __future__ import annotations

import copy
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


def refresh_user(refresh_token: str) -> dict[str, Any]:
    import json
    from urllib.error import HTTPError, URLError
    from urllib.request import Request, urlopen

    token = (refresh_token or "").strip()
    if not token:
        raise ValueError("Your sign-in expired. Sign in again to load your bills.")
    url = _env("SUPABASE_URL").rstrip("/")
    key = _env("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_KEY")
    if not url or not key:
        raise SupabaseNotConfigured(_missing_message())
    req = Request(
        f"{url}/auth/v1/token?grant_type=refresh_token",
        data=json.dumps({"refresh_token": token}).encode(),
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read().decode())
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise ValueError("Your sign-in expired. Sign in again to load your bills.") from exc
    access = str(body.get("access_token") or "")
    new_refresh = str(body.get("refresh_token") or token)
    if not access:
        raise ValueError("Your sign-in expired. Sign in again to load your bills.")
    return {
        "user": user_from_token(access),
        "access_token": access,
        "refresh_token": new_refresh,
    }


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


def _auth_and_prefs(user_id: str) -> tuple[Any, dict[str, Any], str]:
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
    meta = getattr(auth_user, "user_metadata", None) or {}
    if not isinstance(meta, dict):
        meta = {}
    prefs = {**_as_prefs(meta.get("preferences")), **_as_prefs(row.get("preferences"))}
    for key in (
        "payment_profiles",
        "default_payment_id",
        "payment_method",
        "payment_handle",
        "bank_name",
        "account_number",
        "payment_note",
        "friends",
    ):
        if key not in prefs and meta.get(key) not in (None, ""):
            prefs[key] = meta[key]
    display_name = (
        (meta.get("display_name") or "").strip()
        or (row.get("display_name") or "").strip()
        or _display_name_for(auth_user)
    )
    return auth_user, prefs, display_name


def _write_user_prefs(user_id: str, display_name: str, prefs: dict[str, Any], auth_user: Any = None) -> None:
    admin = get_admin_client()
    if auth_user is None:
        auth_user = admin.auth.admin.get_user_by_id(user_id).user
    meta = getattr(auth_user, "user_metadata", None) or {}
    if not isinstance(meta, dict):
        meta = {}
    meta = dict(meta)
    meta["display_name"] = display_name
    meta["full_name"] = display_name
    meta["name"] = display_name
    meta["preferences"] = prefs
    meta["payment_profiles"] = prefs.get("payment_profiles") or []
    meta["default_payment_id"] = prefs.get("default_payment_id") or ""
    admin.auth.admin.update_user_by_id(user_id, {"user_metadata": meta})
    payload = {"id": user_id, "display_name": display_name, "preferences": prefs}
    try:
        admin.table("profiles").upsert(payload).execute()
    except Exception:
        admin.table("profiles").upsert(
            {"id": user_id, "display_name": display_name}
        ).execute()


def _normalize_friends(raw: Any) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in raw[:40]:
        if not isinstance(item, dict):
            continue
        friend_id = str(item.get("id") or "").strip()
        other_id = str(item.get("user_id") or "").strip()
        status = str(item.get("status") or "").strip()
        role = str(item.get("role") or "").strip()
        if not friend_id or not other_id:
            continue
        if status not in ("pending", "accepted") or role not in ("incoming", "outgoing"):
            continue
        if friend_id in seen:
            continue
        seen.add(friend_id)
        out.append(
            {
                "id": friend_id[:40],
                "user_id": other_id,
                "email": str(item.get("email") or "").strip().lower()[:80],
                "name": str(item.get("name") or "").strip()[:40],
                "status": status,
                "role": role,
            }
        )
    return out


def _find_user_by_email(email: str) -> tuple[str, str, str] | None:
    cleaned = str(email or "").strip().lower()
    if not cleaned or "@" not in cleaned:
        raise ValueError("Enter a valid email address.")
    admin = get_admin_client()
    getter = getattr(admin.auth.admin, "get_user_by_email", None)
    if callable(getter):
        try:
            result = getter(cleaned)
            auth_user = getattr(result, "user", None) or result
            user_id = getattr(auth_user, "id", None)
            if user_id:
                return str(user_id), _display_name_for(auth_user), cleaned
        except Exception:
            pass
    try:
        listed = admin.auth.admin.list_users()
        users = getattr(listed, "users", None) or listed or []
        for auth_user in users:
            if str(getattr(auth_user, "email", "") or "").strip().lower() == cleaned:
                return str(auth_user.id), _display_name_for(auth_user), cleaned
    except Exception as exc:
        raise ValueError("Could not look up that email right now.") from exc
    return None


def _save_friends(
    user_id: str,
    friends: list[dict[str, str]],
    known: tuple[Any, dict[str, Any], str] | None = None,
) -> None:
    if known:
        auth_user, prefs, display_name = known
    else:
        auth_user, prefs, display_name = _auth_and_prefs(user_id)
    prefs = dict(prefs)
    prefs["friends"] = _normalize_friends(friends)
    _write_user_prefs(user_id, display_name, prefs, auth_user=auth_user)


def _friend_public(row: dict[str, str], include_payments: bool) -> dict[str, Any]:
    item: dict[str, Any] = {
        "id": row["id"],
        "email": row.get("email") or "",
        "name": row.get("name") or row.get("email") or "Friend",
        "status": row["status"],
        "role": row["role"],
    }
    if include_payments and row["status"] == "accepted":
        try:
            other = get_profile(row["user_id"])
            if other.get("name"):
                item["name"] = other["name"]
            item["payment_profiles"] = other.get("payment_profiles") or []
            item["default_payment_id"] = other.get("default_payment_id") or ""
        except Exception:
            item["payment_profiles"] = []
            item["default_payment_id"] = ""
    return item


def list_friends(user_id: str) -> list[dict[str, Any]]:
    _auth_user, prefs, _display_name = _auth_and_prefs(user_id)
    return [
        _friend_public(row, include_payments=True)
        for row in _normalize_friends(prefs.get("friends"))
    ]


def request_friend(user_id: str, email: str) -> dict[str, Any]:
    found = _find_user_by_email(email)
    if not found:
        raise ValueError("No DayTally account found for that email.")
    other_id, other_name, other_email = found
    if other_id == user_id:
        raise ValueError("That is your own email.")

    me_auth, me_prefs, me_name = _auth_and_prefs(user_id)
    my_email = str(getattr(me_auth, "email", "") or "").strip().lower()
    me_friends = _normalize_friends(me_prefs.get("friends"))
    existing = next((row for row in me_friends if row["user_id"] == other_id), None)
    if existing and existing["status"] == "accepted":
        raise ValueError("You are already friends.")
    if existing and existing["role"] == "outgoing":
        raise ValueError("Request already sent. They need to accept it.")
    if existing and existing["role"] == "incoming":
        accept_friend(user_id, existing["id"])
        return _friend_public({**existing, "status": "accepted"}, include_payments=False)

    _other_auth, other_prefs, _other_display = _auth_and_prefs(other_id)
    other_friends = _normalize_friends(other_prefs.get("friends"))
    mirror = next((row for row in other_friends if row["user_id"] == user_id), None)
    if mirror and mirror["role"] == "outgoing":
        friend_id = mirror["id"]
        if not any(row["id"] == friend_id for row in me_friends):
            me_friends.append(
                {
                    "id": friend_id,
                    "user_id": other_id,
                    "email": other_email,
                    "name": other_name,
                    "status": "accepted",
                    "role": "incoming",
                }
            )
        for row in me_friends:
            if row["id"] == friend_id:
                row["status"] = "accepted"
        for row in other_friends:
            if row["id"] == friend_id or row["user_id"] == user_id:
                row["status"] = "accepted"
        _save_friends(user_id, me_friends, known=(me_auth, me_prefs, me_name))
        _save_friends(other_id, other_friends, known=(_other_auth, other_prefs, _other_display))
        saved = next(row for row in me_friends if row["user_id"] == other_id)
        return _friend_public(saved, include_payments=False)

    friend_id = f"fr_{uuid.uuid4().hex[:12]}"
    me_friends.append(
        {
            "id": friend_id,
            "user_id": other_id,
            "email": other_email,
            "name": other_name,
            "status": "pending",
            "role": "outgoing",
        }
    )
    other_friends.append(
        {
            "id": friend_id,
            "user_id": user_id,
            "email": my_email,
            "name": me_name,
            "status": "pending",
            "role": "incoming",
        }
    )
    _save_friends(user_id, me_friends, known=(me_auth, me_prefs, me_name))
    _save_friends(other_id, other_friends, known=(_other_auth, other_prefs, _other_display))
    return _friend_public(me_friends[-1], include_payments=False)


def accept_friend(user_id: str, friend_id: str) -> None:
    _auth_user, prefs, _display_name = _auth_and_prefs(user_id)
    friends = _normalize_friends(prefs.get("friends"))
    row = next((item for item in friends if item["id"] == friend_id), None)
    if not row:
        raise ValueError("That request is not on your account.")
    if row["status"] == "accepted":
        return
    if row["role"] != "incoming":
        raise ValueError("Only the person who was asked can accept.")
    for item in friends:
        if item["id"] == friend_id:
            item["status"] = "accepted"
    _save_friends(user_id, friends, known=(_auth_user, prefs, _display_name))
    _other_auth, other_prefs, _other_name = _auth_and_prefs(row["user_id"])
    other_friends = _normalize_friends(other_prefs.get("friends"))
    found = False
    for item in other_friends:
        if item["id"] == friend_id or item["user_id"] == user_id:
            item["status"] = "accepted"
            item["id"] = friend_id
            found = True
    if not found:
        me_email = str(getattr(_auth_user, "email", "") or "").strip().lower()
        _me_auth, _me_prefs, me_name = _auth_and_prefs(user_id)
        other_friends.append(
            {
                "id": friend_id,
                "user_id": user_id,
                "email": me_email,
                "name": me_name,
                "status": "accepted",
                "role": "outgoing",
            }
        )
    _save_friends(row["user_id"], other_friends, known=(_other_auth, other_prefs, _other_name))


def remove_friend(user_id: str, friend_id: str) -> None:
    _auth_user, prefs, _display_name = _auth_and_prefs(user_id)
    friends = _normalize_friends(prefs.get("friends"))
    row = next((item for item in friends if item["id"] == friend_id), None)
    if not row:
        raise ValueError("That friend is not on your account.")
    _save_friends(
        user_id,
        [item for item in friends if item["id"] != friend_id],
        known=(_auth_user, prefs, _display_name),
    )
    try:
        _other_auth, other_prefs, _other_name = _auth_and_prefs(row["user_id"])
    except Exception:
        return
    other_friends = [
        item
        for item in _normalize_friends(other_prefs.get("friends"))
        if item["id"] != friend_id and item["user_id"] != user_id
    ]
    _save_friends(row["user_id"], other_friends, known=(_other_auth, other_prefs, _other_name))


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

    _auth_user, existing_prefs, _existing_name = _auth_and_prefs(user_id)
    prefs = {
        "payment_profiles": profiles,
        "default_payment_id": default_payment_id,
        "friends": _normalize_friends(existing_prefs.get("friends")),
    }
    _write_user_prefs(user_id, display_name, prefs)
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
        handle = str(item.get("handle") or "").strip()[:80]
        account_number = str(item.get("account_number") or "").strip()[:80]
        if not handle and not account_number:
            continue
        pid = str(item.get("id") or "").strip() or f"pay_{uuid.uuid4().hex[:10]}"
        out.append(
            {
                "id": pid[:40],
                "label": label or method or "Payment",
                "method": method,
                "handle": handle,
                "bank_name": str(item.get("bank_name") or "").strip()[:80],
                "account_number": account_number,
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
    if not handle and not account:
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


def _person_key(name: Any) -> str:
    return str(name or "").strip().lower()


def friend_ids_on_bill(
    friends: list[dict[str, str]],
    names_by_user_id: dict[str, str],
    participant_names: list[Any],
    owner_id: str,
) -> list[str]:
    """Accepted friends whose display name matches a person on the bill."""
    wanted = {_person_key(name) for name in participant_names if _person_key(name)}
    found: list[str] = []
    seen: set[str] = set()
    for row in friends:
        if row.get("status") != "accepted":
            continue
        other_id = str(row.get("user_id") or "")
        if not other_id or other_id == owner_id or other_id in seen:
            continue
        display = names_by_user_id.get(other_id) or row.get("name") or ""
        if _person_key(display) in wanted:
            seen.add(other_id)
            found.append(other_id)
    return found


def _split_row(user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    event = data.get("event_details") or {}
    return {
        "user_id": user_id,
        "title": event.get("title") or "Bill split",
        "event_date": event.get("date") or "",
        "currency": event.get("currency") or "SGD",
        "paid_by": data.get("paid_by") or "",
        "payload": data,
    }


def _load_split_row(split_id: str) -> dict[str, Any] | None:
    admin = get_admin_client()
    result = admin.table("splits").select("*").eq("id", split_id).limit(1).execute()
    rows = result.data or []
    return rows[0] if rows else None


def _matching_friend_ids(user_id: str, data: dict[str, Any]) -> list[str]:
    participants = data.get("participants") or []
    names = [
        person.get("name")
        for person in participants
        if isinstance(person, dict)
    ]
    _auth_user, prefs, _display_name = _auth_and_prefs(user_id)
    friends = _normalize_friends(prefs.get("friends"))
    names_by_user_id: dict[str, str] = {}
    for row in friends:
        if row["status"] != "accepted":
            continue
        try:
            names_by_user_id[row["user_id"]] = get_profile(row["user_id"]).get("name") or ""
        except Exception:
            names_by_user_id[row["user_id"]] = row.get("name") or ""
    return friend_ids_on_bill(friends, names_by_user_id, names, user_id)


def _share_target_ids(user_id: str, data: dict[str, Any], requested: Any) -> list[str]:
    if requested is None:
        return _matching_friend_ids(user_id, data)
    if not isinstance(requested, list):
        return []
    _auth_user, prefs, _display_name = _auth_and_prefs(user_id)
    friends = _normalize_friends(prefs.get("friends"))
    requested_ids = {str(item).strip() for item in requested if str(item).strip()}
    allowed: list[str] = []
    for row in friends:
        if row["status"] != "accepted" or row["user_id"] in allowed:
            continue
        if row["id"] in requested_ids or row["user_id"] in requested_ids:
            allowed.append(row["user_id"])
    return allowed


def _delete_share_events(events: Any, only_user_id: str | None = None) -> None:
    if not isinstance(events, list):
        return
    for item in events:
        if not isinstance(item, dict):
            continue
        owner = str(item.get("user_id") or "")
        event_id = str(item.get("event_id") or "")
        if not owner or not event_id:
            continue
        if only_user_id and owner != only_user_id:
            continue
        try:
            delete_event(owner, event_id)
        except Exception:
            continue


def save_split(user_id: str, data: dict[str, Any], local_id: str | None = None) -> dict[str, Any]:
    admin = get_admin_client()
    payload = copy.deepcopy(data)
    requested = payload.pop("share_with", None)
    payload.pop("share_copy_ids", None)
    payload.pop("share_id", None)
    payload.pop("share_role", None)
    payload.pop("share_events", None)
    share_id = str(uuid.uuid4())
    payload["share_id"] = share_id
    payload["share_role"] = "owner"
    payload["share_copy_ids"] = []

    result = admin.table("splits").insert(_split_row(user_id, payload)).execute()
    saved = (result.data or [None])[0]
    if not saved:
        raise ValueError("Could not save split to Supabase.")

    copy_ids = [saved["id"]]
    share_events: list[dict[str, str]] = []
    try:
        friend_ids = _share_target_ids(user_id, payload, requested)
    except Exception:
        friend_ids = []
    event_details = payload.get("event_details") or {}
    for friend_id in friend_ids:
        friend_payload = copy.deepcopy(payload)
        friend_payload["share_role"] = "member"
        try:
            inserted = admin.table("splits").insert(_split_row(friend_id, friend_payload)).execute()
            friend_row = (inserted.data or [None])[0]
            if not friend_row:
                continue
            copy_ids.append(friend_row["id"])
            saved_event = save_event(
                friend_id,
                {
                    "title": event_details.get("title") or "Bill split",
                    "date": event_details.get("date") or "",
                    "notes": "",
                    "splitIds": [friend_row["id"]],
                },
            )
            share_events.append(
                {
                    "user_id": friend_id,
                    "event_id": saved_event["id"],
                    "split_id": friend_row["id"],
                }
            )
        except Exception:
            continue

    if len(copy_ids) > 1:
        payload["share_copy_ids"] = copy_ids
        payload["share_events"] = share_events
        try:
            admin.table("splits").update({"payload": payload}).eq("id", saved["id"]).execute()
            for friend_split_id in copy_ids[1:]:
                friend_payload = copy.deepcopy(payload)
                friend_payload["share_role"] = "member"
                friend_payload["share_copy_ids"] = copy_ids
                friend_payload["share_events"] = share_events
                admin.table("splits").update({"payload": friend_payload}).eq("id", friend_split_id).execute()
        except Exception:
            payload["share_copy_ids"] = []
            payload["share_events"] = []

    return {
        "id": saved["id"],
        "local_id": local_id,
        "savedAt": saved.get("created_at"),
        "data": payload,
    }


def update_split_repaid(user_id: str, split_id: str, flags: list[Any]) -> dict[str, Any]:
    admin = get_admin_client()
    result = (
        admin.table("splits")
        .select("*")
        .eq("id", split_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    row = (result.data or [None])[0]
    if not row:
        raise PermissionError("That bill is not on this account.")
    payload = _as_prefs(row.get("payload"))
    share_id = str(payload.get("share_id") or "")
    by_name = {}
    for item in flags:
        if not isinstance(item, dict):
            continue
        key = _person_key(item.get("name"))
        if key:
            by_name[key] = bool(item.get("repaid"))

    def apply_flags(body: dict[str, Any]) -> dict[str, Any]:
        updated = copy.deepcopy(body)
        people = []
        for person in updated.get("participants") or []:
            if not isinstance(person, dict):
                continue
            key = _person_key(person.get("name"))
            if key in by_name:
                person = {**person, "repaid": by_name[key]}
            people.append(person)
        updated["participants"] = people
        return updated

    targets = [split_id]
    for copy_id in payload.get("share_copy_ids") or []:
        if copy_id and copy_id not in targets:
            targets.append(copy_id)
    saved_payload = apply_flags(payload)
    for target_id in targets:
        current = row if target_id == split_id else _load_split_row(str(target_id))
        if not current:
            continue
        current_payload = _as_prefs(current.get("payload"))
        if share_id and str(current_payload.get("share_id") or "") != share_id:
            continue
        next_payload = apply_flags(current_payload)
        admin.table("splits").update({"payload": next_payload}).eq("id", target_id).execute()
        if target_id == split_id:
            saved_payload = next_payload
    return saved_payload


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
            "data": _as_prefs(row.get("payload")),
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


def delete_split(user_id: str, split_id: str) -> None:
    admin = get_admin_client()
    result = (
        admin.table("splits")
        .select("*")
        .eq("id", split_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    row = (result.data or [None])[0]
    if not row:
        return
    payload = _as_prefs(row.get("payload"))
    if str(payload.get("share_role") or "") == "member":
        _delete_share_events(payload.get("share_events"), only_user_id=user_id)
        admin.table("splits").delete().eq("id", split_id).eq("user_id", user_id).execute()
        return
    _delete_share_events(payload.get("share_events"))
    share_id = str(payload.get("share_id") or "")
    targets = [split_id]
    for copy_id in payload.get("share_copy_ids") or []:
        if copy_id and copy_id not in targets:
            targets.append(copy_id)
    for target_id in targets:
        current = row if target_id == split_id else _load_split_row(str(target_id))
        if not current:
            continue
        current_payload = _as_prefs(current.get("payload"))
        if share_id and str(current_payload.get("share_id") or "") != share_id:
            continue
        admin.table("splits").delete().eq("id", target_id).execute()


def delete_event(user_id: str, event_id: str) -> None:
    admin = get_admin_client()
    (
        admin.table("events")
        .delete()
        .eq("id", event_id)
        .eq("user_id", user_id)
        .execute()
    )


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
