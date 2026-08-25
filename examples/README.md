# Integration examples

Each answers one question: **how does an autonomous agent use Axiom to acquire a
paid capability?**

| File | Ecosystem |
|---|---|
| `typescript.ts` | Raw TypeScript with the x402 SDK |
| `mcp.json` | Model Context Protocol client config |
| `openai-tools.ts` | OpenAI tool/function calling |
| `claude-skill.md` | Claude Agent Skills |
| `langchain.ts` | LangChain tool |
| `cloudflare-agent.ts` | Cloudflare Agents / Workers |
| `generic-x402.ts` | Any x402 client, no Axiom SDK |

## Axiom Crypto (Beta)

| File | Ecosystem |
|---|---|
| `crypto-typescript.ts` | Raw TypeScript with the SDK |
| `crypto-mcp.md` | Model Context Protocol |
| `crypto-openai-tools.ts` | OpenAI tool calling (analysis only) |
| `crypto-claude-skill.md` | Claude Agent Skills |

Every crypto example follows the same four stages, kept visibly apart because
they carry different authority:

```
analyse  →  quote  →  inspect  →  sign
 reads      prepares   reads      spends
```

Axiom performs the first three. Your wallet performs the last. There is no
execution endpoint, and the SDK exposes no signing method — nothing happens
until you sign.

## Framework coverage

| File | Framework | Axiom call path tested live |
|---|---|---|
| `typescript.ts` | Raw TypeScript + SDK | ✅ |
| `crypto-typescript.ts` | Raw TypeScript + SDK (crypto) | ✅ |
| `openai-tools.ts` / `crypto-openai-tools.ts` | OpenAI tool calling | ✅ |
| `langchain.ts` | LangChain | ✅ |
| `cloudflare-agent.ts` | Cloudflare Agents | ✅ (route half) |
| `google-adk.py` | Google ADK | ✅ |
| `vercel-ai-sdk.ts` | Vercel AI SDK | ✅ |
| `mastra.ts` | Mastra | ✅ |
| `mcp.json` / `crypto-mcp.md` | Model Context Protocol | ✅ |
| `claude-skill.md` / `crypto-claude-skill.md` | Claude Agent Skills | ✅ |
| `generic-x402.ts` | Any x402 client | ✅ |

"Tested live" means the Axiom request each example makes was executed against
production and returned the documented shape, with `source=framework_example`
recorded. The framework runtimes themselves are not installed here — the wiring
is idiomatic, the Axiom call is verified.

Every example sets `source` so the channel is measurable, and none contains a
private key or signs anything.
