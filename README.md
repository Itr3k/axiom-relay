# Axiom Relay legacy integration repository (retired)

This repository preserves the historical Axiom x402 and crypto-routing client
for source review and compatibility archaeology. It is retired and is **not** a
source of current Axiom Relay product, availability, endpoint, pricing, payment,
or security claims.

Do not connect an agent to endpoints found in this repository, install its SDK
for a new integration, or treat its machine descriptors as live. In particular,
the following legacy identities are retired:

- npm package: `axiom-relay`
- MCP Registry: `io.github.Itr3k/axiom-x402-payment-relay`
- MCP Registry: `io.github.Itr3k/axiom-x402-payment-crypto-router`
- Glama source listing: `Itr3k/axiom-relay`

The canonical current product is [AxiomRelay.io](https://axiomrelay.io). Use its
live capability directory and machine-readable discovery documents for current
truth:

- [Capability directory](https://axiomrelay.io/api/v1/capabilities)
- [Service discovery](https://axiomrelay.io/.well-known/axiom-services.json)
- [Agent Card](https://axiomrelay.io/.well-known/agent-card.json)
- [OpenAPI](https://axiomrelay.io/openapi.json)

The source and examples remain under the MIT license for historical reference.
They receive no production updates, and no package or MCP publication is
performed from this repository.
