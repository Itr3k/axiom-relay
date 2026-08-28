#!/usr/bin/env node
/**
 * What this repository is allowed to claim.
 *
 * Every statement below was wrong here at least once. The README described
 * Axiom as "the routing layer for AI spending", told readers that limits rise
 * with "verified reliability" and pointed them at an endpoint that exposes no
 * such field, and the machine contracts drifted ahead of production while
 * nobody was comparing them.
 *
 * Run with `node scripts/check-public-claims.mjs`. No dependencies, so it works
 * in a fresh clone and in CI without an install step.
 */

import { readFileSync } from 'node:fs';

const readme = readFileSync('README.md', 'utf8');
const fails = [];

/** A claim the repository MUST make, because its absence misleads. */
const required = [
  [/neutral economic control and evidence layer/i, 'position: neutral economic control and evidence layer'],
  [/isn't also a payment rail/i, 'homepage line'],
  [/owns no payment rail/i, 'owns no rail'],
  [/\*\*Beta\*\*, currently live/i, 'Axiom Crypto is Beta and currently live'],
  [/LI\.FI as the enabled execution provider/i, 'LI.FI is the enabled execution provider'],
  [/WebMCP \(browser-side\)[\s\S]{0,40}\*\*Experimental\*\*/i, 'WebMCP is experimental'],
  [/returns \*\*unsigned\*\* transactions/i, 'returns unsigned transactions'],
  [/never holds customer funds/i, 'non-custodial'],
  [/KYBERSWAP_ROUTING_ENABLED` is `false`/i, 'Kyber execution is not live'],
  [/Machine Economic Receipt \(MER\)[\s\S]{0,30}draft/i, 'MER is not live'],
  [/no verification programme/i, 'no verification programme exists'],
  [/exposes no reliability[\s\S]{0,10}score/i, 'no reliability field is claimed'],
];

/**
 * Vocabulary that must not appear.
 *
 * The Kyber pattern deliberately excludes the environment-variable name: an
 * earlier version of this check flagged `KYBERSWAP_ROUTING_ENABLED` as "Kyber
 * described as enabled", which is the sentence that says it is switched off.
 */
const forbidden = [
  [/\bverified reliability\b/i, '"verified reliability"'],
  [/\bVerified\b(?!")/, '"Verified" used as a status'],
  [/industry[- ]standard|the standard for/i, 'standard-status claim'],
  [/trusted by \d|widely adopted|thousands of|used by \d+ (agents|companies)/i, 'traction claim'],
  [/the routing layer for AI spending/i, 'superseded positioning'],
  [/Kyber(?!SWAP_ROUTING)[^.\n]{0,40}\b(is enabled|executes trades|is an execution provider)\b/i, 'Kyber described as executing'],
];

for (const [re, label] of required) if (!re.test(readme)) fails.push(`MISSING   ${label}`);
for (const [re, label] of forbidden) {
  const m = readme.match(re);
  if (m) fails.push(`FORBIDDEN ${label} -> ${JSON.stringify(m[0].slice(0, 60))}`);
}

/** Machine contracts must parse and keep their advertised capability. */
const shape = [
  ['openapi.json', (d) => String(d.openapi ?? '').startsWith('3.') && Object.keys(d.paths ?? {}).length >= 9, 'OpenAPI 3.x with >= 9 paths'],
  ['agent-card.json', (d) => (d.skills ?? []).length >= 6 && (d.supportedInterfaces ?? d.url), 'agent card: >= 6 skills, transport declared'],
  ['mcp-manifest.json', (d) => (d.tools ?? []).every((t) => t.name && t.inputSchema), 'every MCP tool has an inputSchema'],
  ['ai-catalog.json', (d) => !!d, 'ai-catalog parses'],
  ['api-catalog.json', (d) => !!d, 'api-catalog parses'],
];
for (const [file, ok, label] of shape) {
  try {
    if (!ok(JSON.parse(readFileSync(file, 'utf8')))) fails.push(`SHAPE     ${file}: ${label}`);
  } catch (e) { fails.push(`PARSE     ${file}: ${e.message}`); }
}

for (const f of fails) console.log(`  ${f}`);
console.log(`\n  ${required.length} required, ${forbidden.length} forbidden, ${shape.length} shape checks — ${fails.length} failure(s)`);
process.exit(fails.length ? 1 : 0);
