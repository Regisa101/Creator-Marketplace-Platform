from __future__ import annotations

import re
from typing import Optional

# ============================================================
# CREATORHUB PRICING MODEL
# ============================================================
#
# CreatorHub charges the brand a flat 10% service fee when a creator is
# hired. The fee is the ONLY amount processed through CreatorHub/Khalti.
# The creator's agreed compensation is recorded in the contract, but the
# actual creator-to-business payment is handled directly by those parties.
# Example:
#
#     Creator compensation .... NPR 10,000 (recorded, not processed here)
#     CreatorHub fee (10%) .... NPR  1,000 (paid to CreatorHub)
#
# This mirrors PLATFORM_FEE_RATE in frontend/src/pages/Campaignform.tsx and
# the public pricing page (frontend/src/pages/Pricing.tsx). Keep them in sync.
#
# The old CreatorHub "standard rate" schedule (fixed NPR 500 / 2,000 / 5,000
# per engagement term) has been removed. Campaigns now always carry the
# brand's own amount ("Custom amount") or "Budget range".

PLATFORM_FEE_RATE: float = 0.10

# Every campaign uses this single pricing model now. It is kept as a column
# for backwards compatibility with existing rows / contracts.
DEFAULT_PRICING_MODEL = "Custom budget"

# Campaign price types (campaigns.price_type). Replaces the confusing
# "Custom amount" / "Budget range" choice on the campaign form.
PRICE_FIXED = "fixed"
PRICE_NEGOTIABLE = "negotiable"


# Minimum fixed price (NPR) per engagement type. A fixed amount must be
# STRICTLY GREATER than the value here. Mirrors MIN_FIXED_PRICE in
# frontend/src/pages/Campaignform.tsx. Keep them in sync.
MIN_FIXED_PRICE = {
    "one-time": 1000,
    "weekly": 5000,
    "monthly": 10000,
    "yearly": 3000,
    "long-term": 3000,
}


def min_fixed_price_error(
    price_type: Optional[str],
    engagement_type: Optional[str],
    budget: Optional[float],
) -> Optional[str]:
    """Return an error message if a fixed price is below the engagement minimum."""
    if (price_type or "").strip().lower() != PRICE_FIXED:
        return None
    minimum = MIN_FIXED_PRICE.get((engagement_type or "").strip().lower())
    if minimum is None or budget is None:
        return None
    if budget <= minimum:
        return (
            f"A fixed price for a {engagement_type} campaign must be "
            f"greater than Rs. {minimum:,}."
        )
    return None


def negotiable_range_error(
    price_type: Optional[str],
    budget: Optional[float],
    budget_min: Optional[float],
    budget_max: Optional[float],
) -> Optional[str]:
    """A negotiable starting price must sit inside the brand's budget range."""
    if (price_type or "").strip().lower() != PRICE_NEGOTIABLE:
        return None
    if budget_min is not None and budget_max is not None and budget_max < budget_min:
        return "Maximum budget cannot be lower than minimum budget."
    if budget is not None:
        if budget_min is not None and budget < budget_min:
            return "Starting price must be within your budget range."
        if budget_max is not None and budget > budget_max:
            return "Starting price must be within your budget range."
    return None


def derive_price_type(price_type: Optional[str], compensation_type: Optional[str] = None) -> str:
    """Explicit price_type wins; legacy rows map "Budget range"/"Negotiable" -> negotiable."""
    explicit = (price_type or "").strip().lower()
    if explicit in (PRICE_FIXED, PRICE_NEGOTIABLE):
        return explicit
    legacy = (compensation_type or "").strip().lower()
    return PRICE_NEGOTIABLE if legacy in ("budget range", "negotiable") else PRICE_FIXED


def compensation_type_for(price_type: str) -> str:
    """Keeps contracts/evidence snapshots using the existing compensation_type column."""
    return "Negotiable" if price_type == PRICE_NEGOTIABLE else "Custom amount"


# Value the old campaign form used for the removed fixed-rate option.
LEGACY_STANDARD_RATE = "CreatorHub standard rate"


def is_legacy_standard_rate(value: Optional[str]) -> bool:
    return (value or "").strip().lower() == LEGACY_STANDARD_RATE.lower()


def campaign_fee_rate(campaign=None) -> float:
    """Platform fee rate for a campaign (falls back to the default 10%)."""
    rate = getattr(campaign, "platform_fee_rate", None) if campaign is not None else None
    try:
        rate = float(rate) if rate is not None else None
    except (TypeError, ValueError):
        rate = None
    return rate if rate is not None and rate >= 0 else PLATFORM_FEE_RATE


def platform_fee_for(creator_payment: float, rate: Optional[float] = None) -> float:
    """Platform fee charged on top of a creator payment."""
    rate = PLATFORM_FEE_RATE if rate is None else rate
    return round(float(creator_payment) * rate, 2)


def total_for_brand(creator_payment: float, rate: Optional[float] = None) -> float:
    """Return the CreatorHub fee due from the brand.

    The creator compensation is NOT processed by CreatorHub. This helper is
    retained for compatibility with older callers, but its result now means
    the platform fee only.
    """
    return platform_fee_for(creator_payment, rate)


def split_brand_total(total_charged: float, rate: Optional[float] = None) -> tuple[float, float]:
    """Compatibility helper for legacy payment records.

    New CreatorHub payments should never call this because the payment amount
    is already the 10% service fee and creator payouts are outside the platform.
    """
    rate = PLATFORM_FEE_RATE if rate is None else rate
    creator_payment = round(float(total_charged) / (1 + rate), 2)
    fee = round(float(total_charged) - creator_payment, 2)
    return creator_payment, fee


def resolve_campaign_rate(campaign) -> Optional[float]:
    """
    Return the single creator payment implied by the campaign's OWN
    compensation setup, if the campaign itself fixes it unambiguously.

    Returns None for "Budget range" and "Negotiable" (and anything else) —
    those have no single implied rate and must be settled after selection.

    The campaign's compensation_type values, as sent by the frontend (see
    COMPENSATION_TYPES in Campaignform.tsx), are "Custom amount" and
    "Budget range".
    """
    comp_type = (campaign.compensation_type or "").strip().lower()

    if comp_type == "custom amount" and campaign.budget is not None:
        return round(float(campaign.budget), 2)

    return None


def total_for_rate(rate: float, campaign) -> float:
    """
    Given a per-month (or flat) rate, compute the total contract value
    (the creator payment, before the platform fee).
    If the engagement/duration text mentions a number of months, multiply;
    otherwise the rate itself is treated as the total (e.g. one-time work).
    """
    raw = f"{campaign.engagement_type or ''} {campaign.duration or ''}".lower()
    match = re.search(r"(\d+)\s*month", raw)
    if match:
        return round(rate * int(match.group(1)), 2)
    return round(rate, 2)


def candidate_rate_and_status(application, campaign) -> tuple[Optional[float], bool]:
    """
    Decide the contract's starting rate and whether it can go straight to
    "pending_payment" (platform fee due) on selection.

    - If the CAMPAIGN itself fixed the compensation ("Custom amount"), that's
      authoritative and the contract can move straight to payment.
    - Otherwise, a creator's proposed rate (application.rate) is only a
      starting point for negotiation — it prefills the finalize form but
      does NOT move the contract forward, since "Budget range" and
      "Negotiable" campaigns still need the business to confirm final terms.
    """
    campaign_rate = resolve_campaign_rate(campaign)
    if campaign_rate is not None:
        return campaign_rate, True

    if application.rate is not None and float(application.rate) > 0:
        return round(float(application.rate), 2), False

    return None, False