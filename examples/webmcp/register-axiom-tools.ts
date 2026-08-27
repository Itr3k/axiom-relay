/**
 * Sanitized Axiom WebMCP reference.
 *
 * The full catalog is published at
 * https://axiom.elevatedai.io/webmcp/manifest.json. This example deliberately
 * contains no credentials, acquisition-source claim, signer, transaction
 * submission, provider-direct call, or operator capability.
 */

type JsonObject = Record<string, unknown>;

type Tool = {
  name: string;
  description: string;
  inputSchema: JsonObject;
  execute: (input: JsonObject) => Promise<JsonObject>;
};

type ModelContext = {
  registerTool: (tool: Tool, options?: { signal?: AbortSignal }) => void;
};

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}

const FINANCIAL_BOUNDARY = Object.freeze({
  moneyMoved: false,
  signed: false,
  submitted: false,
});

const closedObject = (properties: JsonObject, required: string[] = []): JsonObject => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});

const capabilityTool: Tool = {
  name: 'get_axiom_capabilities',
  description: 'Read Axiom availability, maturity, provider, and authority boundaries.',
  inputSchema: closedObject({}),
  async execute() {
    return {
      services: { availability: 'live', maturity: 'stable' },
      crypto: {
        availability: 'live',
        maturity: 'beta',
        enabledRoutingProvider: 'LI.FI',
      },
      webmcp: { availability: 'live', maturity: 'experimental' },
      ...FINANCIAL_BOUNDARY,
    };
  },
};

const analyzeCryptoTool: Tool = {
  name: 'analyze_crypto_route',
  description:
    'Analyze a live Axiom Crypto Beta route. LI.FI is the enabled routing provider; the caller remains the signer.',
  inputSchema: closedObject(
    {
      chainId: { type: 'integer', enum: [1, 10, 42161, 8453] },
      fromToken: { type: 'string', minLength: 1, maxLength: 128 },
      toToken: { type: 'string', minLength: 1, maxLength: 128 },
      amount: { type: 'string', pattern: '^[0-9]+$' },
      taker: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
      maxSlippageBps: { type: 'integer', minimum: 1, maximum: 500 },
    },
    ['chainId', 'fromToken', 'toToken', 'amount', 'taker'],
  ),
  async execute(input) {
    // This same-origin alias reaches the existing public Axiom contract. The
    // site Worker allowlists the destination and derives interface=webmcp;
    // browser input cannot select an upstream or claim an acquisition source.
    const response = await fetch('/webmcp-api/v1/crypto/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(input),
      credentials: 'omit',
    });
    if (!response.ok) throw new Error(`Axiom route analysis failed (${response.status}).`);
    return {
      availability: 'live',
      maturity: 'beta',
      route: await response.json(),
      authorizationRequired: 'external_signature',
      ...FINANCIAL_BOUNDARY,
    };
  },
};

/** Progressive enhancement: unsupported browsers retain the normal website. */
export function registerAxiomWebMcpTools(signal?: AbortSignal): boolean {
  const context = document.modelContext;
  if (!context) return false;
  for (const tool of [capabilityTool, analyzeCryptoTool]) {
    context.registerTool(tool, signal ? { signal } : undefined);
  }
  return true;
}

export const financialBoundary = FINANCIAL_BOUNDARY;
