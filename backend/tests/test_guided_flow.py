"""Guided creator script: hi -> {deliverables | deadline | negotiate}, with the
brand side answering automatically from the campaign's own data.

Run from backend/:   python -m pytest tests -q
"""
from datetime import datetime, timezone

# Reuses the throw-away SQLite setup, fixtures and helpers from test_messaging.
# This import must stay first: it points DATABASE_URL at a temp database
# before the app is imported.
from tests.test_messaging import (  # noqa: F401  (fixtures are used by name)
    _open, _send, _setup, client, fresh_db,
)
from app.database import SessionLocal  # noqa: E402
from app.models import Campaign, Message  # noqa: E402


def _qr(client, cid, h, who, key):
    return client.post(f"/api/conversations/{cid}/quick-reply", json={"key": key}, headers=h[who])


def _keys(conv):
    return [q["key"] for q in conv["quick_replies"]]


def _fill_campaign(ids, **fields):
    db = SessionLocal()
    camp = db.get(Campaign, ids["campaign"])
    for k, v in fields.items():
        setattr(camp, k, v)
    db.commit()
    db.close()


def _thread(client, cid, h, who="creator"):
    return client.get(f"/api/conversations/{cid}", headers=h[who]).json()["messages"]


def test_creator_starts_with_only_say_hi_then_gets_three_inquiries(client):
    ids, h = _setup("negotiable")
    conv = _open(client, ids, h)
    assert _keys(conv) == ["hi"]

    out = _qr(client, conv["id"], h, "creator", "hi").json()["conversation"]
    assert _keys(out) == ["deliverables", "timeline", "negotiate"]


def test_fixed_price_campaign_has_no_negotiate_option(client):
    ids, h = _setup("fixed")
    conv = _open(client, ids, h)
    out = _qr(client, conv["id"], h, "creator", "hi").json()["conversation"]
    assert _keys(out) == ["deliverables", "timeline"]
    assert _qr(client, conv["id"], h, "creator", "negotiate").status_code == 400


def test_server_refuses_inquiry_before_hi_and_repeats(client):
    ids, h = _setup("negotiable")
    conv = _open(client, ids, h)
    r = _qr(client, conv["id"], h, "creator", "deliverables")  # skipping the greeting via the API
    assert r.status_code == 400 and "hi" in r.json()["detail"].lower()

    assert _qr(client, conv["id"], h, "creator", "hi").status_code == 200
    assert _qr(client, conv["id"], h, "creator", "hi").status_code == 400  # no second greeting
    assert _qr(client, conv["id"], h, "creator", "deliverables").status_code == 200
    assert _qr(client, conv["id"], h, "creator", "deliverables").status_code == 400  # one-shot
    # typing is still refused on the API
    assert _send(client, conv["id"], h, "creator", "typed").status_code == 403


def test_brand_auto_replies_deliverables_from_campaign_data(client):
    ids, h = _setup("fixed")
    _fill_campaign(ids, deliverables=["2 reels", "5 stories"], responsibilities="Visit the cafe and film it.",
                   creators_needed=3)
    conv = _open(client, ids, h)
    _qr(client, conv["id"], h, "creator", "hi")
    r = _qr(client, conv["id"], h, "creator", "deliverables")
    assert r.status_code == 200
    last = _thread(client, conv["id"], h)[-1]
    assert last["kind"] == "auto" and last["mine"] is False  # from the brand side
    assert "• 2 reels" in last["body"] and "• 5 stories" in last["body"]
    assert "Visit the cafe" in last["body"] and "3 creators" in last["body"]
    # the same message is "mine" for the brand
    assert _thread(client, conv["id"], h, "brand")[-1]["mine"] is True


def test_brand_auto_replies_deadline_from_campaign_data(client):
    ids, h = _setup("fixed")
    _fill_campaign(
        ids,
        application_deadline=datetime(2026, 11, 12, tzinfo=timezone.utc),
        start_date=datetime(2026, 11, 20, tzinfo=timezone.utc),
        end_date=datetime(2026, 12, 31, tzinfo=timezone.utc),
        duration="6 weeks", engagement_type="one_time",
    )
    conv = _open(client, ids, h)
    _qr(client, conv["id"], h, "creator", "hi")
    _qr(client, conv["id"], h, "creator", "timeline")
    body = _thread(client, conv["id"], h)[-1]["body"]
    for expected in ("12 Nov 2026", "20 Nov 2026", "31 Dec 2026", "6 weeks", "One-time project"):
        assert expected in body


def test_auto_replies_have_a_friendly_fallback_when_data_is_missing(client):
    ids, h = _setup("fixed")  # the test campaign has no deliverables or dates
    conv = _open(client, ids, h)
    _qr(client, conv["id"], h, "creator", "hi")
    _qr(client, conv["id"], h, "creator", "deliverables")
    _qr(client, conv["id"], h, "creator", "timeline")
    bodies = [m["body"] for m in _thread(client, conv["id"], h) if m["kind"] == "auto"]
    assert "haven't listed" in bodies[1] and "haven't set dates" in bodies[2]


def test_negotiate_unlocks_typed_price_and_brand_replies_with_budget(client):
    ids, h = _setup("negotiable")
    _fill_campaign(ids, budget=2000, budget_min=1500, budget_max=3000)
    conv = _open(client, ids, h)
    assert conv["negotiation_started"] is False

    # Typed prices are refused until the creator chooses "Negotiate price".
    early = client.post(f"/api/conversations/{conv['id']}/offers", json={"amount": 2500}, headers=h["creator"])
    assert early.status_code == 403
    assert client.post(f"/api/conversations/{conv['id']}/accept-listed-price", headers=h["creator"]).status_code == 403

    _qr(client, conv["id"], h, "creator", "hi")
    out = _qr(client, conv["id"], h, "creator", "negotiate").json()["conversation"]
    assert out["negotiation_started"] is True and "negotiate" not in _keys(out)
    reply = _thread(client, conv["id"], h)[-1]["body"]
    assert "NPR 2,000" in reply and "NPR 1,500 – 3,000" in reply

    # Now any amount can be typed. In range, the brand side counters by itself
    # (1,500 floor + 20% of the 1,200 gap = 1,740).
    ok = client.post(f"/api/conversations/{conv['id']}/offers", json={"amount": 2700}, headers=h["creator"])
    assert ok.status_code == 200
    assert ok.json()["pending_offer"]["amount"] == 1740.0
    assert "NPR 1,740" in _thread(client, conv["id"], h)[-1]["body"]


def test_brand_starting_negotiation_also_unlocks_prices(client):
    ids, h = _setup("negotiable")
    conv = _open(client, ids, h)
    assert "negotiate" in _keys(client.get(f"/api/conversations/{conv['id']}", headers=h["brand"]).json()["conversation"])
    assert _qr(client, conv["id"], h, "brand", "negotiate").status_code == 200
    brand_view = client.get(f"/api/conversations/{conv['id']}", headers=h["brand"]).json()["conversation"]
    assert brand_view["negotiation_started"] is True and "negotiate" not in _keys(brand_view)
    assert client.post(f"/api/conversations/{conv['id']}/offers", json={"amount": 5000}, headers=h["brand"]).status_code == 200


def test_outsiders_get_404_and_nothing_is_written(client):
    ids, h = _setup("fixed")
    conv = _open(client, ids, h)
    assert _qr(client, conv["id"], h, "stranger", "hi").status_code == 404
    db = SessionLocal()
    assert db.query(Message).filter(Message.conversation_id == conv["id"]).count() == 0
    db.close()