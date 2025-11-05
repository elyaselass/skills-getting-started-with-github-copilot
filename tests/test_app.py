import copy
import urllib.parse

import pytest
from fastapi.testclient import TestClient

from src import app as app_module

client = TestClient(app_module.app)


@pytest.fixture(autouse=True)
def restore_activities():
    """Restore the in-memory activities dict before each test to keep tests isolated."""
    original = copy.deepcopy(app_module.activities)
    try:
        yield
    finally:
        app_module.activities.clear()
        app_module.activities.update(original)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"].get("participants"), list)


def test_signup_and_prevent_duplicate():
    activity = "Chess Club"
    email = "new.student@mergington.edu"
    path = f"/activities/{urllib.parse.quote(activity, safe='')}/signup"

    # Signup should succeed the first time
    resp = client.post(path, params={"email": email})
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # Second signup with same email (different casing/whitespace) should be rejected
    resp2 = client.post(path, params={"email": "  New.Student@mergington.edu  "})
    assert resp2.status_code == 400
    assert "already signed up" in resp2.json().get("detail", "")

    # Ensure participant exists normalized in the in-memory store
    participants = [p.lower() for p in app_module.activities[activity]["participants"]]
    assert email.lower() in participants


def test_remove_participant_and_not_found():
    activity = "Programming Class"
    existing = app_module.activities[activity]["participants"][0]

    # Remove existing participant
    path = f"/activities/{urllib.parse.quote(activity, safe='')}/participants"
    resp = client.delete(path, params={"email": existing})
    assert resp.status_code == 200
    assert "Removed" in resp.json().get("message", "")

    # Removing again should return 404
    resp2 = client.delete(path, params={"email": existing})
    assert resp2.status_code == 404
    assert "Participant not found" in resp2.json().get("detail", "")


def test_remove_nonexistent_activity():
    # Deleting from unknown activity should return 404
    path = f"/activities/{urllib.parse.quote('No Such Activity', safe='')}/participants"
    resp = client.delete(path, params={"email": "someone@mergington.edu"})
    assert resp.status_code == 404
    assert "Activity not found" in resp.json().get("detail", "")
