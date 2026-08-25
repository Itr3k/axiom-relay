---
name: axiom-relay
description: Buy an x402-paid API resource when you do not know which provider to use, or want price and reliability considered. Axiom discovers providers, checks they are live, ranks them, pays the seller directly, and returns the result.
---

# Axiom Relay

An x402 smart router for autonomous agents. Give it a capability instead of a URL.

## When to use this

- You need a paid external capability and do not know the best provider.
- You want provider health and reliability considered before paying.
- You want automatic, safe fallback if the first provider fails.
- You want a predictable routing fee: 3% capped at $0.50.

Use a provider's own endpoint directly instead when you already know exactly
which resource you want and do not need routing.

## Pricing

- 3% of the seller price, never more than $0.50 per purchase.
- No minimum fee.
- If the fee is too small for the facilitator to settle, it is **waived** and
  the purchase is routed free while free-routing capacity remains.
- You always pay the seller directly. Axiom never holds your funds.

## Endpoints

| Purpose | Call |
|---|---|
| Route by capability | `POST https://axiom-relay.reference-seller.workers.dev/v1/route` |
| Quote a known URL | `POST https://axiom-relay.reference-seller.workers.dev/v1/quote` |
| Execute a quote | `POST https://axiom-relay.reference-seller.workers.dev/v1/request` |
| Machine descriptor | `GET https://axiom-relay.reference-seller.workers.dev/.well-known/x402` |
| OpenAPI | `GET https://axiom-relay.reference-seller.workers.dev/openapi.json` |
| Health | `GET https://axiom-relay.reference-seller.workers.dev/health` |

## 1. Route by capability

```bash
curl -sX POST https://axiom-relay.reference-seller.workers.dev/v1/route \
  -H 'content-type: application/json' \
  -d '{"capability":"crypto price","requirements":{"network":"eip155:8453"}}'
```

Returns ranked candidates, the selected provider, why it won, and a signed
`quote` covering the winner plus fallbacks.

## 2. Sign and execute

Sign with the standard x402 SDK. Axiom never sees your key.

```ts
import { x402Client } from '@x402/core/client';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { encodePaymentSignatureHeader } from '@x402/core/http';
import { privateKeyToAccount } from 'viem/accounts';

const client = new x402Client();
registerExactEvmScheme(client, { signer: privateKeyToAccount(KEY) });

const sel = route.candidates[0];
const sign = (r) => client.createPaymentPayload({
  x402Version: 2, resource: { url: sel.resource }, accepts: [r],
});

const seller = await sign({
  scheme: 'exact', network: sel.network, asset: sel.asset,
  amount: sel.downstream, payTo: sel.payTo,
  maxTimeoutSeconds: sel.maxTimeoutSeconds, extra: sel.extra,
});

// Only sign a fee leg when one is actually charged.
const authorizations = [
  sel.feePolicy === 'fee_waived_micropayment'
    ? { seller: encodePaymentSignatureHeader(seller) }
    : {
        seller: encodePaymentSignatureHeader(seller),
        fee: encodePaymentSignatureHeader(await sign({
          scheme: 'exact', network: sel.network, asset: sel.asset,
          amount: sel.axiomFee, payTo: route.feePayTo,
          maxTimeoutSeconds: sel.maxTimeoutSeconds, extra: sel.extra,
        })),
      },
];

const res = await fetch('https://axiom-relay.reference-seller.workers.dev/v1/request', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ quote: route.quote, authorizations }),
});
```

Sign one pair per candidate you are willing to use. Only the provider that
succeeds is ever settled; the rest expire unspent.

## Handling the two cases that surprise people

**Waived fee.** When `feePolicy` is `fee_waived_micropayment`, `axiomFee`
is `0` and `payTo` is null. Do **not** sign a fee leg — there is nothing to
authorise, and sending one is rejected.

**Free-route quota exhausted.** Code `free_route_quota_exhausted` (HTTP 429)
means the purchase is valid and the provider healthy, but Axiom's free-routing
allocation is spent. The response carries `resetsAt`. Retry later, or pick a
provider priced above the fee-settlement threshold, where routing is never
quota-limited.

## Safety properties

- Non-custodial: the buyer pays the seller directly; seller funds never enter
  an Axiom address.
- Keyless: Axiom holds no signing key and cannot move your funds.
- Fallback only advances on positive evidence the previous seller was not paid.
  An ambiguous settlement stops the chain rather than risking a double payment.
- Exactly one routing fee per completed purchase, charged only on success.

## Supported today

Base mainnet (`eip155:8453`) and Base Sepolia (`eip155:84532`), USDC,
x402 v2, `exact` scheme.
