/**
 * Axiom Relay client.
 *
 * The entire Axiom-specific integration. All signing is done by the caller's
 * own x402 SDK — this package performs no cryptography, never sees a private
 * key, and cannot move funds. It only knows the transport shape: ask for a
 * route, sign what comes back, post it.
 */

export interface PaymentRequirementsLike {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

export type FeePolicy = 'fee_collected' | 'fee_waived_micropayment';

export interface RouteCandidate {
  rank: number;
  providerId: string;
  host: string;
  resource: string;
  method: string;
  network: string;
  asset: string;
  payTo: string;
  scheme: string;
  maxTimeoutSeconds: number;
  extra: Record<string, unknown>;
  downstream: string;
  axiomFee: string;
  theoreticalFee: string;
  feePolicy: FeePolicy;
  total: string;
  score: number;
  reason: string;
  usableAsFallback: boolean;
}

export interface RouteResponse {
  quote: string;
  quoteId: string;
  expiresAt: string;
  capability: string;
  feePayTo: string;
  selected: RouteCandidate & { feeMode: string };
  selectionReason: string;
  candidates: RouteCandidate[];
  routingLatencyMs: number;
}

/** Anything exposing the standard x402 `createPaymentPayload`. */
export interface X402Signer {
  createPaymentPayload(paymentRequired: {
    x402Version: number;
    resource?: { url: string };
    accepts: PaymentRequirementsLike[];
  }): Promise<unknown>;
}

export interface AxiomOptions {
  /** Base URL of the relay. */
  baseUrl: string;
  /** Optional attribution label, so Axiom can measure which channel sent you. */
  source?: string;
  fetchImpl?: typeof fetch;
}

export class AxiomError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'AxiomError';
  }
}

/** True when Axiom's free-routing allocation is exhausted, not a provider fault. */
export function isQuotaExhausted(err: unknown): boolean {
  return err instanceof AxiomError && (err.body as { code?: string })?.code === 'free_route_quota_exhausted';
}

export class Axiom {
  private readonly base: string;
  private readonly source: string | undefined;
  private readonly doFetch: typeof fetch;

  constructor(opts: AxiomOptions) {
    this.base = opts.baseUrl.replace(/\/+$/, '');
    this.source = opts.source;
    this.doFetch = opts.fetchImpl ?? fetch;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const url = this.source ? `${this.base}${path}?source=${encodeURIComponent(this.source)}` : `${this.base}${path}`;
    const res = await this.doFetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text.slice(0, 500) };
    }
    if (!res.ok) {
      const message = (json as { error?: string })?.error ?? `request failed with ${res.status}`;
      throw new AxiomError(message, res.status, json);
    }
    return json as T;
  }

  /** Find providers for a capability and receive a signed multi-candidate quote. */
  route(capability: string, requirements: { network?: string; asset?: string; maxPriceAtomic?: string } = {}) {
    return this.post<RouteResponse>('/v1/route', { capability, requirements });
  }

  /** Price a specific x402 resource URL. Executes no payment. */
  quote(url: string, method = 'GET') {
    return this.post<Record<string, unknown>>('/v1/quote', { url, method });
  }

  /**
   * Sign one candidate and execute it.
   *
   * A fee leg is signed ONLY when Axiom is actually charging. Where the fee is
   * waived there is nothing to authorise, and sending one is rejected.
   */
  async purchase(signer: X402Signer, route: RouteResponse, opts: { candidates?: number } = {}) {
    const encode = (payload: unknown) =>
      typeof globalThis.btoa === 'function'
        ? globalThis.btoa(JSON.stringify(payload))
        : Buffer.from(JSON.stringify(payload)).toString('base64');

    const wanted = Math.max(1, Math.min(opts.candidates ?? route.candidates.length, route.candidates.length));
    const authorizations: { seller: string; fee?: string }[] = [];

    for (const c of route.candidates.slice(0, wanted)) {
      const base: PaymentRequirementsLike = {
        scheme: c.scheme ?? 'exact',
        network: c.network,
        asset: c.asset,
        amount: c.downstream,
        payTo: c.payTo,
        maxTimeoutSeconds: c.maxTimeoutSeconds ?? 60,
        extra: c.extra ?? {},
      };
      const seller = await signer.createPaymentPayload({
        x402Version: 2,
        resource: { url: c.resource },
        accepts: [base],
      });

      if (c.feePolicy === 'fee_waived_micropayment') {
        authorizations.push({ seller: encode(seller) });
        continue;
      }

      const fee = await signer.createPaymentPayload({
        x402Version: 2,
        resource: { url: `${this.base}/v1/request` },
        accepts: [{ ...base, amount: c.axiomFee, payTo: route.feePayTo }],
      });
      authorizations.push({ seller: encode(seller), fee: encode(fee) });
    }

    return this.post<Record<string, unknown>>('/v1/request', { quote: route.quote, authorizations });
  }


  /**
   * Quote a swap and receive signable transactions.
   *
   * Returns calldata and nothing else. This client has no signing capability
   * and no submission path -- deliberately, because the moment a library can
   * both build and send a transaction, a bug in it can spend your money.
   */
  async quoteCryptoRoute(req: CryptoRouteRequest): Promise<CryptoRoute> {
    return this.post<CryptoRoute>('/v1/crypto/quote', req as unknown as Record<string, unknown>);
  }

  /**
   * Analyse a swap without receiving the means to make it.
   *
   * Identical economics to `quoteCryptoRoute`, with `transactions` null and a
   * recommendation attached. Safe to expose to a model, since nothing it
   * returns can be signed.
   */
  async analyzeCryptoRoute(req: CryptoRouteRequest): Promise<CryptoRoute> {
    return this.post<CryptoRoute>('/v1/crypto/analyze', req as unknown as Record<string, unknown>);
  }

  /** Convenience: route, sign and purchase in one call. */
  async buy(signer: X402Signer, capability: string, requirements: Parameters<Axiom['route']>[1] = {}) {
    const r = await this.route(capability, requirements);
    const result = await this.purchase(signer, r);
    return { route: r, result };
  }
}


