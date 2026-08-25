/** Raw TypeScript: describe a capability, buy the result. */
import { Axiom } from 'axiom-relay';
import { x402Client } from '@x402/core/client';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';

const signer = new x402Client();
registerExactEvmScheme(signer, { signer: privateKeyToAccount(process.env.BUYER_KEY as `0x${string}`) });

const axiom = new Axiom({
  baseUrl: 'https://axiom-relay.reference-seller.workers.dev',
  source: 'framework-example',
});

// Look before you buy: routing executes no payment.
const route = await axiom.route('crypto price', { network: 'eip155:8453' });
console.log(`chose ${route.selected.host}: ${route.selectionReason}`);
console.log(`seller ${route.selected.downstream}, fee ${route.selected.axiomFee}`);

// Signing happens locally. Axiom never sees the key.
const result = await axiom.purchase(signer, route);
console.log(result.downstream);
