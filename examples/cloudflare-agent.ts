/**
 * Cloudflare Worker / Agents.
 *
 * The buyer key belongs in a Worker Secret, never in code. Axiom itself holds
 * no key -- only the buyer signs.
 */
import { Axiom } from 'axiom-relay';
import { x402Client } from '@x402/core/client';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';

interface Env {
  BUYER_PRIVATE_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const capability = new URL(request.url).searchParams.get('need');
    if (!capability) return new Response('pass ?need=<capability>', { status: 400 });

    const signer = new x402Client();
    registerExactEvmScheme(signer, {
      signer: privateKeyToAccount(env.BUYER_PRIVATE_KEY as `0x${string}`),
    });

    const axiom = new Axiom({
      baseUrl: 'https://axiom-relay.reference-seller.workers.dev',
      source: 'framework-example',
    });

    const { route, result } = await axiom.buy(signer, capability, { network: 'eip155:8453' });
    return Response.json({ provider: route.selected.host, reason: route.selectionReason, result });
  },
};
