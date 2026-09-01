/**
 * ElizaOS adapter shape.
 *
 * These pin the contract without a network call. The live runtime check --
 * booting an AgentRuntime, registering the plugin, dispatching through
 * runtime.actions -- is a separate manual verification, because pulling
 * @elizaos/core into this package's test dependencies would contradict the
 * reason the adapter declares its types structurally.
 */

import { describe, it, expect } from 'vitest';
import { axiomPlugin } from './index.js';

const plugin = () => axiomPlugin({ baseUrl: 'https://axiom.test' });

describe('the ElizaOS plugin', () => {
  it('matches the Plugin shape ElizaOS expects', () => {
    const p = plugin();
    expect(typeof p.name).toBe('string');
    expect(typeof p.description).toBe('string');
    expect(Array.isArray(p.actions)).toBe(true);
    expect(p.actions).toHaveLength(4);
  });

  it('gives every action the fields the runtime reads', () => {
    for (const a of plugin().actions) {
      expect(typeof a.name, a.name).toBe('string');
      expect(typeof a.description, a.name).toBe('string');
      expect(typeof a.validate, a.name).toBe('function');
      expect(typeof a.handler, a.name).toBe('function');
    }
  });

  it('names Axiom Relay, not bare Axiom', () => {
    // Six established products share the bare name. This once required the
    // vendor suffix to disambiguate; the canonical product name now does that
    // job directly, so the rule survives and the string it checks moved.
    expect(plugin().description).toContain('Axiom Relay');
    expect(plugin().description).not.toContain('Axiom by Elevated AI');
  });

  it('exposes no signing authority anywhere in its surface', () => {
    const blob = JSON.stringify(plugin().actions.map((a) => ({ n: a.name, d: a.description, s: a.similes })));
    for (const bad of ['privateKey', 'mnemonic', 'seed', 'secretKey', 'signTransaction']) {
      expect(blob.toLowerCase(), bad).not.toContain(bad.toLowerCase());
    }
  });

  it('says plainly that the caller signs', () => {
    const quote = plugin().actions.find((a) => a.name === 'AXIOM_QUOTE_SWAP')!;
    expect(quote.description).toMatch(/unsigned/i);
    expect(quote.description).toMatch(/never signs|signs, or declines/i);
  });

  it('fails cleanly on missing arguments rather than throwing', async () => {
    const quote = plugin().actions.find((a) => a.name === 'AXIOM_QUOTE_SWAP')!;
    const r = await quote.handler({}, {}, {}, {}, async () => []);
    expect(r.success).toBe(false);
    expect(r.text).toMatch(/needs sellToken/);
  });

  it('finds its arguments wherever the runtime puts them', async () => {
    // ElizaOS has moved which positional argument carries options between
    // versions. Scanning for the object with the required keys degrades to
    // "not found" on a signature change rather than reading the wrong one.
    const quote = plugin().actions.find((a) => a.name === 'AXIOM_QUOTE_SWAP')!;
    const args = { sellToken: '0xa', buyToken: '0xb', sellAmount: '1', taker: '0xc' };
    const asFourth = await quote.handler({}, {}, {}, args);
    const asSecond = await quote.handler({}, args);
    // Neither should be the "missing arguments" refusal.
    expect(asFourth.text).not.toMatch(/needs sellToken/);
    expect(asSecond.text).not.toMatch(/needs sellToken/);
  });

  it('defaults attribution to elizaos so the channel is measurable', () => {
    // Constructing with no source must still be attributable; a framework
    // whose traffic lands in `unknown` cannot be evaluated as a channel.
    expect(() => axiomPlugin({ baseUrl: 'https://axiom.test' })).not.toThrow();
  });
});
