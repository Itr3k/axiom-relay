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

  /** Convenience: route, sign and purchase in one call. */
  async buy(signer: X402Signer, capability: string, requirements: Parameters<Axiom['route']>[1] = {}) {
    const r = await this.route(capability, requirements);
    const result = await this.purchase(signer, r);
    return { route: r, result };
  }
}

export default Axiom;
