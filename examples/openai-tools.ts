/**
 * OpenAI tool calling.
 *
 * Discovery and quoting are safe to expose directly to a model: neither moves
 * money. Purchasing is deliberately kept out of the model's reach here -- the
 * signing step belongs to your application, not to a generated tool call.
 */
import OpenAI from 'openai';
import { Axiom } from 'axiom-relay';

const axiom = new Axiom({
  baseUrl: 'https://axiom-relay.reference-seller.workers.dev',
  source: 'framework-example',
});

export const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'find_paid_resource',
      description:
        'Find x402 API providers for a described capability, ranked by price and reliability. Executes no payment.',
      parameters: {
        type: 'object',
        required: ['capability'],
        properties: {
          capability: { type: 'string', description: 'What you need, in words.' },
          maxPriceAtomic: { type: 'string', description: 'Optional price ceiling in atomic USDC units.' },
        },
      },
    },
  },
];

export async function callTool(name: string, args: { capability: string; maxPriceAtomic?: string }) {
  if (name !== 'find_paid_resource') throw new Error(`unknown tool: ${name}`);
  const route = await axiom.route(args.capability, {
    network: 'eip155:8453',
    ...(args.maxPriceAtomic ? { maxPriceAtomic: args.maxPriceAtomic } : {}),
  });
  return {
    selected: route.selected.host,
    sellerPrice: route.selected.downstream,
    axiomFee: route.selected.axiomFee,
    reason: route.selectionReason,
    quote: route.quote,
  };
}

void OpenAI;
