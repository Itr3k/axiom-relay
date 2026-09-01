/**
 * LangChain tools for Axiom Relay.
 *
 * Shipped as a subpath of the SDK rather than a separate package, so there is
 * one name, one version and one identity to find. `axiom-relay/langchain`.
 *
 * Every tool here is read-only. None of them can move funds, and none of them
 * accepts a key: the crypto tools return an unsigned transaction for the
 * caller's wallet to sign, and the x402 tools stop at a quote. That is a
 * deliberate boundary rather than a missing feature -- an agent framework is
 * exactly the wrong place to hand over signing authority, because the thing
 * deciding what to sign is a language model.
 *
 * Purchase and execution stay in the runtime API, where the caller supplies a
 * signer explicitly and knowingly.
 */

import { Axiom, type AxiomOptions, type CryptoRouteRequest } from '../index.js';

/** Minimal shape of a LangChain `DynamicStructuredTool`, structurally typed. */
export interface LangChainToolLike {
  name: string;
  description: string;
  schema: unknown;
  func: (input: Record<string, unknown>) => Promise<string>;
}

/**
 * A JSON-Schema-shaped object.
 *
 * Declared here rather than importing zod so the adapter adds no dependency:
 * LangChain accepts JSON Schema for tool parameters, and a peer dependency on
 * a specific zod major has broken more integrations than it has helped.
 */
const schema = (properties: Record<string, unknown>, required: string[]) => ({
  type: 'object' as const,
  properties,
  required,
});

const str = (description: string) => ({ type: 'string', description });
const num = (description: string) => ({ type: 'number', description });

export interface AxiomLangChainOptions extends Omit<AxiomOptions, 'source'> {
  /**
   * Attribution. Defaults to 'langchain' so traffic from this adapter is
   * distinguishable in Axiom's telemetry from raw SDK use -- which is how
   * Axiom learns whether framework integrations actually produce callers.
   */
  source?: string;
}

/**
 * Build the Axiom tool set.
 *
 * Returns plain objects rather than LangChain classes so the adapter does not
 * depend on a LangChain version. Wrap with `new DynamicStructuredTool(t)` --
 * the shape matches its constructor.
 */
export function axiomTools(opts: AxiomLangChainOptions): LangChainToolLike[] {
  const axiom = new Axiom({ ...opts, source: opts.source ?? 'langchain' });

  const json = (v: unknown) => JSON.stringify(v, null, 2);
  const fail = (e: unknown) => json({ error: e instanceof Error ? e.message : String(e) });

  return [
    {
      name: 'axiom_find_paid_api',
      description:
        'Find a paid x402 API that provides a capability, ranked by total cost and reliability. ' +
        'Read-only: returns candidates and prices, and buys nothing.',
      schema: schema({ capability: str('What the API should do, e.g. "current weather for a city"') }, ['capability']),
      func: async (i) => {
        try {
          return json(await axiom.route(String(i['capability'])));
        } catch (e) {
          return fail(e);
        }
      },
    },
    {
      name: 'axiom_quote_paid_api',
      description:
        'Quote a specific x402-paid URL: what it costs, who is paid, and whether it is reachable. ' +
        'Read-only, pays nothing.',
      schema: schema({ url: str('The x402-paid resource URL'), method: str('HTTP method, default GET') }, ['url']),
      func: async (i) => {
        try {
          return json(await axiom.quote(String(i['url']), i['method'] ? String(i['method']) : 'GET'));
        } catch (e) {
          return fail(e);
        }
      },
    },
    {
      name: 'axiom_quote_crypto_swap',
      description:
        'Compare swap routes on Base and return an UNSIGNED transaction with full cost disclosure ' +
        '(provider fee, Axiom fee, gas, slippage, price impact). Axiom never takes custody and never ' +
        'signs. The caller or their wallet signs, or does not.',
      schema: schema(
        {
          sellToken: str('Contract address of the token to sell'),
          buyToken: str('Contract address of the token to buy'),
          sellAmount: str('Amount to sell, in the token\'s smallest unit, as a decimal string'),
          taker: str('The address that will sign and receive. Never a private key.'),
          slippageBps: num('Maximum slippage in basis points. Optional.'),
        },
        ['sellToken', 'buyToken', 'sellAmount', 'taker'],
      ),
      func: async (i) => {
        try {
          const req: CryptoRouteRequest = {
            fromChain: 8453,
            sellToken: String(i['sellToken']),
            buyToken: String(i['buyToken']),
            sellAmount: String(i['sellAmount']),
            taker: String(i['taker']),
            ...(i['slippageBps'] === undefined ? {} : { slippageBps: Number(i['slippageBps']) }),
          };
          return json(await axiom.quoteCryptoRoute(req));
        } catch (e) {
          return fail(e);
        }
      },
    },
    {
      name: 'axiom_analyze_crypto_swap',
      description:
        'Analyse a swap without receiving any signable transaction: costs, risks and provider ' +
        'comparison only. Safe to expose to a model that should never be able to act.',
      schema: schema(
        {
          sellToken: str('Contract address of the token to sell'),
          buyToken: str('Contract address of the token to buy'),
          sellAmount: str('Amount to sell, in the token\'s smallest unit'),
          taker: str('The address the analysis is for. Never a private key.'),
        },
        ['sellToken', 'buyToken', 'sellAmount', 'taker'],
      ),
      func: async (i) => {
        try {
          return json(
            await axiom.analyzeCryptoRoute({
              fromChain: 8453,
              sellToken: String(i['sellToken']),
              buyToken: String(i['buyToken']),
              sellAmount: String(i['sellAmount']),
              taker: String(i['taker']),
            }),
          );
        } catch (e) {
          return fail(e);
        }
      },
    },
  ];
}

export default axiomTools;
