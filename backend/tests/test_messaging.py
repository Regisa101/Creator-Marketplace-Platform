"""Tests for post-negotiation selection and controlled messaging.

Run from backend/:   pip install pytest && python -m pytest tests -q
Uses a throw-away SQLite database; never touches your real DATABASE_URL.
"""
import os
import tempfile

_DB = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_DB}"
os.environ.setdefault("JWT_SECRET", "test-secret")

import pytest
from fastapi.testclient import TestClient

from app.auth import create_access_token, hash_password
from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import Application, Campaign, Contract, Conversation, Message, Notification, User
from app.services.pricing import PLATFORM_FEE_RATE


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


def _auth(user):
    return {"Authorization": f"Bearer {create_access_token({'user_id': user.id})}"}


def _setup(price_type):
    """Brand + creator + published campaign + pending application."""
    db = SessionLocal()
    brand = _user(db, "brand@x.com", "business")
    creator = _user(db, "creator@x.com", "creator")
    stranger = _user(db, "stranger@x.com", "creator")
    other_brand = _user(db, "otherbrand@x.com", "business")
    camp = Campaign(
        business_id=brand.id, title="Promo", category="Food", description="d",
        status="published", is_active=True, creators_needed=1,
        price_type=price_type,
        compensation_type="Custom amount" if price_type == "fixed" else "Negotiable",
        budget=10000 if price_type == "fixed" else None,
    )
    db.add(camp)
    db.commit()
    app_ = Application(campaign_id=camp.id, creator_id=creator.id, proposal="hi", status="pending")
    db.add(app_)
    db.commit()
    ids = dict(brand=brand.id, creator=creator.id, stranger=stranger.id, other_brand=other_brand.id,
               campaign=camp.id, application=app_.id)
    users = {k: db.query(User).get(ids[k]) for k in ("brand", "creator", "stranger", "other_brand")}
    headers = {k: _auth(v) for k, v in users.items()}
    db.close()
    return ids, headers


def _open(client, ids, headers, who="creator"):
    r = client.post(f"/api/conversations/by-application/{ids['application']}", headers=headers[who])
    assert r.status_code == 200, r.text
    return r.json()


def _send(client, cid, headers, who, text="hello"):
    return client.post(f"/api/conversations/{cid}/messages", json={"body": text}, headers=headers[who])


# ---------- 1-4: fixed-price allowance and brand permission ----------
def test_fixed_creator_can_send_exactly_two_then_third_rejected(client):
    ids, h = _setup("fixed")
    conv = _open(client, ids, h)
    assert conv["creator_messages_remaining"] == 2
    assert _send(client, conv["id"], h, "creator", "one").status_code == 200
    r2 = _send(client, conv["id"], h, "creator", "two")
    assert r2.status_code == 200
    assert r2.json()["conversation"]["creator_messages_remaining"] == 0
    r3 = _send(client, conv["id"], h, "creator", "three")
    assert r3.status_code == 403  # enforced on the backend


def test_brand_replies_do_not_consume_creator_allowance(client):
    ids, h = _setup("fixed")
    conv = _open(client, ids, h)
    _send(client, conv["id"], h, "creator", "q1")
    for i in range(3):
        assert _send(client, conv["id"], h, "brand", f"reply {i}").status_code == 200
    r = _send(client, conv["id"], h, "creator", "q2")
    assert r.status_code == 200
    assert r.json()["conversation"]["creator_messages_remaining"] == 0


def test_allow_further_chat_unlocks_without_selecting(client):
    ids, h = _setup("fixed")
    conv = _open(client, ids, h)
    _send(client, conv["id"], h, "creator")
    _send(client, conv["id"], h, "creator")
    assert _send(client, conv["id"], h, "creator").status_code == 403

    # creator cannot grant permission to themselves
    assert client.post(f"/api/conversations/{conv['id']}/allow-chat", headers=h["creator"]).status_code == 403

    r = client.post(f"/api/conversations/{conv['id']}/allow-chat", headers=h["brand"])
    assert r.status_code == 200
    assert r.json()["chat_permission_granted"] is True
    assert _send(client, conv["id"], h, "creator", "third").status_code == 200

    db = SessionLocal()
    assert db.query(Application).get(ids["application"]).status == "pending"  # not selected
    assert db.query(Contract).count() == 0  # no contract
    assert db.query(Notification).filter(Notification.user_id == ids["creator"],
                                         Notification.type == "chat_permission_granted").count() == 1
    db.close()


def test_new_browser_session_cannot_bypass_limit(client):
    ids, h = _setup("fixed")
    conv = _open(client, ids, h)
    _send(client, conv["id"], h, "creator")
    _send(client, conv["id"], h, "creator")
    fresh_session = TestClient(app)  # "another browser"
    assert _send(fresh_session, conv["id"], h, "creator").status_code == 403


