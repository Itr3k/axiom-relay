/**
 * Vercel AI SDK — Axiom as tools.
 *
 * Read-only tools only. Quoting returns calldata, and calldata is one signature
 * from real money, so it stays in application control flow rather than in a
 * tool the model can invoke.
 */
import { tool } from 'ai';
import { z } from 'zod';
import { Axiom } from 'axiom-relay';

const axiom = new Axiom({
  baseUrl: 'https://axiom-relay.reference-seller.workers.dev', // execution
  source: 'framework_example',
});

export const findPaidApi = tool({
  description:
    'Find an x402-paid API for a described capability, ranked on price and reliability. Executes no payment.',
  parameters: z.object({
    capability: z.string().describe('What you need, in words'),
  }),
  execute: async ({ capability }) => {
    const r = await axiom.route(capability, { network: 'eip155:8453' });
    return {
      provider: r.selected.host,
      sellerPrice: r.selected.downstream,
      axiomFee: r.selected.axiomFee,
      feePolicy: r.selected.feePolicy,
      reason: r.selectionReason,
    };
  },
});

export const analyzeCryptoRoute = tool({
  description:
    'Compare swap routes on Base and report total cost, price impact and whether execution is advisable. Returns no transaction.',
  parameters: z.object({
    sellToken: z.string(),
    buyToken: z.string(),
    sellAmount: z.string().describe('Atomic units'),
    taker: z.string().describe('Wallet that would sign'),
  }),
  execute: async (args) => {
    const a = await axiom.analyzeCryptoRoute({ fromChain: 8453, ...args });
    const c = a.costDisclosure;
    return {
      provider: a.selected.provider,
      providerFeeBps: c.providerFee?.bps ?? 0, // theirs, not Axiom's
      axiomFeeBps: c.axiomFee?.bps ?? 0,
      totalCostBps: c.totalEffectiveCostBps,
      recommend: a.recommendation,
    };
  },
});
