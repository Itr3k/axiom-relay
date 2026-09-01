/**
 * ElizaOS plugin for Axiom Relay.
 *
 * A second subpath of the SDK — `axiom-relay/elizaos` — for the same reason
 * the LangChain adapter is one: a single name, version and identity beats
 * three packages nobody can tell apart.
 *
 * ElizaOS was chosen over the alternatives on evidence rather than vibes:
 * 19,000+ stars against Coinbase AgentKit's ~1,300, commits landing daily,
 * MIT, TypeScript, and — the deciding factor — its agents routinely hold
 * wallets and act on funds. A route-comparison and safety layer is worth
 * something to an agent that can actually spend; it is worth nothing to one
 * that cannot.
 *
 * Which makes the boundary matter more here, not less. Every action below is
 * read-only. The crypto actions return an unsigned transaction and the x402
 * actions stop at a quote. Nothing accepts a key, and nothing in this file can
 * move funds — because in this ecosystem, unlike most, the agent plausibly
 * could.
 */

import { Axiom, type AxiomOptions, AxiomError } from '../index.js';

/**
 * Structural stand-ins for ElizaOS's types.
 *
 * Declared rather than imported so the adapter carries no dependency on
 * @elizaos/core and cannot force a version on the host agent. The shapes match
 * `Action`, `ActionResult` and `Plugin` in @elizaos/core 1.7.2; ElizaOS
 * accepts any object satisfying them.
 */
export interface ElizaActionResult {
  text?: string;
  values?: Record<string, unknown>;
  data?: Record<string, unknown>;
  success: boolean;
  error?: string | Error;
}

export interface ElizaAction {
  name: string;
  description: string;
  similes?: string[];
  examples?: unknown[][];
  validate: (...args: unknown[]) => Promise<boolean>;
  handler: (...args: unknown[]) => Promise<ElizaActionResult>;
}

export interface ElizaPluginLike {
  name: string;
  description: string;
  actions: ElizaAction[];
}

export interface AxiomElizaOptions extends Omit<AxiomOptions, 'source'> {
  /** Attribution. Defaults to 'elizaos' so this channel is measurable. */
  source?: string;
}

/**
 * Read the arguments an ElizaOS handler was invoked with.
 *
 * ElizaOS passes `(runtime, message, state, options, callback)`, and which
 * position carries structured options has moved between versions. Rather than
 * pin one, this scans the arguments for the first object holding the fields
 * the action needs — so a signature change upstream degrades to "no arguments
 * found" rather than to silently reading the wrong object.
 */
function readOptions(args: unknown[], required: string[]): Record<string, unknown> | null {
  for (const a of args) {
    if (a && typeof a === 'object' && required.every((k) => k in (a as Record<string, unknown>))) {
      return a as Record<string, unknown>;
    }
  }
  return null;
}

const fail = (text: string): ElizaActionResult => ({ success: false, text, error: text });

function described(err: unknown): string {
  if (err instanceof AxiomError) return `Axiom refused the request (${err.status}): ${err.message}`;
  return err instanceof Error ? err.message : String(err);
}

/**
 * Build the Axiom plugin.
 *
 * Returns a plain object matching ElizaOS's `Plugin` shape. Register it in a
 * character's `plugins` array, or pass it to the runtime directly.
 */
