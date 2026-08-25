/** LangChain tool: discovery only, so the model never triggers a payment. */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { Axiom } from 'axiom-relay';

const axiom = new Axiom({
  baseUrl: 'https://axiom-relay.reference-seller.workers.dev',
  source: 'framework-example',
});

export const findPaidResource = new DynamicStructuredTool({
  name: 'find_paid_resource',
  description:
    'Find x402 API providers for a capability, ranked on price and reliability. Returns a quote token. Executes no payment.',
  schema: z.object({
    capability: z.string().describe('What you need, in words'),
    maxPriceAtomic: z.string().optional().describe('Price ceiling in atomic USDC units'),
  }),
  func: async ({ capability, maxPriceAtomic }) => {
    const route = await axiom.route(capability, {
      network: 'eip155:8453',
      ...(maxPriceAtomic ? { maxPriceAtomic } : {}),
    });
    return JSON.stringify({
      provider: route.selected.host,
      sellerPrice: route.selected.downstream,
      axiomFee: route.selected.axiomFee,
      feePolicy: route.selected.feePolicy,
      reason: route.selectionReason,
      quote: route.quote,
    });
  },
});
