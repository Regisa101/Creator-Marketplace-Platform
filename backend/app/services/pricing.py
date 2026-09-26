from __future__ import annotations

import re
from typing import Optional

# Mirrors CREATORHUB_TERM_RATES in frontend/src/pages/Campaignform.tsx.
# Keep these two lists in sync if the standard rate schedule changes.
CREATORHUB_STANDARD_RATES: dict[str, Optional[float]] = {
    "one-time": 500,
    "weekly": None,
    "monthly": 2000,
    "long-term": 5000,
    "yearly": 5000,
}


def creatorhub_standard_rate(engagement_type: Optional[str]) -> Optional[float]:
    """Look up CreatorHub's standard rate for a given engagement term, if any."""
    if not engagement_type:
        return None
    return CREATORHUB_STANDARD_RATES.get(engagement_type.strip().lower())


def resolve_campaign_rate(campaign) -> Optional[float]:
    """
    Return the single rate implied by the campaign's OWN compensation setup,
    if the campaign itself already fixes it unambiguously.

    Returns None for "Budget range" and "Negotiable" (and anything else) —
    those have no single implied rate and must be negotiated after selection.

    NOTE: the campaign's compensation_type values, as actually sent by the
    frontend (see COMPENSATION_TYPES in Campaignform.tsx), are "Custom amount",
    "Budget range", and "CreatorHub standard rate" — NOT "Fixed amount"/"Fixed".
    """
    comp_type = (campaign.compensation_type or "").strip().lower()

    if comp_type == "custom amount" and campaign.budget is not None:
        return round(float(campaign.budget), 2)

    if comp_type == "creatorhub standard rate":
        rate = creatorhub_standard_rate(campaign.engagement_type)
        return round(float(rate), 2) if rate is not None else None

    return None


def total_for_rate(rate: float, campaign) -> float:
    """
    Given a per-month (or flat) rate, compute the total contract value.
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
    "active" on selection.

    - If the CAMPAIGN itself fixed the compensation (Custom amount /
      CreatorHub standard rate), that's authoritative and the contract can
      activate immediately.
    - Otherwise, a creator's proposed rate (application.rate) is only a
      starting point for negotiation — it prefills the finalize form but
      does NOT auto-activate the contract, since "Budget range" and
      "Negotiable" campaigns still need the business to confirm final terms.
    """
    campaign_rate = resolve_campaign_rate(campaign)
    if campaign_rate is not None:
        return campaign_rate, True

    if application.rate is not None and float(application.rate) > 0:
        return round(float(application.rate), 2), False

    return None, False