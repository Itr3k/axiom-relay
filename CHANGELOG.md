# Changelog

Notable changes to Axiom's public client and integration layer are recorded
here. Entries describe completed public work; internal implementation details
and future roadmap items are intentionally excluded.

## 2026-09-01

- Adopted **Axiom Relay** as the canonical product name across the README,
  machine contracts, registry descriptors and client package metadata. The two
  public sites previously published Agent Cards naming different products, so
  what an agent thought it had found depended on which host it reached first.
- Regenerated `agent-card.json`, `mcp-manifest.json`, `ai-catalog.json`,
  `api-catalog.json`, `openapi.json`, `llms.txt` and `SKILL.md` from the
  deployed release. All seven had drifted behind production.
- Added `axiom-relay.json`: the ecosystem discovery graph, naming the three
  surfaces of the product, every machine interface, and the live availability of
  each capability. A gated capability reports `available: false` with a reason
  rather than being omitted, so an agent never finds a URL that would fail when
  called. Served at `/.well-known/axiom-relay.json`.
- Documented the one-product/three-surface model in the README: this
  infrastructure layer, the live network at axiomrelay.io, and the documentation
  surface at axiom.elevatedai.io.
- Recorded the published Hugging Face Space as an external runtime and
  distribution surface, marked discovery-only. It is not a payment path.
- `server.json` keeps its registry identifier unchanged. Three versions are
  already published under it, so renaming would orphan the listing rather than
  correct it; only the human-readable title and description moved.

No change to fees, payment behaviour, routing, crypto behaviour or any public
route. The `axiom-relay` npm package still serves 0.2.1 with its previous
description; republishing requires credentials this change did not have.

## 2026-08-27

- Added a sanitized WebMCP reference integration and linked the live public
  integration surface.
- Expanded machine-discovery metadata for OpenAPI, MCP, A2A, agent-skill, and
  catalog consumers.
- Added and documented public SDK examples for supported agent and framework
  integrations.
- Aligned Axiom Crypto's public maturity and availability descriptions across
  the repository.
- Clarified the boundary between Axiom's public integration contract and the
  proprietary hosted routing service.
- Pinned clean-checkout build and test dependencies for reproducible SDK
  validation.
