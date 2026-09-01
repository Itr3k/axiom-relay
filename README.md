# Axiom Relay

**The economic layer for agents that isn't also a payment rail.** Axiom Relay is
the neutral economic control and evidence layer for autonomous software. It
evaluates an agent's economic intent against operator policy, compares eligible
providers and payment routes, validates the proposed execution, and preserves
evidence for actions authorized and signed externally.

Axiom Relay owns no payment rail and takes no custody of principal. That is the point
rather than a caveat: a stack that operates a rail is structurally incentivised
to prefer its own, so provider-independent evaluation is only defensible from
somewhere that owns none.

## One product, three surfaces

Axiom Relay is built in three codebases. This repository is the public face of
the first; the other two are separate projects.

| Surface | Where | What it is |
|---|---|---|
| **Infrastructure** | this repository / the Relay runtime | The economic, routing and evidence layer. Source of operational truth. |
| **Live network** | [axiomrelay.io](https://axiomrelay.io) | Bazaar, Commons, Concierge, first-party agents and services, receipts, demonstrations. |
| **Documentation** | [axiom.elevatedai.io](https://axiom.elevatedai.io) | Architecture, security and neutrality models, economics, integration guidance, specifications. |

One document names all three, every machine interface, and the live
availability of every capability:

```
GET /.well-known/axiom-relay.json
```

A snapshot is committed here as [`axiom-relay.json`](axiom-relay.json). A
capability that is gated off reports `available: false` with a reason rather
than being silently omitted, so an agent never finds a URL that would fail when
called.

Hugging Face is a published external runtime and distribution surface — a way
to find and try Axiom Relay, never a payment path. Wherever a model runs, the
economic layer stays here.

Two capabilities, one product:

| | what it does | status |
|---|---|---|
| **Axiom Services** | Finds, ranks and buys x402-paid APIs. The buyer's signed authorization is relayed to the seller. | Live on Base mainnet |
| **Axiom Crypto** | Compares swap routes on total cost, validates the calldata, and returns transactions for the agent to sign. | **Beta**, currently live on Base mainnet |

Axiom never holds customer funds, never signs a customer transaction, and
stores no customer key. It returns **unsigned** transactions; the agent or its
authorized operator signs and submits them. In both capabilities the caller is
the signer.

**Canonical site:** <https://axiom.elevatedai.io> · **API origin:**
`axiom-relay.reference-seller.workers.dev`

These are deliberately separate. The canonical site mirrors every machine
contract over GET and serves no execution route, so documents reference it
while requests execute against the runtime.

Built by [Elevated AI](https://elevatedai.io). See the [public changelog](./CHANGELOG.md) for completed integration updates.

---

## Why this exists

Most x402 tooling assumes the agent already knows the provider's URL. In
practice it doesn't — and roughly **13% of advertised x402 providers do not
answer a valid challenge** when actually called (measured across the live
Coinbase Bazaar catalogue). Axiom absorbs that problem.

```
intent -> discover candidates -> validate -> rank -> pay -> return result
```

## Pricing

| | |
|---|---|
| Fee | **3%** of the seller price |
| Maximum | **$0.50** per purchase |
| Minimum | none |
| Micropayments | fee **waived** when too small to settle, while free capacity remains |

The fee is a percentage below ~$16.67 and flat above it, so a $25 purchase and a
$250 purchase both cost $0.50.

## Non-custodial by construction

The buyer signs **two independent authorisations**: one payable directly to the
seller, one payable to Axiom. Axiom relays the seller's authorisation without
modification and cannot alter its amount or destination.

- Seller funds never enter an Axiom-controlled address.
- **Axiom holds no signing key at all** — it cannot move your money.
- Exactly one routing fee per completed purchase, charged only on success.
- Fallback advances only on positive evidence the previous seller was not paid;
  an ambiguous settlement halts the chain rather than risk a double payment.

## Quickstart

```bash
npm install axiom-relay
```

```ts
import { Axiom } from 'axiom-relay';
import { x402Client } from '@x402/core/client';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';

const signer = new x402Client();
registerExactEvmScheme(signer, { signer: privateKeyToAccount(process.env.KEY) });

const axiom = new Axiom({ baseUrl: 'https://axiom-relay.reference-seller.workers.dev' });

const { route, result } = await axiom.buy(signer, 'crypto price', {
  network: 'eip155:8453',
});

console.log(route.selectionReason);
console.log(result.downstream.body);
```

Or with plain HTTP:

```bash
curl -sX POST https://axiom-relay.reference-seller.workers.dev/v1/route \
  -H 'content-type: application/json' \
  -d '{"capability":"crypto price","requirements":{"network":"eip155:8453"}}'
```

## How routing decides

Axiom evaluates eligible service routes using factors such as cost, observed
reliability, execution conditions, and applicable policy constraints. Responses
include user-relevant reasons so integrators can evaluate the result.

Internal weights, thresholds, selection rules, and detailed fallback logic are
part of the hosted Axiom service and are not published.

## Interfaces

The same decisioning and evidence surface is reachable through every interface
below. None of them is the product; the product is the decision and the
evidence, and each interface reaches the same one -- there is no
interface-specific routing, pricing or validation path.

| Interface | Status |
|---|---|
| MCP (server-side) | Production |
| REST / OpenAPI | Production |
| SDK / client adapter | Production |
| LangChain, ElizaOS adapters | Production |
| **WebMCP (browser-side)** | **Experimental** -- in-tab agents only |
| A2A / AP2 | Monitored, not yet integrated |

## Machine integration

| Surface | Path |
|---|---|
| Service descriptor | `/.well-known/x402` |
| OpenAPI 3.1 | `/openapi.json` |
| Agent skill | `/SKILL.md` |
| LLM navigation | `/llms.txt` |
| A2A Agent Card | `/.well-known/agent-card.json` |
| MCP manifest | `/.well-known/mcp.json` |
| WebMCP integration | `/integrations/webmcp` |
| WebMCP manifest | `/webmcp/manifest.json` |
| Health | `/health` |

## MCP

```json
{
  "mcpServers": {
    "axiom": { "type": "http", "url": "https://axiom-relay.reference-seller.workers.dev/mcp" }
  }
}
```

Tools: `find_paid_resource`, `quote_paid_resource`, `purchase_paid_resource`,
`check_provider`. The MCP layer is a thin adapter over the HTTP API — it
contains no payment logic, so the safety properties are identical.

## Not live

Stated explicitly, because a reader is more likely to assume a capability
exists than to assume it does not:

- **KyberSwap execution.** Kyber is under shadow evaluation and a prepared
  canary only. It is **not** an enabled execution provider, it executes nothing,
  and `KYBERSWAP_ROUTING_ENABLED` is `false` in production.
- **Machine Economic Receipt (MER).** A draft, unpublished and unlicensed for
  external use. Not enabled, not issuing, and no signing key exists.
- **Any verification programme.** No audited status, no certification, no
  revocation policy. Nothing Axiom publishes describes anything as "verified".

## Examples

See [`examples/`](./examples): raw TypeScript, MCP, OpenAI tools, Claude Agent
Skills, LangChain, Cloudflare Agents, WebMCP, and a generic x402 client.

Live first-party reference implementations:

- [Axiom Marketplace](https://axiom.elevatedai.io/marketplace)
- [Route Explorer](https://axiom.elevatedai.io/marketplace/route-explorer)
- [Swap Agent](https://axiom.elevatedai.io/marketplace/swap)
- [Service Buyer](https://axiom.elevatedai.io/marketplace/service-buyer)
- [WebMCP integration](https://axiom.elevatedai.io/integrations/webmcp) and
  [19-tool manifest](https://axiom.elevatedai.io/webmcp/manifest.json)

## Two behaviours worth knowing

**Waived fee.** When `feePolicy` is `fee_waived_micropayment`, `axiomFee` is `0`
and `payTo` is null. Do not sign a fee leg — there is nothing to authorise.

**Free-route quota.** `free_route_quota_exhausted` (HTTP 429) means the purchase
is valid and the provider healthy, but Axiom's free-routing allocation is spent.
The response carries `resetsAt`. Purchases whose fee is collectible are never
quota-limited.

## Security model

- x402 v2, `exact` scheme, USDC on Base.
- Destination URLs are validated against SSRF: loopback, RFC1918, link-local,
  cloud metadata, IPv4-mapped and NAT64 embeddings, embedded credentials and
  non-web ports are refused, and every redirect hop is revalidated independently.
- Replay protection claims each EIP-3009 authorisation nonce atomically.
- A discovered provider is an untrusted claim: schema-checked, SSRF-validated
  and probed for a live challenge before it can be selected.

## Status

Live on Base mainnet with real settlements. Base Sepolia also supported for
testing. Current state is always readable at `/health`.

## Licence

MIT

---

## Axiom Crypto Beta

Describe a swap. Axiom queries execution providers, normalises every fee and
gas cost, ranks routes on what you would actually receive, validates the
calldata against what you asked for, and hands back transactions **your** wallet
signs.

Axiom never takes custody and never signs.

### What it supports today

| | |
|---|---|
| Network | Base mainnet |
| Assets | USDC, WETH, ETH, USDT |
| Execution provider | LI.FI |
| Axiom fee | **15 bps (0.15%)** |
| Max trade | **$500** |
| Daily capacity | **$10,000** |
| Rate limit | 30 routes/min |

These are operational safety limits, not product limits. Axiom Crypto is **Beta
and currently live**, and uses **LI.FI as the enabled execution provider** --
the only one. Limits rise through the published capacity tiers; see
`/v1/crypto/capacity` for the current tier and its graduation gates.

That endpoint reports capacity, not reliability. It exposes no reliability
score, and Axiom operates **no verification programme** -- there is no audited
status, no certification and no revocation policy, so nothing here is described
as "verified".

### Fees are disclosed separately, always

Execution providers often report one aggregate fee line. LI.FI's is 25 bps of
its own plus Axiom's 15. Axiom splits them and attributes each to its
recipient, because presenting a provider's fee as Axiom revenue would misstate
both what you pay Axiom and what Axiom earns:

```json
"costDisclosure": {
  "providerFee":  { "amount": "5000", "token": "USDC", "bps": 25 },
  "axiomFee":     { "amount": "3000", "token": "USDC", "bps": 15 },
  "networkGas":   { "amount": "...",  "token": "ETH" },
  "slippage":     { "toleranceBps": 50, "guaranteedOutput": "...", "worstCaseBps": 50 },
  "priceImpactBps": null,
  "expectedOutput":   { "amount": "...", "token": "WETH" },
  "netAfterAllCosts": { "amount": "...", "token": "WETH" },
  "totalEffectiveCostBps": 87,
  "note": "providerFee is charged by the execution provider and is not Axiom revenue."
}
```

`priceImpactBps` is `null` rather than `0` when a provider does not report it.
An unreported impact is unknown, not absent.

### Quote a route

```bash
curl -sX POST https://axiom-relay.reference-seller.workers.dev/v1/crypto/quote \
  -H 'content-type: application/json' \
  -d '{
    "fromChain": 8453,
    "sellToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "buyToken":  "0x4200000000000000000000000000000000000006",
    "sellAmount": "2000000",
    "taker": "<your wallet>",
    "slippageBps": 100
  }'
```

You get back `selected`, `costDisclosure`, `selectionReason`,
`savingsVsRunnerUp`, `alternatives`, and `transactions` — an exact-amount
approval followed by the swap. Sign them in order from the taker wallet.

### Analyse without receiving calldata

`POST /v1/crypto/analyze` answers the same question and deliberately withholds
the means to act: identical economics, `transactions: null`, plus a
recommendation. Useful when an agent wants the cost of a trade without being
handed the ability to make it.

### What Axiom will refuse

Route validation checks the provider's answer against what was asked, not
against what the provider claims it did:

- calldata built for a different chain
- a sell amount that is not the one quoted
- native value attached to an ERC-20 sale
- an approval whose spender is not the route's allowance target
- **unlimited approvals** — exact-amount only, unless an operator opts in
- a floor implying wider slippage than you specified
- a stale quote
- a token that is not allowlisted
- a route whose simulation fails

### Signing model

```
intent → quote → inspect route → sign transaction → submit
```

Axiom performs the first three. Your wallet performs the last two. There is no
execution endpoint, because execution is signing, and Axiom cannot sign.

---

## Licensing

This repository is Axiom's **client and integration layer** — the typed SDK,
framework adapters, protocol descriptors and examples. It is MIT licensed, and
you are free to embed it anywhere, including commercially.

The Axiom **hosted service** is a separate proprietary work. It is not
distributed here, and using or forking this SDK does not grant rights to it,
imply partnership, or imply endorsement. The production service runs at
<https://axiom.elevatedai.io>.

The MIT licence applies to the source code in this repository. It does not grant
rights to use the project's names, logos, or branding.

Copyright (c) 2026 Elevated AI / N3RD Labs LLC. See `LICENSE` and `NOTICE`.
