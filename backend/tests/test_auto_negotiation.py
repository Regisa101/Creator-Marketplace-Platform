"""The brand side of the chat haggles by itself on negotiable campaigns.

Rule: the floor is the range minimum. Each time the creator asks for more, the
brand counters part of the way up from the floor (20% of the gap, then 30%).
After two counters, if the creator still insists, the brand accepts.

Run from backend/:   python -m pytest tests -q
"""
# Must stay first: points DATABASE_URL at a temp database before the app is imported.
from tests.test_messaging import (  # noqa: F401  (fixtures are used by name)
    _open, _setup, client, fresh_db,
)
from app.database import SessionLocal  # noqa: E402
from app.models import Campaign  # noqa: E402


def _campaign(ids, lo, hi, start=None):
    db = SessionLocal()
    camp = db.get(Campaign, ids["campaign"])
    camp.budget, camp.budget_min, camp.budget_max = start or lo, lo, hi
    db.commit()
    db.close()


def _begin(client, ids, h):
    conv = _open(client, ids, h)
    url = f"/api/conversations/{conv['id']}/quick-reply"
    assert client.post(url, json={"key": "hi"}, headers=h["creator"]).status_code == 200
    assert client.post(url, json={"key": "negotiate"}, headers=h["creator"]).status_code == 200
    return conv["id"]


def _ask(client, cid, h, amount, who="creator"):
    r = client.post(f"/api/conversations/{cid}/offers", json={"amount": amount}, headers=h[who])
    assert r.status_code == 200, r.text
    return r.json()


def _thread(client, cid, h, who="creator"):
    return client.get(f"/api/conversations/{cid}", headers=h[who]).json()["messages"]


def test_fifty_to_sixty_thousand_example_52_then_53_then_accept(client):
    ids, h = _setup("negotiable")
    _campaign(ids, 50000, 60000)
    cid = _begin(client, ids, h)

    first = _ask(client, cid, h, 60000)
    assert first["pending_offer"]["amount"] == 52000.0
    assert "NPR 52,000" in _thread(client, cid, h)[-1]["body"]
    assert first["negotiation_status"] == "open"

    second = _ask(client, cid, h, 60000)
    assert second["pending_offer"]["amount"] == 53000.0
    assert "NPR 53,000" in _thread(client, cid, h)[-1]["body"]
    assert second["negotiation_status"] == "open"

    # the creator insists a third time: now the brand accepts their price
    third = _ask(client, cid, h, 60000)
    assert third["negotiation_status"] == "price_agreed" and third["agreed_amount"] == 60000.0
    body = _thread(client, cid, h)
    assert "deal at NPR 60,000" in [m for m in body if m["kind"] == "assistant"][-1]["body"]
    assert body[-1]["kind"] == "system" and "Price agreed" in body[-1]["body"]


def test_thirty_to_forty_thousand_creator_asks_35000(client):
    ids, h = _setup("negotiable")
    _campaign(ids, 30000, 40000)
    cid = _begin(client, ids, h)
    out = _ask(client, cid, h, 35000)
    assert out["pending_offer"]["amount"] == 31000.0  # starts low, near the 30,000 floor
    assert out["negotiation_status"] == "open"


def test_creator_can_accept_the_brands_counter(client):
    ids, h = _setup("negotiable")
    _campaign(ids, 50000, 60000)
    cid = _begin(client, ids, h)
    out = _ask(client, cid, h, 60000)
    offer_id = out["pending_offer"]["id"]
    r = client.post(f"/api/conversations/{cid}/offers/{offer_id}/accept", headers=h["creator"])
    assert r.status_code == 200, r.text
    assert r.json()["negotiation_status"] == "price_agreed" and r.json()["agreed_amount"] == 52000.0


def test_asking_for_the_floor_is_accepted_immediately(client):
    ids, h = _setup("negotiable")
    _campaign(ids, 50000, 60000)
    cid = _begin(client, ids, h)
    out = _ask(client, cid, h, 50000)
    assert out["negotiation_status"] == "price_agreed" and out["agreed_amount"] == 50000.0


def test_creator_dropping_below_the_last_counter_is_accepted_at_their_price(client):
    ids, h = _setup("negotiable")
    _campaign(ids, 50000, 60000)
    cid = _begin(client, ids, h)
    _ask(client, cid, h, 60000)              # brand counters 52,000
    out = _ask(client, cid, h, 51500)        # creator comes below the counter
    assert out["negotiation_status"] == "price_agreed" and out["agreed_amount"] == 51500.0


def test_counters_never_go_down_and_never_pass_the_creators_price(client):
    ids, h = _setup("negotiable")
    _campaign(ids, 50000, 60000)
    cid = _begin(client, ids, h)
    _ask(client, cid, h, 60000)                       # 52,000
    out = _ask(client, cid, h, 52500)                 # 30% of the small gap would be 50,800: below the last counter
    assert out["negotiation_status"] == "open"
    assert out["pending_offer"]["amount"] == 52000.0  # held at the previous counter, still below their 52,500
    assert "best" in _thread(client, cid, h)[-1]["body"]


def test_automation_steps_aside_once_the_brand_negotiates_by_hand(client):
    ids, h = _setup("negotiable")
    _campaign(ids, 50000, 60000)
    cid = _begin(client, ids, h)
    _ask(client, cid, h, 60000)                       # automatic 52,000
    _ask(client, cid, h, 55000, who="brand")          # a person at the brand types their own price
    out = _ask(client, cid, h, 60000)                 # creator pushes back: nobody answers automatically
    assert out["negotiation_status"] == "open"
    assert out["pending_offer"]["amount"] == 60000.0
    last = _thread(client, cid, h)[-1]
    assert last["kind"] == "offer"


def test_no_automation_without_a_budget_range(client):
    ids, h = _setup("negotiable")  # the base test campaign has no range
    cid = _begin(client, ids, h)
    out = _ask(client, cid, h, 4000)
    assert out["pending_offer"]["amount"] == 4000.0 and out["negotiation_status"] == "open"


def test_brand_sees_the_automatic_lines_as_its_own(client):
    ids, h = _setup("negotiable")
    _campaign(ids, 50000, 60000)
    cid = _begin(client, ids, h)
    _ask(client, cid, h, 60000)
    creator_view = [(m["kind"], m["mine"], m["body"]) for m in _thread(client, cid, h)]
    brand_view = [(m["kind"], m["mine"], m["body"]) for m in _thread(client, cid, h, "brand")]
    assert [(k, not mine, b) for k, mine, b in creator_view] == brand_view