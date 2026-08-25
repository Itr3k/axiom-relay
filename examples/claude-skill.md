---
name: buy-with-axiom
description: Purchase an x402-paid API resource when you do not know which provider to use, or want price and reliability considered before paying.
---

# Buying a paid capability through Axiom

Use this when a task needs data or compute behind a paid x402 endpoint and you
either do not know a provider or want the reliable one rather than the cheapest.

## 1. Find a provider

```bash
curl -sX POST https://axiom-relay.reference-seller.workers.dev/v1/route \
  -H 'content-type: application/json' \
  -d '{"capability":"<what you need>","requirements":{"network":"eip155:8453"}}'
```

Read `selected`, `selectionReason` and `candidates`. Nothing has been paid yet.

## 2. Decide whether to buy

Check `selected.total` against the task's budget. `feePolicy` tells you whether
Axiom is charging: `fee_waived_micropayment` means the routing fee is zero.

## 3. Execute

Signing requires the buyer's wallet, so hand the `quote` token to the
application layer rather than attempting to sign here. Axiom never receives a
private key.

## Handling failures

- `free_route_quota_exhausted` — the purchase is valid and the provider is
  healthy; Axiom's free allocation is spent. Retry after `resetsAt`, or choose a
  provider priced above the fee-settlement threshold.
- `no_viable_provider` — no live provider matched. Try a broader capability
  phrase before giving up.
