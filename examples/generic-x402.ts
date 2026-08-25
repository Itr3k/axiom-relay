/**
 * Any x402 client, no Axiom SDK.
 *
 * Axiom is an ordinary HTTP API plus standard x402 payments. The only
 * Axiom-specific detail is the shape of the execute body.
 */
import { x402Client } from '@x402/core/client';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { encodePaymentSignatureHeader } from '@x402/core/http';
import { privateKeyToAccount } from 'viem/accounts';

const BASE = 'https://axiom-relay.reference-seller.workers.dev';

const client = new x402Client();
registerExactEvmScheme(client, { signer: privateKeyToAccount(process.env.BUYER_KEY as `0x${string}`) });

const route = await (
  await fetch(`${BASE}/v1/route`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ capability: 'crypto price', requirements: { network: 'eip155:8453' } }),
  })
).json();

const c = route.candidates[0];
const base = {
  scheme: c.scheme,
  network: c.network,
  asset: c.asset,
  amount: c.downstream,
  payTo: c.payTo,
  maxTimeoutSeconds: c.maxTimeoutSeconds,
  extra: c.extra,
};

const seller = await client.createPaymentPayload({
  x402Version: 2,
  resource: { url: c.resource },
  accepts: [base],
});

// Sign a fee leg ONLY when Axiom is actually charging.
const authorizations =
  c.feePolicy === 'fee_waived_micropayment'
    ? [{ seller: encodePaymentSignatureHeader(seller) }]
    : [
        {
          seller: encodePaymentSignatureHeader(seller),
          fee: encodePaymentSignatureHeader(
            await client.createPaymentPayload({
              x402Version: 2,
              resource: { url: `${BASE}/v1/request` },
              accepts: [{ ...base, amount: c.axiomFee, payTo: route.feePayTo }],
            }),
          ),
        },
      ];

const result = await (
  await fetch(`${BASE}/v1/request`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ quote: route.quote, authorizations }),
  })
).json();

console.log(result.downstream);
