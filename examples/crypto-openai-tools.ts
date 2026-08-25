/**
 * OpenAI tool calling for crypto routing.
 *
 * Only analysis is exposed to the model. Quoting returns calldata, and calldata
 * is one signature away from spending real money -- that belongs to your
 * application's control flow, not to a generated tool call.
 */
import { Axiom } from 'axiom-relay';

const axiom = new Axiom({
  baseUrl: 'https://axiom-relay.reference-seller.workers.dev',
  source: 'framework-example',
});

export const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'analyze_crypto_route',
      description:
        'Compare execution routes for a token swap on Base and report total cost, price impact, ' +
        'route reliability and whether execution is advisable. Returns no transaction and cannot spend.',
      parameters: {
        type: 'object',
        required: ['sellToken', 'buyToken', 'sellAmount', 'taker'],
        properties: {
          sellToken: { type: 'string', description: 'Contract address being sold' },
          buyToken: { type: 'string', description: 'Contract address being bought' },
          sellAmount: { type: 'string', description: "Amount in the sell token's atomic units" },
          taker: { type: 'string', description: 'Wallet that would sign' },
        },
      },
    },
  },
];

export async function callTool(name: string, args: Record<string, string>) {
  if (name !== 'analyze_crypto_route') throw new Error(`unknown tool: ${name}`);
  const a = await axiom.analyzeCryptoRoute({ fromChain: 8453, ...args } as never);
  return {
    provider: a.selected.provider,
    totalCostBps: a.costDisclosure.totalEffectiveCostBps,
    axiomFeeBps: a.costDisclosure.axiomFee?.bps ?? 0,
    providerFeeBps: a.costDisclosure.providerFee?.bps ?? 0,
    expectedOutput: a.costDisclosure.expectedOutput,
    recommend: a.recommendation,
  };
}
