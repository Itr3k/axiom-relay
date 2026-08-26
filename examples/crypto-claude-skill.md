---
name: route-crypto-swap
description: Compare swap routes and prepare a non-custodial transaction when a task needs to exchange one token for another on Base.
---

# Routing a swap through Axiom

Use when a task needs to exchange tokens and you want the route with the best
outcome after every cost — not the best headline price.

## 1. Analyse first

```bash
curl -sX POST https://axiom-relay.reference-seller.workers.dev/v1/crypto/analyze \
  -H 'content-type: application/json' \
  -d '{"fromChain":8453,"sellToken":"<addr>","buyToken":"<addr>","sellAmount":"<atomic>","taker":"<wallet>"}'
```

Read `recommendation.execute` and `recommendation.concerns`. No transaction is
returned, so this cannot spend anything.

## 2. Read the costs honestly

`costDisclosure` separates the fees. `providerFee` is the execution provider's
own charge and is **not** Axiom revenue. `axiomFee` is 15 bps and is the only
line Axiom receives. `networkGas` is paid separately by whoever signs.

`priceImpactBps` of `null` means the provider did not report it — unknown, not
zero.

## 3. Quote when you intend to proceed

`POST /v1/crypto/quote` returns the same economics plus `transactions`: an
exact-amount approval, then the swap.

## 4. Signing is not yours to delegate

Hand the transactions to the wallet layer. Axiom holds no key and exposes no
execution endpoint — nothing happens until a signature exists.

## Operational limits

$500 per trade, $5,000 per day. Exceeding either returns
`crypto_trade_too_large` or `crypto_daily_gmv_exhausted`; both are honest
refusals, not failures.
