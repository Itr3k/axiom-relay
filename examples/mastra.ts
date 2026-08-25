/**
 * Mastra — Axiom as tools.
 *
 * Discovery and analysis are safe for a model to call. Execution preparation
 * returns calldata and is deliberately absent: the signer is the application's
 * responsibility, and Axiom cannot sign for anyone.
 */
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Axiom } from 'axiom-relay';

const axiom = new Axiom({
  baseUrl: 'https://axiom-relay.reference-seller.workers.dev',
  source: 'framework_example',
});

export const findPaidApi = createTool({
  id: 'find-paid-api',
  description: 'Find an x402-paid API for a capability, ranked on price and reliability. No payment occurs.',
  inputSchema: z.object({ capability: z.string() }),
  execute: async ({ context }) => {
    const r = await axiom.route(context.capability, { network: 'eip155:8453' });
    return { provider: r.selected.host, sellerPrice: r.selected.downstream, reason: r.selectionReason };
  },
});

export const analyzeSwap = createTool({
  id: 'analyze-crypto-swap',
  description: 'Compare swap routes on Base by total cost. Returns no signable transaction.',
  inputSchema: z.object({ sellToken: z.string(), buyToken: z.string(), sellAmount: z.string(), taker: z.string() }),
  execute: async ({ context }) => {
    const a = await axiom.analyzeCryptoRoute({ fromChain: 8453, ...context });
    return {
      provider: a.selected.provider,
      axiomFeeBps: a.costDisclosure.axiomFee?.bps ?? 0,
      providerFeeBps: a.costDisclosure.providerFee?.bps ?? 0,
      totalCostBps: a.costDisclosure.totalEffectiveCostBps,
    };
  },
});
