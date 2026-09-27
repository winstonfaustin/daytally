"""Who receives a copy of a confirmed split."""

from services.supabase_service import friend_ids_on_bill


def test_accepted_friend_with_matching_display_name_is_included():
    friends = [
        {"user_id": "tania", "name": "Old name", "status": "accepted"},
        {"user_id": "evan", "name": "Evan", "status": "pending"},
        {"user_id": "me", "name": "Winston", "status": "accepted"},
    ]
    names = {"tania": "Tania", "evan": "Evan", "me": "Winston"}
    assert friend_ids_on_bill(friends, names, ["Winston", "Tania"], "me") == ["tania"]


def test_spelling_must_match_and_pending_friends_are_skipped():
    friends = [
        {"user_id": "tania", "name": "Tanya", "status": "accepted"},
        {"user_id": "melvin", "name": "Melvin", "status": "pending"},
    ]
    names = {"tania": "Tanya", "melvin": "Melvin"}
    assert friend_ids_on_bill(friends, names, ["Tania", "Melvin"], "winston") == []