export function axiomPlugin(opts: AxiomElizaOptions): ElizaPluginLike {
  const axiom = new Axiom({ ...opts, source: opts.source ?? 'elizaos' });
  const BASE = 8453; // Base mainnet — the only chain Axiom routes today.

  const always = async () => true;

  const actions: ElizaAction[] = [
    {
      name: 'AXIOM_QUOTE_SWAP',
      similes: ['COMPARE_SWAP_ROUTES', 'GET_SWAP_QUOTE', 'PRICE_A_SWAP'],
      description:
        'Compare swap routes on Base and return an UNSIGNED transaction with full cost disclosure: ' +
        'provider fee, Axiom fee, gas, slippage and price impact. Axiom never takes custody and never ' +
        'signs — the agent or its wallet signs, or declines.',
      validate: always,
      handler: async (...args: unknown[]) => {
        const o = readOptions(args, ['sellToken', 'buyToken', 'sellAmount', 'taker']);
        if (!o) return fail('AXIOM_QUOTE_SWAP needs sellToken, buyToken, sellAmount and taker.');
        try {
          const route = await axiom.quoteCryptoRoute({
            fromChain: BASE,
            sellToken: String(o['sellToken']),
            buyToken: String(o['buyToken']),
            sellAmount: String(o['sellAmount']),
            taker: String(o['taker']),
            ...(o['slippageBps'] === undefined ? {} : { slippageBps: Number(o['slippageBps']) }),
          });
          const sel = (route as unknown as { selected?: { provider?: string; expectedOutput?: string } }).selected;
          return {
            success: true,
            text:
              `Best route via ${sel?.provider ?? 'unknown'}: expected output ${sel?.expectedOutput ?? 'n/a'}. ` +
              'The transaction is unsigned — review the cost disclosure before signing.',
            data: { route: route as unknown as Record<string, unknown> },
          };
        } catch (err) {
          return fail(described(err));
        }
      },
    },
    {
      name: 'AXIOM_ANALYZE_SWAP',
      similes: ['ANALYZE_SWAP', 'CHECK_SWAP_COST', 'SWAP_SAFETY_CHECK'],
      description:
        'Analyse a swap without receiving anything signable: costs, risks and provider comparison only. ' +
        'Safe to expose to an agent that should be able to reason about a trade but never execute one.',
      validate: always,
      handler: async (...args: unknown[]) => {
        const o = readOptions(args, ['sellToken', 'buyToken', 'sellAmount', 'taker']);
        if (!o) return fail('AXIOM_ANALYZE_SWAP needs sellToken, buyToken, sellAmount and taker.');
        try {
          const analysis = await axiom.analyzeCryptoRoute({
            fromChain: BASE,
            sellToken: String(o['sellToken']),
            buyToken: String(o['buyToken']),
            sellAmount: String(o['sellAmount']),
            taker: String(o['taker']),
          });
          return {
            success: true,
            text: 'Swap analysed. No signable transaction was produced.',
            data: { analysis: analysis as unknown as Record<string, unknown> },
          };
        } catch (err) {
          return fail(described(err));
        }
      },
    },
    {
      name: 'AXIOM_FIND_PAID_API',
      similes: ['FIND_PAID_API', 'DISCOVER_X402_SERVICE', 'FIND_DATA_SOURCE'],
      description:
        'Find a paid x402 API providing a capability, ranked by total cost and reliability. ' +
        'Read-only: returns candidates and prices, and buys nothing.',
      validate: always,
      handler: async (...args: unknown[]) => {
        const o = readOptions(args, ['capability']);
        if (!o) return fail('AXIOM_FIND_PAID_API needs a capability to search for.');
        try {
          const found = await axiom.route(String(o['capability']));
          return { success: true, text: 'Candidates ranked by total cost and reliability.', data: { found: found as unknown as Record<string, unknown> } };
        } catch (err) {
          return fail(described(err));
        }
      },
    },
    {
      name: 'AXIOM_QUOTE_PAID_API',
      similes: ['QUOTE_PAID_API', 'PRICE_X402_RESOURCE'],
      description:
        'Quote a specific x402-paid URL: what it costs, who is paid, and whether it is reachable. ' +
        'Pays nothing.',
      validate: always,
      handler: async (...args: unknown[]) => {
        const o = readOptions(args, ['url']);
        if (!o) return fail('AXIOM_QUOTE_PAID_API needs a url.');
        try {
          const quote = await axiom.quote(String(o['url']), o['method'] ? String(o['method']) : 'GET');
          return { success: true, text: 'Quoted. Nothing has been paid.', data: { quote: quote as unknown as Record<string, unknown> } };
        } catch (err) {
          return fail(described(err));
        }
      },
    },
  ];

  return {
    name: 'axiom',
    description:
      'Axiom Relay — non-custodial routing for AI spending. Compares paid-API and crypto swap ' +
      'routes on total cost, validates transaction safety, and returns unsigned transactions the agent ' +
      'signs itself. Axiom holds no funds and no keys.',
    actions,
  };
}

export default axiomPlugin;
