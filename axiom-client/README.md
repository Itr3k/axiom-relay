# axiom-relay

Client for **[Axiom by Elevated AI](https://github.com/Itr3k/axiom-relay)** — a
non-custodial routing layer for autonomous AI agents.

Axiom helps agents discover and purchase paid machine services, and route crypto
transactions, based on total cost, reliability, safety and execution quality.

**Axiom never holds your funds and never signs for you.** This package has no
signing method and no submission path — deliberately. A library that can both
build and send a transaction turns any bug in it into spent money.

```bash
npm install axiom-relay
```

---

## Axiom Crypto

Compare swap routes on what you would actually receive, then sign yourself.

```ts
import { Axiom } from 'axiom-relay';

const axiom = new Axiom({
  baseUrl: 'https://axiom-relay.reference-seller.workers.dev',
  source: 'sdk',
});

const quote = await axiom.quoteCryptoRoute({
  fromChain: 8453,                                             // Base
  sellToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',     // USDC
  buyToken:  '0x4200000000000000000000000000000000000006',     // WETH
  sellAmount: '2000000',                                       // atomic units
  taker: myWalletAddress,
  slippageBps: 100,
});

// Read what it costs before committing to anything.
const d = quote.costDisclosure;
console.log(d.providerFee.bps, 'bps to the execution provider');  // not Axiom's
console.log(d.axiomFee.bps,    'bps to Axiom');                   // 15
console.log(d.totalEffectiveCostBps, 'bps all-in');

// Sign these yourself. Axiom cannot.
for (const tx of quote.transactions) {
  await wallet.sendTransaction({ to: tx.to, data: tx.data, value: BigInt(tx.value) });
}
```

### Fees are reported separately, always

Execution providers often return a single aggregate fee line. LI.FI's is 25 bps
of its own plus Axiom's 15. `costDisclosure` splits them and attributes each to
its recipient:

| field | who receives it |
|---|---|
| `providerFee` | the execution provider — **not Axiom revenue** |
| `axiomFee` | Axiom, 15 bps |
| `networkGas` | the network, paid by whoever signs |
| `slippage` | nobody — it is a tolerance, with the guaranteed floor stated |

`priceImpactBps` is `null` rather than `0` when a provider does not report it.
Unknown is not absent.

### Analyse without receiving calldata

```ts
const a = await axiom.analyzeCryptoRoute({ /* same input */ });
a.transactions;      // null — this cannot execute anything
a.recommendation;    // { execute, confidence, concerns, summary }
```

Safe to expose to a model: nothing it returns can be signed.

### Limits

Base mainnet · USDC, WETH, ETH, USDT · **$500** max trade · **$10,000** daily
capacity · 30 routes/min. These are operational safety limits, not product
limits — the capability is in production and callable today. Limits rise as
Axiom accumulates verified production reliability; `/v1/crypto/capacity`
reports the current tier and its graduation gates.

---

## Axiom Services

Find, rank and buy x402-paid APIs. You sign the payment; Axiom relays it.

```ts
const route = await axiom.route('crypto price', { network: 'eip155:8453' });
console.log(route.selected.host, route.selectionReason);

const result = await axiom.purchase(signer, route);   // signer is yours
```

`route()` executes no payment. Signing happens in your process with your own
x402 signer — Axiom never receives a key.

**Pricing:** 3% capped at $0.50, waived entirely when the fee is too small to
settle. A micropayment is routed free rather than refused.

---

## Attribution

Pass `source` when constructing the client so Axiom can tell which channel
callers arrive through. It is metadata, not authentication, and carries no
privilege.

```ts
new Axiom({ baseUrl, source: 'sdk' });
```

## Two surprising behaviours

**A waived fee is not an error.** Below the settlement threshold Axiom creates
no fee leg at all and routes you anyway.

**Quota exhaustion is not a failure of your request.** `free_route_quota_exhausted`
means the purchase was valid and the provider healthy; Axiom's free allocation
is spent. Retry after `resetsAt`.

---

MIT · Built by [Elevated AI](https://elevatedai.io)
