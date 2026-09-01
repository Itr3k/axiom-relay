# Axiom public integration repository code guide

## Project overview

This repository is Axiom Relay's public client and integration layer. It contains the `axiom-relay` TypeScript SDK, framework adapters, protocol descriptors, and copyable examples; the proprietary Cloudflare routing runtime is intentionally not included.

## Tech stack

- TypeScript targeting ES2022 and Node.js 20+
- npm package publishing for `axiom-relay`
- x402 client interoperability through `@x402/core`
- JSON/Markdown machine descriptors for OpenAPI, MCP, A2A, agent skills, and catalog discovery
- GitHub Actions for MCP Registry publication

## Architecture

The `axiom-client` package calls Axiom's public HTTP contracts and exposes the base SDK plus LangChain and ElizaOS adapters. Root machine descriptors mirror the publicly callable contract for registry ingestion. The `examples` folder demonstrates integrations without embedding keys or adding signing authority.

## Directory map

| Path | Purpose |
|---|---|
| `axiom-client/src/index.ts` | Base Axiom TypeScript client and public types. |
| `axiom-client/src/langchain/` | Read-only LangChain tool adapter. |
| `axiom-client/src/elizaos/` | Read-only ElizaOS plugin and adapter tests. |
| `examples/` | Framework, protocol, and raw HTTP/TypeScript references. |
| `examples/webmcp/` | Sanitized progressive WebMCP reference. |
| `openapi.json` | Public OpenAPI contract snapshot. |
| `agent-card.json` | A2A Agent Card. |
| `mcp-manifest.json`, `server.json` | MCP tool and registry metadata. |
| `SKILL.md`, `llms.txt` | Agent instructions and LLM navigation. |
| `ai-catalog.json`, `api-catalog.json` | Machine-discovery catalog records. |
| `.github/workflows/publish-mcp.yml` | MCP Registry publication workflow. |

## Feature inventory

- **Services SDK:** discover, quote, and buy x402-paid resources through Axiom's public API.
- **Crypto SDK:** analyze and prepare unsigned Axiom Crypto Beta routes; no signing or submission method exists.
- **Framework adapters:** LangChain and ElizaOS integrations plus examples for OpenAI tools, Google ADK, Mastra, Vercel AI SDK, and Cloudflare Agents.
- **Machine discovery:** OpenAPI, MCP, A2A, x402-oriented, skill, LLM, and catalog descriptors.
- **WebMCP reference:** feature detection, bounded schemas, and same-origin public-contract calls with explicit no-money/no-sign/no-submit boundaries.

## Data models and schema

The SDK types live in `axiom-client/src/index.ts`. Machine request/response shapes are documented in `openapi.json`; WebMCP tool inputs are closed JSON Schemas (`additionalProperties: false`). This repository stores no production database schema or customer data.

## API and routes

All examples call the public Axiom API described by `openapi.json`. Services discovery and quote routes are read-only until an externally signed x402 authorization is supplied. Crypto analysis is read-only; crypto quote preparation returns unsigned transactions. The WebMCP example uses the canonical site's allowlisted `/webmcp-api` gateway.

## Environment and config

The SDK accepts a public Axiom base URL and optional attribution source. Signing keys remain in the caller's process. No Cloudflare, operator, wallet, RPC, or production secrets belong in this repository.

## Build, run, and test

From `axiom-client`, `npm run build` compiles the package with TypeScript, `npm test` runs the adapter contract tests, and `npm pack --dry-run` verifies the publish payload. The ElizaOS adapter test is colocated with its source. Root JSON descriptors should be parsed and checked for URL and product-stage consistency before publication.

## Recent changes

- **2026-08-27:** Added the sanitized WebMCP reference, live reference links, and machine-catalog entries; aligned Axiom Crypto public maturity to live Beta; pinned the clean-checkout build and test dependencies. Files: `examples/webmcp/*`, `README.md`, `axiom-client/README.md`, `axiom-client/package.json`, `SKILL.md`, `llms.txt`, `agent-card.json`, `mcp-manifest.json`, `openapi.json`, `ai-catalog.json`, `api-catalog.json`.