// --- Axiom Crypto (Beta) -----------------------------------------------------

/** A swap to route. Amounts are atomic-unit strings; a JSON number would lose precision. */
export interface CryptoRouteRequest {
  fromChain: number;
  /** Defaults to fromChain. Cross-chain is disabled in beta. */
  toChain?: number;
  sellToken: string;
  buyToken: string;
  /** Atomic units of the sell token, as a decimal string. */
  sellAmount: string;
  /** The wallet that will sign. Axiom never receives its key. */
  taker: string;
  slippageBps?: number;
  /** Refuse any route whose all-in cost exceeds this. */
  maxTotalFeeBps?: number;
  /** Refuse any route guaranteeing less than this, in buy-token atomic units. */
  minBuyAmount?: string;
  providers?: string[];
  preference?: 'reliability' | 'latency';
}

/** One cost component, attributed to whoever receives it. */
export interface CryptoCostLine {
  amount: string;
  token: string;
  bps: number;
}

/**
 * Costs, itemised.
 *
 * `providerFee` belongs to the execution provider and is NOT Axiom revenue.
 * `axiomFee` is the only line Axiom receives. Providers frequently report one
 * aggregate figure; adding these together and calling it Axiom's fee overstates
 * it substantially.
 */
export interface CryptoCostDisclosure {
  providerFee: CryptoCostLine | null;
  axiomFee: CryptoCostLine | null;
  protocolFee: CryptoCostLine | null;
  bridgeFee: CryptoCostLine | null;
  networkGas: CryptoCostLine | null;
  slippage: {
    toleranceBps: number;
    worstCaseShortfall: string;
    worstCaseBps: number;
    guaranteedOutput: string;
  };
  /** Null when the provider does not report it. Unknown, not zero. */
  priceImpactBps: number | null;
  expectedOutput: { amount: string; token: string };
  netAfterAllCosts: { amount: string; token: string; valueUsd: number | null };
  totalEffectiveCostBps: number;
  note: string;
}

/** A transaction for the caller to sign. Axiom cannot submit it. */
export interface CryptoTransaction {
  kind: 'approval' | 'swap' | 'bridge';
  chainId: number;
  to: string;
  data: string;
  value: string;
  gasLimit: string | null;
  description: string;
}

export interface CryptoRoute {
  axiomVertical: 'crypto';
  custody: 'non-custodial';
  execution: 'caller-signs';
  quoteId: string;
  expiresAt: string;
  request: Record<string, unknown>;
  providersQueried: { provider: string; status: string; detail: string; latencyMs: number }[];
  selected: {
    provider: string;
    tool: string;
    expectedOutput: string;
    minimumOutput: string;
    netAfterAllCosts: string;
    netValueUsd: number | null;
    totalCostBps: number;
    priceImpactBps: number | null;
    estimatedGas: string | null;
    transactionCount: number;
    reliability: number;
  };
  axiomFee: { bps: number; amount: string; token: string; collection: string; note: string };
  costDisclosure: CryptoCostDisclosure;
  risks: { code: string; severity: string; detail: string }[];
  simulation: { status: string; source: string; detail: string; providerDisagreement: boolean } | null;
  selectionReason: string;
  savingsVsRunnerUp: { atomic: string; bps: number; runnerUp: string | null };
  alternatives: { provider: string; eligible: boolean; reason: string | null; netAfterAllCosts: string; totalCostBps: number }[];
  /** Present on quote; always null on analyze. */
  transactions: CryptoTransaction[] | null;
  signing?: string;
  recommendation?: { execute: boolean; confidence: string; concerns: string[]; summary: string };
}

export default Axiom;
