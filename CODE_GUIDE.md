# Axiom legacy public integration repository code guide

## Project overview

This repository is the retired public client and integration layer for an older
Axiom x402 and crypto-routing service. It is retained as historical source only;
current Axiom Relay product truth and machine discovery live at
`https://axiomrelay.io`.

## Tech stack

- TypeScript targeting ES2022 and Node.js 20+
- Historical x402 interoperability through `@x402/core`
- Vitest adapter contract tests
- JSON and Markdown tombstones for the retired npm and MCP identities

## Architecture

The code under `axiom-client` and `examples` preserves the former SDK and
integration examples without changing their historical behavior. Root metadata
files are inert tombstones: they expose no executable API paths, MCP transports,
MCP tools, or agent skills. Automatic npm and MCP publication is disabled.

## Directory map

| Path | Purpose |
|---|---|
| `axiom-client/src/` | Historical TypeScript client and adapters. |
| `axiom-client/package.json` | Private package metadata that blocks accidental republication. |
| `examples/` | Historical examples; not current integration guidance. |
| `README.md` | Human-readable retirement notice and canonical current links. |
| `server.json` | Inert tombstone for the exact legacy MCP Registry identity. |
| `mcp-manifest.json` | Retired MCP manifest with no transport or tools. |
| `openapi.json`, `agent-card.json` | Inert API and agent descriptors. |
| `axiom-relay.json`, `ai-catalog.json`, `api-catalog.json` | Retired discovery metadata. |
| `SKILL.md`, `llms.txt` | Machine-readable retirement guidance. |
| `scripts/check-public-claims.mjs` | Regression guard for canonical identity and non-executable metadata. |

## Feature inventory

- **Historical SDK:** former service and crypto client types and adapters,
  retained without production support.
- **Repository tombstone:** names the retired npm, MCP Registry, and Glama
  identities and points readers to `axiomrelay.io`.
- **Publication safety:** the package is private, the MCP publishing workflow
  has been removed, and the executable Smithery descriptor is absent.
- **Metadata regression guard:** rejects stale origins, live-economic claims,
  executable MCP transports, API paths, or agent skills in identity metadata.

## Data models and schema

Historical SDK types remain in `axiom-client/src/index.ts`. The repository has no
database or production data. Root descriptors contain only retirement status and
canonical discovery links.

## API and routes

This repository exposes no live API or MCP route. `openapi.json` has an empty
`paths` object, `server.json` has no package or remote transport, and
`mcp-manifest.json` has no tools. Current machine interfaces are discoverable
from `https://axiomrelay.io`.

## Environment and config

No production secrets, wallet keys, registry tokens, Cloudflare credentials, or
operator configuration belong in this repository. The retained historical
client accepts a base URL, but its defaults are not current product truth.

## Build, run, and test

From the repository root, `node scripts/check-public-claims.mjs` validates the
tombstone. From `axiom-client`, `npm run build` compiles the retained source and
`npm test` runs historical adapter tests. The package is marked private and must
not be published.

## Recent changes

- **2026-09-02:** Retired repository-controlled npm/MCP identity metadata,
  removed the automatic MCP publisher, neutralized machine descriptors, added
  canonical `axiomrelay.io` links, and replaced live-claim tests with tombstone
  regression coverage. Files: `README.md`, `axiom-client/README.md`,
  `axiom-client/package.json`, root machine descriptors,
  `.github/workflows/publish-mcp.yml`, `smithery.yaml`,
  `scripts/check-public-claims.mjs`.
- **2026-08-27:** Added the historical WebMCP reference and aligned then-current
  public integration descriptors.
