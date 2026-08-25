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