def test_fixed_campaign_rejects_offers(client):
    ids, h = _setup("fixed")
    conv = _open(client, ids, h)
    r = client.post(f"/api/conversations/{conv['id']}/offers", json={"amount": 5000}, headers=h["creator"])
    assert r.status_code == 400


# ---------- 5-7: negotiable agreement, selection, non-selection ----------
def _agree(client, ids, h, amount=8000):
    conv = _open(client, ids, h)
    o = client.post(f"/api/conversations/{conv['id']}/offers", json={"amount": amount}, headers=h["creator"])
    assert o.status_code == 200
    offer_id = o.json()["pending_offer"]["id"]
    # proposer cannot accept their own offer
    assert client.post(f"/api/conversations/{conv['id']}/offers/{offer_id}/accept", headers=h["creator"]).status_code == 400
    a = client.post(f"/api/conversations/{conv['id']}/offers/{offer_id}/accept", headers=h["brand"])
    assert a.status_code == 200
    return conv["id"], a.json()


def test_price_agreement_notifies_brand_and_waits_for_decision(client):
    ids, h = _setup("negotiable")
    cid, conv = _agree(client, ids, h, 8000)
    assert conv["negotiation_status"] == "price_agreed"
    assert conv["awaiting_selection"] is True
    assert conv["agreed_total"] == 8000
    assert conv["platform_fee"] == round(8000 * PLATFORM_FEE_RATE, 2)  # separate 10% fee
    db = SessionLocal()
    assert db.query(Notification).filter(Notification.user_id == ids["brand"], Notification.type == "price_agreed").count() == 1
    assert db.query(Application).get(ids["application"]).status == "pending"  # not auto-selected
    assert db.query(Contract).count() == 0  # nothing signed or activated
    db.close()


def test_select_creator_enables_collaboration_chat(client):
    ids, h = _setup("negotiable")
    cid, _ = _agree(client, ids, h)
    # creator cannot decide
    assert client.post(f"/api/conversations/{cid}/select", headers=h["creator"]).status_code == 403
    r = client.post(f"/api/conversations/{cid}/select", headers=h["brand"])
    assert r.status_code == 200, r.text
    assert r.json()["conversation"]["brand_decision"] == "selected"
    assert _send(client, cid, h, "creator", "excited").status_code == 200
    assert _send(client, cid, h, "brand", "welcome").status_code == 200
    db = SessionLocal()
    assert db.query(Application).get(ids["application"]).status == "selected"
    contract = db.query(Contract).one()
    assert contract.status == "draft"  # NOT signed / active
    assert float(contract.agreed_rate) == 8000
    assert db.query(Notification).filter(Notification.user_id == ids["creator"],
                                         Notification.type == "creator_selected_chat").count() == 1
    db.close()


def test_not_select_closes_chat_but_preserves_history(client):
    ids, h = _setup("negotiable")
    cid, _ = _agree(client, ids, h)
    _send(client, cid, h, "creator", "before decision")
    r = client.post(f"/api/conversations/{cid}/not-select", headers=h["brand"])
    assert r.status_code == 200
    assert r.json()["is_closed"] is True
    assert _send(client, cid, h, "creator", "x").status_code == 403
    assert _send(client, cid, h, "brand", "x").status_code == 403
    detail = client.get(f"/api/conversations/{cid}", headers=h["creator"]).json()
    bodies = [m["body"] for m in detail["messages"]]
    assert "before decision" in bodies  # history preserved
    db = SessionLocal()
    assert db.query(Application).get(ids["application"]).status == "rejected"
    assert db.query(Contract).count() == 0
    assert db.query(Notification).filter(Notification.user_id == ids["creator"],
                                         Notification.type == "application_rejected").count() == 1
    assert db.query(Conversation).one().agreed_amount is not None  # offer/agreement kept
    db.close()


# ---------- 8: access control ----------
def test_other_users_cannot_access_conversation(client):
    ids, h = _setup("fixed")
    conv = _open(client, ids, h)
    for who in ("stranger", "other_brand"):
        assert client.get(f"/api/conversations/{conv['id']}", headers=h[who]).status_code == 404
        assert _send(client, conv["id"], h, who).status_code == 404
        assert client.post(f"/api/conversations/{conv['id']}/allow-chat", headers=h[who]).status_code == 404
        assert client.post(f"/api/conversations/by-application/{ids['application']}", headers=h[who]).status_code == 404
    assert client.get(f"/api/conversations/{conv['id']}").status_code == 401  # no token


