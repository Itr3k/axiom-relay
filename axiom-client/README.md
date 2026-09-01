# axiom-relay

Client for **[Axiom Relay](https://github.com/Itr3k/axiom-relay)** — the neutral
economic control and evidence layer for autonomous software.

Axiom helps agents discover and purchase paid machine services, and route crypto
transactions, based on total cost, reliability, safety and execution quality.

**Axiom never holds your funds and never signs for you.** This package has no
signing method and no submission path — deliberately. A library that can both
build and send a transaction turns any bug in it into spent money.

```bash
npm install axiom-relay
```

---

## Axiom Crypto Beta

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

### Live Beta capacity

Base mainnet · USDC, WETH, ETH, USDT.

**Tier 1** — $500 max transaction · $10,000 configured daily capacity ·
30 route requests/min.

Three independent controls, not one: the per-transaction ceiling bounds a
single route's exposure, the daily capacity bounds aggregate throughput across
every provider combined, and the request rate protects Axiom's infrastructure
and the provider APIs behind it.

These are operational safety controls, not a statement of past volume. Capacity
increases as Axiom passes further reliability and safety gates.
Read the live values from `GET /v1/crypto/capacity` rather than copying them —
they change without an SDK release.

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

## LangChain

```ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { axiomTools } from 'axiom-relay/langchain';

const tools = axiomTools({
  baseUrl: 'https://axiom-relay.reference-seller.workers.dev',
}).map((t) => new DynamicStructuredTool(t));

// Bind them to a model as you would any other tool.
```

Four tools: `axiom_find_paid_api`, `axiom_quote_paid_api`,
`axiom_quote_crypto_swap`, `axiom_analyze_crypto_swap`.

**Every one is read-only and none accepts a key.** The crypto tools return an
unsigned transaction; the x402 tools stop at a quote. That is a boundary
rather than a missing feature — an agent framework is the wrong place to hand
over signing authority, because the thing choosing what to sign is a language
model. Purchase and execution stay in the runtime API, where you supply a
signer explicitly.

The adapter returns plain tool specs rather than LangChain classes, so it
pins no LangChain version, and describes parameters in JSON Schema rather than
zod, so it forces no zod major on you.

Traffic is attributed as `source=langchain` unless you override it. Verified
against LangChain 1.2.9.

## ElizaOS

```ts
import { axiomPlugin } from 'axiom-relay/elizaos';

const character = {
  name: 'Treasury',
  plugins: [axiomPlugin({ baseUrl: 'https://axiom.elevatedai.io' })],
};
```

Four actions: `AXIOM_QUOTE_SWAP`, `AXIOM_ANALYZE_SWAP`, `AXIOM_FIND_PAID_API`,
`AXIOM_QUOTE_PAID_API`.

ElizaOS agents routinely hold wallets, which is exactly why the boundary is
drawn hard here: every action is read-only, the crypto actions return an
unsigned transaction, and nothing in the plugin accepts a key or can move
funds. Axiom compares and validates; your agent signs, or declines.

The plugin declares ElizaOS's types structurally rather than importing
`@elizaos/core`, so it pins no version on the host agent. Verified against
`@elizaos/core` 1.7.2 in a real `AgentRuntime`.

Traffic is attributed as `source=elizaos`.

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

## Machine discovery

Axiom describes itself in the formats an agent already knows how to read. Every
one is live and reflects what is callable today — nothing here advertises a
capability that is not currently callable.

| | |
|---|---|
| Canonical service | <https://axiom.elevatedai.io> |
| OpenAPI 3.1 | <https://axiom.elevatedai.io/openapi.json> |
| MCP endpoint | `https://axiom.elevatedai.io/mcp` (streamable-http) |
| A2A Agent Card | <https://axiom.elevatedai.io/.well-known/agent-card.json> |
| x402 descriptor | <https://axiom.elevatedai.io/.well-known/x402> |
| Agent instructions | <https://axiom.elevatedai.io/SKILL.md> |
| For LLMs | <https://axiom.elevatedai.io/llms.txt> |
| Capacity and limits | <https://axiom.elevatedai.io/v1/crypto/capacity> |
| WebMCP integration | <https://axiom.elevatedai.io/integrations/webmcp> |
| WebMCP manifest | <https://axiom.elevatedai.io/webmcp/manifest.json> |

Runnable examples for LangChain, ElizaOS, Vercel AI SDK, Mastra, Google ADK,
OpenAI tools, Cloudflare Agents and plain TypeScript:
<https://github.com/Itr3k/axiom-relay/tree/main/examples>

Live first-party examples: [Route Explorer](https://axiom.elevatedai.io/marketplace/route-explorer),
[Swap Agent](https://axiom.elevatedai.io/marketplace/swap), and
[Service Buyer](https://axiom.elevatedai.io/marketplace/service-buyer).

---

MIT · Built by [Elevated AI](https://elevatedai.io) · Elevated AI / N3RD Labs LLC
