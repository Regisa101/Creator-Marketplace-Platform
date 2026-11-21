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
    assert conv["negotiation_started"] is True  # the 2200 typed on the form is already an offer

    r = client.post(f"/api/conversations/{conv['id']}/offers", json={"amount": 9000}, headers=h["creator"])
    assert r.status_code == 200, r.text
    out = r.json()
    # the out-of-range 9000 is not forwarded: the brand's earlier counter (1,500 + 20% of 700 = 1,640) stays pending
    assert out["range_prompt_open"] is True and out["pending_offer"]["amount"] == 1640.0

    # Typing/offering is blocked until the creator answers.
    assert client.post(f"/api/conversations/{conv['id']}/offers", json={"amount": 2000}, headers=h["creator"]).status_code == 403

    ok = client.post(f"/api/conversations/{conv['id']}/range-response", json={"agree": True, "amount": 2800}, headers=h["creator"])
    assert ok.status_code == 200, ok.text
    assert ok.json()["pending_offer"]["amount"] == 1890.0

    # Brand sees the in-range offer; and "No thanks" path -> sorry, negotiation stays open.
    brand_view = client.get(f"/api/conversations/{conv['id']}", headers=h["brand"]).json()["conversation"]
    assert brand_view["pending_offer"]["amount"] == 1890.0


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


# ---------- applying: the chat exists at once and the proposed price appears in it ----------
def _creator_thread(client, h, cid):
    return client.get(f"/api/conversations/{cid}", headers=h["creator"]).json()


def _brand_thread(client, h, cid):
    return client.get(f"/api/conversations/{cid}", headers=h["brand"]).json()


def test_applying_creates_the_chat_and_in_range_price_becomes_an_offer(client):
    ids, h = _setup()
    assert _apply(client, ids, h, 2200).status_code == 200
    conv = _conv_for(client, h)  # exists without anyone pressing "Message"
    assert conv["quick_replies"][0]["key"] == "hi"  # creator can greet right away
    assert conv["negotiation_started"] is True
    assert conv["pending_offer"]["amount"] == 1640.0  # the brand side already countered

    kinds = [m["kind"] for m in _creator_thread(client, h, conv["id"])["messages"]]
    assert kinds == ["offer", "assistant"]
    brand_view = _brand_thread(client, h, conv["id"])
    assert brand_view["conversation"]["pending_offer"]["amount"] == 1640.0
    assert brand_view["messages"][0]["body"] == "Offered NPR 2,200.00"
    assert "NPR 1,640" in brand_view["messages"][1]["body"]
    # both sides see the same thread, each line on the right side
    assert [m["mine"] for m in _creator_thread(client, h, conv["id"])["messages"]] == [True, False]
    assert [m["mine"] for m in brand_view["messages"]] == [False, True]


def test_applying_without_a_price_creates_a_quiet_chat(client):
    ids, h = _setup()
    assert _apply(client, ids, h, None).status_code == 200
    conv = _conv_for(client, h)
    assert conv["negotiation_started"] is False and conv["pending_offer"] is None
    assert _creator_thread(client, h, conv["id"])["messages"] == []


def test_out_of_range_price_on_the_form_is_shown_to_the_creator_only(client):
    ids, h = _setup()
    _apply(client, ids, h, 20000)
    conv = _conv_for(client, h)
    msgs = _creator_thread(client, h, conv["id"])["messages"]
    assert [m["kind"] for m in msgs] == ["held", "assistant"]
    assert msgs[0]["body"] == "My offer: NPR 20,000" and msgs[0]["mine"] is True
    # the brand cannot see the application or the conversation at all yet
    assert _brand_apps(client, h) == []
    assert client.get(f"/api/conversations/{conv['id']}", headers=h["brand"]).status_code == 404


def test_typed_out_of_range_price_in_chat_is_visible_to_both_sides(client):
    ids, h = _setup()
    _apply(client, ids, h, 2200)
    cid = _conv_for(client, h)["id"]
    client.post(f"/api/conversations/{cid}/offers", json={"amount": 20000}, headers=h["creator"])

    creator = [(m["kind"], m["mine"]) for m in _creator_thread(client, h, cid)["messages"]]
    assert creator == [("offer", True), ("assistant", False), ("held", True), ("assistant", False)]

    # unread badge counts what the brand has not read yet (checked before opening the thread marks it read)
    assert client.get("/api/conversations/unread-count", headers=h["brand"]).json()["count"] == 2  # offer + held
    brand = _brand_thread(client, h, cid)
    # the same four lines, mirrored: the creator's are "theirs", the brand's own are "mine"
    assert [(m["kind"], m["mine"]) for m in brand["messages"]] == [(k, not mine) for k, mine in creator]
    assert [m["body"] for m in brand["messages"]] == [m["body"] for m in _creator_thread(client, h, cid)["messages"]]