# ---------- 9: direct API bypass attempts ----------
def test_direct_api_cannot_bypass_selection_or_closed_rules(client):
    ids, h = _setup("negotiable")
    conv = _open(client, ids, h)
    # existing select endpoint cannot skip the negotiation
    assert client.post(f"/api/applications/{ids['application']}/select", headers=h["brand"]).status_code == 400
    # decisions need an agreed price
    assert client.post(f"/api/conversations/{conv['id']}/select", headers=h["brand"]).status_code == 400
    assert client.post(f"/api/conversations/{conv['id']}/not-select", headers=h["brand"]).status_code == 400
    # allow-chat is meaningless for negotiable
    assert client.post(f"/api/conversations/{conv['id']}/allow-chat", headers=h["brand"]).status_code == 400



def test_rejected_application_cannot_be_reopened_or_selected(client):
    ids, h = _setup("fixed")
    conv = _open(client, ids, h)
    r = client.put(f"/api/applications/{ids['application']}", json={"status": "rejected"}, headers=h["brand"])
    assert r.status_code == 200
    assert _send(client, conv["id"], h, "creator").status_code == 403  # closed by application status
    assert client.post(f"/api/conversations/{conv['id']}/allow-chat", headers=h["brand"]).status_code == 403
    assert client.post(f"/api/applications/{ids['application']}/select", headers=h["brand"]).status_code == 400
    assert client.put(f"/api/applications/{ids['application']}", json={"status": "pending"}, headers=h["brand"]).status_code == 400


def test_second_decision_is_refused(client):
    ids, h = _setup("negotiable")
    cid, _ = _agree(client, ids, h)
    assert client.post(f"/api/conversations/{cid}/select", headers=h["brand"]).status_code == 200
    assert client.post(f"/api/conversations/{cid}/not-select", headers=h["brand"]).status_code == 400


# ---------- 10: existing behaviour ----------
def test_fixed_campaign_existing_select_flow_and_fee_still_work(client):
    ids, h = _setup("fixed")
    r = client.post(f"/api/applications/{ids['application']}/select", headers=h["brand"])
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["agreed_rate"] == 10000
    assert body["platform_fee"] == round(10000 * PLATFORM_FEE_RATE, 2)  # 10% on top, unchanged
    assert body["contract_status"] == "draft"
    # brand chose this creator, so the creator is no longer limited to 2 messages
    conv = _open(client, ids, h)
    assert conv["creator_messages_remaining"] is None
    for i in range(3):
        assert _send(client, conv["id"], h, "creator", f"m{i}").status_code == 200


# ---------- agreed deal shows on the Applications screen; brand chooses between creators ----------
def test_agreed_deal_visible_in_applications_and_brand_chooses_between_creators(client):
    ids, h = _setup("negotiable")
    # second creator applies to the same campaign
    db = SessionLocal()
    creator2 = _user(db, "creator2@x.com", "creator")
    camp = db.query(Campaign).get(ids["campaign"])
    camp.budget = 10000  # brand's listed starting budget
    app2 = Application(campaign_id=ids["campaign"], creator_id=creator2.id, proposal="me too", status="pending")
    db.add(app2)
    db.commit()
    app2_id, h2 = app2.id, _auth(creator2)
    db.close()

    # creator 1 negotiates down to 8000 and the brand accepts
    cid1, _ = _agree(client, ids, h, 8000)
    # creator 2 simply accepts the brand's listed price
    c2 = client.post(f"/api/conversations/by-application/{app2_id}", headers=h2).json()
    r = client.post(f"/api/conversations/{c2['id']}/accept-listed-price", headers=h2)
    assert r.status_code == 200 and r.json()["agreed_total"] == 10000
    # the brand-only action is refused for the brand
    assert client.post(f"/api/conversations/{c2['id']}/accept-listed-price", headers=h["brand"]).status_code == 403

    # brand's Applications list carries the agreed amounts and the offer history
    apps = client.get("/api/applications", headers=h["brand"]).json()
    by_id = {a["id"]: a for a in apps}
    n1, n2 = by_id[ids["application"]]["negotiation"], by_id[app2_id]["negotiation"]
    assert n1["negotiation_status"] == "price_agreed" and n1["agreed_total"] == 8000
    assert n1["offers"][0]["by"] == "creator"
    assert n2["negotiation_status"] == "price_agreed" and n2["agreed_total"] == 10000
    assert all(a["status"] == "pending" for a in apps)  # nobody auto-selected

    # brand may pick either one (or neither): here creator 2, at the original price
    r = client.post(f"/api/conversations/{c2['id']}/select", headers=h["brand"])
    assert r.status_code == 200, r.text
    db = SessionLocal()
    assert float(db.query(Contract).filter(Contract.application_id == app2_id).one().agreed_rate) == 10000
    db.close()
    # creator 1's deal is still waiting for the brand's own decision
    assert client.get(f"/api/conversations/{cid1}", headers=h["brand"]).json()["conversation"]["awaiting_selection"] is True