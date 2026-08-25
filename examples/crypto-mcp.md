# Crypto routing over MCP

Add Axiom to any MCP client:

```json
{
  "mcpServers": {
    "axiom": {
      "type": "http",
      "url": "https://axiom-relay.reference-seller.workers.dev/mcp"
    }
  }
}
```

Two crypto tools, alongside the four service tools:

| tool | returns | moves money |
|---|---|---|
| `analyze_crypto_swap` | costs, route comparison, recommendation | no — and no calldata either |
| `quote_crypto_swap` | the above plus signable transactions | no — signing does |

```
quote_crypto_swap {
  "fromChain": 8453,
  "sellToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "buyToken":  "0x4200000000000000000000000000000000000006",
  "sellAmount": "2000000",
  "taker": "<wallet>"
}
```

The MCP server holds no private key and has no path that submits a
transaction. It returns calldata; the caller's wallet decides whether any of it
ever happens.

Read `costDisclosure` before signing. `providerFee` belongs to the execution
provider and is **not** Axiom revenue; `axiomFee` is the only line Axiom
receives.