def test_fixed_price_campaign_with_a_proposed_rate_gets_a_sorry(client):
    ids, h = _setup()
    db = SessionLocal()
    camp = db.get(Campaign, ids["campaign"])
    camp.price_type, camp.compensation_type, camp.budget = "fixed", "Custom amount", 10000
    camp.budget_min = camp.budget_max = None
    db.commit()
    db.close()

    assert _apply(client, ids, h, 15000).status_code == 200
    conv = _conv_for(client, h)
    msgs = _creator_thread(client, h, conv["id"])["messages"]
    assert [m["kind"] for m in msgs] == ["held", "assistant"]
    assert msgs[0]["body"] == "My offer: NPR 15,000"
    assert "Sorry" in msgs[1]["body"] and "NPR 10,000" in msgs[1]["body"]
    assert conv["pending_offer"] is None and conv["negotiation_started"] is False
    # the application itself still goes to the brand, at the fixed price, without the sorry chatter
    apps = _brand_apps(client, h)
    assert len(apps) == 1 and apps[0]["status"] == "pending"
    # ...and the brand sees the same exchange as the creator
    assert [m["kind"] for m in _brand_thread(client, h, conv["id"])["messages"]] == ["held", "assistant"]


def test_fixed_price_campaign_no_sorry_when_rate_equals_the_fixed_price(client):
    ids, h = _setup()
    db = SessionLocal()
    camp = db.get(Campaign, ids["campaign"])
    camp.price_type, camp.compensation_type, camp.budget = "fixed", "Custom amount", 10000
    camp.budget_min = camp.budget_max = None
    db.commit()
    db.close()
    _apply(client, ids, h, 10000)
    assert _creator_thread(client, h, _conv_for(client, h)["id"])["messages"] == []


# ---------- the replies read as the brand talking, and the creator's answers show up ----------
def test_assistant_lines_speak_as_the_brand(client):
    ids, h = _setup()
    _apply(client, ids, h, 20000)
    cid = _conv_for(client, h)["id"]
    body = _creator_thread(client, h, cid)["messages"][-1]["body"]
    assert "CreatorHub" not in body and "assistant" not in body.lower()
    assert "NPR 1,500 – 3,000" in body and "NPR 20,000" in body


def test_no_thanks_is_shown_as_the_creators_own_message_before_the_reply(client):
    ids, h = _setup()
    _apply(client, ids, h, 20000)
    cid = _conv_for(client, h)["id"]
    r = client.post(f"/api/conversations/{cid}/range-response", json={"agree": False}, headers=h["creator"])
    assert r.status_code == 200
    msgs = _creator_thread(client, h, cid)["messages"]
    assert [m["kind"] for m in msgs] == ["held", "assistant", "held", "assistant"]
    assert msgs[2]["body"] == "No thanks." and msgs[2]["mine"] is True
    assert "Sorry" in msgs[3]["body"]


def test_yes_continue_sends_the_price_as_a_normal_offer_message_then_a_reply(client):
    ids, h = _setup()
    _apply(client, ids, h, 20000)  # held from the brand
    cid = _conv_for(client, h)["id"]
    r = client.post(f"/api/conversations/{cid}/range-response", json={"agree": True, "amount": 2800}, headers=h["creator"])
    assert r.status_code == 200, r.text
    msgs = _creator_thread(client, h, cid)["messages"]
    # asked -> creator's price -> thank-you -> the brand's first counter (1,500 + 20% of 1,300 = 1,760)
    assert [m["kind"] for m in msgs] == ["held", "assistant", "offer", "assistant", "assistant"]
    assert msgs[2]["body"] == "Offered NPR 2,800.00" and msgs[2]["mine"] is True
    assert "Thank you" in msgs[3]["body"] and "NPR 1,760" in msgs[4]["body"]
    # the application is now with the brand, who sees the whole exchange
    assert len(_brand_apps(client, h)) == 1
    brand = _brand_thread(client, h, cid)
    assert [m["kind"] for m in brand["messages"]] == ["held", "assistant", "offer", "assistant", "assistant"]
    assert brand["conversation"]["pending_offer"]["amount"] == 1760.0