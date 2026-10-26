import logging
import re

import httpx

from app.core.config import KHALTI_SECRET_KEY, KHALTI_BASE_URL

logger = logging.getLogger(__name__)

INITIATE_PATH = "/api/v2/epayment/initiate/"
LOOKUP_PATH = "/api/v2/epayment/lookup/"

# Khalti rejects anything below NPR 10 (1000 paisa).
MIN_AMOUNT_NPR = 10


class KhaltiError(Exception):
    """Raised for any Khalti failure.

    `status_code` is the HTTP status the API should answer with:
      503 -> our own Khalti configuration is missing/broken
      502 -> Khalti was reached but rejected / failed the request
    """

    def __init__(self, message: str, detail: str | None = None, status_code: int = 502):
        super().__init__(message)
        self.detail = detail
        self.status_code = status_code


# Khalti validates customer_info.email strictly (needs a real domain with a TLD,
# so things like "user@localhost" or "test@test" are rejected).
_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$")


def _valid_email(value: str | None) -> bool:
    return bool(value) and bool(_EMAIL_RE.match(value.strip()))


def is_configured() -> bool:
    return bool(KHALTI_SECRET_KEY)


def _auth_headers() -> dict[str, str]:
    if not KHALTI_SECRET_KEY:
        raise KhaltiError(
            "Khalti secret key is not configured.",
            "Payments are not set up on the server: KHALTI_SECRET_KEY is missing. "
            "Add it to backend/.env (sandbox: the live_secret_key from test-admin.khalti.com) "
            "and restart the backend.",
            status_code=503,
        )
    return {
        "Authorization": f"Key {KHALTI_SECRET_KEY}",
        "Content-Type": "application/json",
    }


def _extract_detail(resp: httpx.Response) -> str:
    """Turn any Khalti error body into a readable string.

    Khalti answers with different shapes:
      {"detail": "Invalid token.", "status_code": 401}
      {"amount": ["Amount should be greater than Rs. 10, that is 1000 paisa."]}
      {"return_url": ["Enter a valid URL."], "error_key": "validation_error"}
    """
    try:
        data = resp.json()
    except ValueError:
        return (resp.text or "").strip()[:300] or f"HTTP {resp.status_code}"

    if isinstance(data, dict):
        if isinstance(data.get("detail"), str):
            return data["detail"]
        parts = []
        for key, value in data.items():
            if key in ("error_key", "status_code"):
                continue
            if isinstance(value, (list, tuple)):
                value = ", ".join(str(v) for v in value)
            parts.append(f"{key}: {value}")
        if parts:
            return "; ".join(parts)
    return str(data)[:300]


async def _post(path: str, payload: dict, what: str) -> dict:
    headers = _auth_headers()
    url = f"{KHALTI_BASE_URL}{path}"
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            resp = await client.post(url, headers=headers, json=payload)
    except httpx.HTTPError as exc:
        logger.error("Khalti %s: could not connect to %s: %s", what, url, exc)
        raise KhaltiError(
            "Could not connect to Khalti.",
            f"Could not reach Khalti at {KHALTI_BASE_URL}. Check the server's internet "
            f"connection and KHALTI_BASE_URL. ({exc.__class__.__name__})",
        ) from exc

    if resp.status_code >= 400:
        detail = _extract_detail(resp)
        logger.error("Khalti %s failed (%s) at %s: %s", what, resp.status_code, url, detail)
        if resp.status_code == 401:
            detail = (
                f"{detail} -- the Khalti secret key was rejected. Use the live_secret_key from "
                "test-admin.khalti.com with KHALTI_BASE_URL=https://dev.khalti.com "
                "(or a production key with https://khalti.com)."
            )
        raise KhaltiError(f"Khalti {what} failed ({resp.status_code})", detail=detail)

    try:
        return resp.json()
    except ValueError as exc:
        raise KhaltiError("Khalti returned an invalid response.", resp.text[:300]) from exc


async def initiate_payment(
    *,
    amount_npr: float,
    purchase_order_id: str,
    purchase_order_name: str,
    return_url: str,
    website_url: str,
    customer_name: str | None = None,
    customer_email: str | None = None,
) -> dict:
    if amount_npr < MIN_AMOUNT_NPR:
        raise KhaltiError(
            "Amount too small for Khalti.",
            f"Khalti requires a payment of at least NPR {MIN_AMOUNT_NPR}. "
            f"This service fee is NPR {amount_npr:g}.",
            status_code=400,
        )

    payload = {
        "return_url": return_url,
        "website_url": website_url,
        "amount": int(round(amount_npr * 100)),  # paisa
        "purchase_order_id": purchase_order_id,
        "purchase_order_name": purchase_order_name[:120],
    }
    # customer_info is optional for Khalti. Only send fields Khalti will accept.
    customer_info = {}
    if customer_name:
        customer_info["name"] = customer_name.strip()[:100]
    if _valid_email(customer_email):
        customer_info["email"] = customer_email.strip()
    if customer_info:
        payload["customer_info"] = customer_info

    try:
        return await _post(INITIATE_PATH, payload, "initiate")
    except KhaltiError as exc:
        # If Khalti rejects only the optional customer details, retry without them
        # instead of blocking the payment.
        if "customer_info" in (exc.detail or "") and "customer_info" in payload:
            logger.warning("Khalti rejected customer_info (%s); retrying without it.", exc.detail)
            payload.pop("customer_info", None)
            return await _post(INITIATE_PATH, payload, "initiate")
        raise


async def lookup_payment(pidx: str) -> dict:
    return await _post(LOOKUP_PATH, {"pidx": pidx}, "lookup")