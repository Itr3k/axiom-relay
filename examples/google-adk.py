"""
Google ADK — Axiom as a function tool.

Discovery and quoting only. Both read; neither can spend. Signing belongs to
the application, not to a tool the model can call, because a signature is the
one step that moves money.
"""
import os
import httpx

AXIOM = "https://axiom-relay.reference-seller.workers.dev"  # execution origin
DOCS = "https://axiom.elevatedai.io"                        # canonical identity


def find_paid_api(capability: str) -> dict:
    """Find an x402 API for a described capability, ranked on price and reliability.

    Executes no payment. Returns the chosen provider, its price, Axiom's fee and
    the reason it was chosen.
    """
    r = httpx.post(
        f"{AXIOM}/v1/route",
        params={"source": "framework_example"},
        json={"capability": capability, "requirements": {"network": "eip155:8453"}},
        timeout=30,
    )
    r.raise_for_status()
    d = r.json()
    return {
        "provider": d["selected"]["host"],
        "sellerPrice": d["selected"]["downstream"],
        "axiomFee": d["selected"]["axiomFee"],
        "feePolicy": d["selected"]["feePolicy"],
        "reason": d["selectionReason"],
        "quote": d["quote"],
    }


def analyze_crypto_swap(sell_token: str, buy_token: str, sell_amount: str, taker: str) -> dict:
    """Compare swap routes on Base and report total cost. Returns no transaction."""
    r = httpx.post(
        f"{AXIOM}/v1/crypto/analyze",
        params={"source": "framework_example"},
        json={"fromChain": 8453, "sellToken": sell_token, "buyToken": buy_token,
              "sellAmount": sell_amount, "taker": taker},
        timeout=30,
    )
    r.raise_for_status()
    d = r.json()
    c = d["costDisclosure"]
    return {
        "provider": d["selected"]["provider"],
        # The provider's fee is theirs, not Axiom's. Reporting the sum as
        # Axiom's would overstate it by roughly three times.
        "providerFeeBps": (c.get("providerFee") or {}).get("bps", 0),
        "axiomFeeBps": (c.get("axiomFee") or {}).get("bps", 0),
        "totalCostBps": c["totalEffectiveCostBps"],
        "recommend": d["recommendation"],
    }


# from google.adk.agents import Agent
# agent = Agent(model="gemini-2.0-flash", tools=[find_paid_api, analyze_crypto_swap])
