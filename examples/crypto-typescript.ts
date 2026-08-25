/**
 * Crypto routing, raw TypeScript.
 *
 * The four stages are kept visibly separate because they carry different
 * authority: discovery and analysis read, quoting prepares, and only signing
 * moves money. Axiom performs the first three and cannot perform the fourth.
 */
import { Axiom } from 'axiom-relay';

const axiom = new Axiom({
  baseUrl: 'https://axiom-relay.reference-seller.workers.dev',
  source: 'framework-example',
});

const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WETH = '0x4200000000000000000000000000000000000006';

// 1. ANALYSIS -- costs a nothing, returns no calldata, cannot execute.
const analysis = await axiom.analyzeCryptoRoute({
  fromChain: 8453,
  sellToken: USDC,
  buyToken: WETH,
  sellAmount: '2000000', // 2 USDC, atomic units
  taker: process.env.WALLET_ADDRESS!,
});
console.log(analysis.recommendation.summary);
if (!analysis.recommendation.execute) {
  console.log('concerns:', analysis.recommendation.concerns);
}

// 2. QUOTE -- returns signable calldata. Still moves nothing.
const quote = await axiom.quoteCryptoRoute({
  fromChain: 8453,
  sellToken: USDC,
  buyToken: WETH,
  sellAmount: '2000000',
  taker: process.env.WALLET_ADDRESS!,
  slippageBps: 100,
});

// 3. INSPECT -- read what it costs before committing. The provider's fee and
//    Axiom's are separate figures; do not add them and call it Axiom's.
const d = quote.costDisclosure;
console.log(`route      ${quote.selected.provider} via ${quote.selected.tool}`);
console.log(`provider   ${d.providerFee?.bps ?? 0} bps  (not Axiom revenue)`);
console.log(`axiom      ${d.axiomFee?.bps ?? 0} bps`);
console.log(`all-in     ${d.totalEffectiveCostBps} bps`);
console.log(`guaranteed ${d.slippage.guaranteedOutput} ${d.expectedOutput.token}`);
console.log(`why        ${quote.selectionReason}`);

// 4. SIGN -- yours alone. Axiom holds no key and has no execution endpoint.
for (const tx of quote.transactions ?? []) {
  console.log(`sign ${tx.kind}: to=${tx.to} value=${tx.value}`);
  // await wallet.sendTransaction({ to: tx.to, data: tx.data, value: BigInt(tx.value) });
}
