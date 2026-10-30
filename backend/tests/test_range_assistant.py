"""Chat assistant: creator price outside the brand's budget range.

Run from backend/:   python -m pytest tests/test_range_assistant.py -q
"""
import os
import tempfile

_DB = os.path.join(tempfile.mkdtemp(), "test_range.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_DB}"
os.environ.setdefault("JWT_SECRET", "test-secret")

import pytest
from fastapi.testclient import TestClient

from app.auth import create_access_token, hash_password
from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import Application, Campaign, Notification, User


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    return TestClient(app)


def _user(db, email, role):
    u = User(email=email, full_name=email.split("@")[0], password=hash_password("x"), role=role)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _auth(u):
    return {"Authorization": f"Bearer {create_access_token({'user_id': u.id})}"}


def _setup():
    db = SessionLocal()
    brand = _user(db, "brand@x.com", "business")
    creator = _user(db, "creator@x.com", "creator")
    camp = Campaign(
        business_id=brand.id, title="Promo", category="Food", description="d",
        status="published", is_active=True, creators_needed=1,
        price_type="negotiable", compensation_type="Negotiable",
        budget=2000, budget_min=1500, budget_max=3000,
    )
    db.add(camp)
    db.commit()
    ids = dict(brand=brand.id, creator=creator.id, campaign=camp.id)
    headers = {"brand": _auth(brand), "creator": _auth(creator)}
    db.close()
    return ids, headers


def _apply(client, ids, h, rate):
    # Bypass the apply endpoint's profile/portfolio requirements by posting directly.
    return client.post(
        "/api/applications",
        json={
            "campaign_id": ids["campaign"], "proposal": "x", "rate": rate,
            "selected_portfolio": [{"media_url": "http://x/y.png"}],
            "social_link": "https://instagram.com/creator",
        },
        headers=h["creator"],
    )


def _brand_apps(client, h):
    return client.get("/api/applications", headers=h["brand"]).json()


def _conv_for(client, h):
    rows = client.get("/api/conversations", headers=h["creator"]).json()
    assert rows
    return rows[0]


def test_out_of_range_application_is_hidden_until_creator_agrees(client):
    ids, h = _setup()
    r = _apply(client, ids, h, 9000)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "range_review"
    assert _brand_apps(client, h) == []
    assert client.get("/api/conversations", headers=h["brand"]).json() == []

    conv = _conv_for(client, h)
    assert conv["range_prompt_open"] is True
    thread = client.get(f"/api/conversations/{conv['id']}", headers=h["creator"]).json()
    assistant = [x for x in thread["messages"] if x["kind"] == "assistant"]
    assert assistant and "1,500" in assistant[0]["body"] and "3,000" in assistant[0]["body"]

    # Out-of-range answer is rejected.
    bad = client.post(f"/api/conversations/{conv['id']}/range-response", json={"agree": True, "amount": 5000}, headers=h["creator"])
    assert bad.status_code == 400

    ok = client.post(f"/api/conversations/{conv['id']}/range-response", json={"agree": True, "amount": 2500}, headers=h["creator"])
    assert ok.status_code == 200, ok.text
    assert ok.json()["range_prompt_open"] is False

    apps = _brand_apps(client, h)
    assert len(apps) == 1 and apps[0]["status"] == "pending" and apps[0]["rate"] == 2500
    db = SessionLocal()
    assert db.query(Notification).filter(Notification.user_id == ids["brand"], Notification.type == "new_application").count() == 1
    db.close()


def test_declining_sends_sorry_and_never_reaches_brand(client):
    ids, h = _setup()
    _apply(client, ids, h, 9000)
    conv = _conv_for(client, h)
    r = client.post(f"/api/conversations/{conv['id']}/range-response", json={"agree": False}, headers=h["creator"])
    assert r.status_code == 200, r.text
    thread = client.get(f"/api/conversations/{conv['id']}", headers=h["creator"]).json()
    assert any(x["kind"] == "assistant" and "Sorry" in x["body"] for x in thread["messages"])
    assert thread["conversation"]["is_closed"] is True
    assert _brand_apps(client, h) == []
    db = SessionLocal()
    assert db.query(Notification).filter(Notification.user_id == ids["brand"], Notification.type == "new_application").count() == 0
    db.close()


def test_in_range_application_goes_straight_to_brand(client):
    ids, h = _setup()
    r = _apply(client, ids, h, 2200)
    assert r.json()["status"] == "pending"
    assert len(_brand_apps(client, h)) == 1


def test_in_chat_out_of_range_offer_is_not_forwarded(client):
    ids, h = _setup()
    _apply(client, ids, h, 2200)
    app_id = _brand_apps(client, h)[0]["id"]
    conv = client.post(f"/api/conversations/by-application/{app_id}", headers=h["creator"]).json()

    r = client.post(f"/api/conversations/{conv['id']}/offers", json={"amount": 9000}, headers=h["creator"])
    assert r.status_code == 200, r.text
    out = r.json()
    assert out["range_prompt_open"] is True and out["pending_offer"] is None

    # Typing/offering is blocked until the creator answers.
    assert client.post(f"/api/conversations/{conv['id']}/offers", json={"amount": 2000}, headers=h["creator"]).status_code == 403

    ok = client.post(f"/api/conversations/{conv['id']}/range-response", json={"agree": True, "amount": 2800}, headers=h["creator"])
    assert ok.status_code == 200, ok.text
    assert ok.json()["pending_offer"]["amount"] == 2800.0

    # Brand sees the in-range offer; and "No thanks" path -> sorry, negotiation stays open.
    brand_view = client.get(f"/api/conversations/{conv['id']}", headers=h["brand"]).json()["conversation"]
    assert brand_view["pending_offer"]["amount"] == 2800.0


def test_in_chat_decline_keeps_application_visible(client):
    ids, h = _setup()
    _apply(client, ids, h, 2200)
    app_id = _brand_apps(client, h)[0]["id"]
    conv = client.post(f"/api/conversations/by-application/{app_id}", headers=h["creator"]).json()
    client.post(f"/api/conversations/{conv['id']}/offers", json={"amount": 9000}, headers=h["creator"])
    r = client.post(f"/api/conversations/{conv['id']}/range-response", json={"agree": False}, headers=h["creator"])
    assert r.status_code == 200
    assert r.json()["range_prompt_open"] is False
    assert len(_brand_apps(client, h)) == 1
