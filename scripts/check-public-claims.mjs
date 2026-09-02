#!/usr/bin/env node
/**
 * Repository-controlled identity guard for the retired public integration repo.
 *
 * External registries can lag until their owners retire/deprecate an entry. This
 * check guarantees that the source repository itself cannot advertise a live
 * legacy transport or accidentally republish the historical npm/MCP identities.
 */

import { existsSync, readFileSync } from 'node:fs';

const read = (file) => readFileSync(file, 'utf8');
const json = (file) => JSON.parse(read(file));
const fails = [];

const identityFiles = [
  'README.md',
  'axiom-client/README.md',
  'axiom-client/package.json',
  'server.json',
  'mcp-manifest.json',
  'axiom-relay.json',
  'agent-card.json',
  'openapi.json',
  'ai-catalog.json',
  'api-catalog.json',
  'llms.txt',
  'SKILL.md',
];

const joined = identityFiles.map(read).join('\n');
const readme = read('README.md');
const pkg = json('axiom-client/package.json');
const server = json('server.json');
const mcp = json('mcp-manifest.json');
const graph = json('axiom-relay.json');
const agentCard = json('agent-card.json');
const openapi = json('openapi.json');

const require = (ok, message) => { if (!ok) fails.push(`MISSING   ${message}`); };
const forbid = (ok, message) => { if (ok) fails.push(`FORBIDDEN ${message}`); };

require(/retired/i.test(readme), 'README retirement notice');
require(readme.includes('https://axiomrelay.io'), 'canonical current homepage');
require(pkg.private === true, 'npm package is private against accidental publication');
require(pkg.homepage === 'https://axiomrelay.io', 'npm metadata points to canonical homepage');
require(/retired/i.test(pkg.description), 'npm metadata is explicitly retired');
require(server.name === 'io.github.Itr3k/axiom-x402-payment-crypto-router', 'exact legacy MCP identity');
require(/retired/i.test(`${server.title} ${server.description}`), 'MCP registry tombstone copy');
require(!('remotes' in server) && !('packages' in server), 'MCP registry descriptor exposes no transport');
require(mcp.status === 'retired' && mcp.transport === null && mcp.tools.length === 0, 'MCP manifest is inert');
require(graph.status === 'retired' && graph.executionSurfaces.length === 0, 'discovery graph is inert');
require(agentCard.skills.length === 0, 'Agent Card exposes no skills');
require(Object.keys(openapi.paths).length === 0, 'OpenAPI exposes no paths');
require(!existsSync('.github/workflows/publish-mcp.yml'), 'automatic MCP publisher is absent');
require(!existsSync('smithery.yaml'), 'legacy Smithery transport descriptor is absent');

forbid(/axiom-relay\.reference-seller\.workers\.dev/i.test(joined), 'legacy runtime URL in identity metadata');
forbid(/axiom\.elevatedai\.io/i.test(joined), 'superseded canonical URL in identity metadata');
forbid(/live on Base|currently live|real settlements/i.test(joined), 'live economic claim in identity metadata');
forbid(/"(?:remotes|packages)"\s*:/i.test(read('server.json')), 'publishable MCP transport in server.json');

for (const failure of fails) console.log(`  ${failure}`);
console.log(`\n  ${identityFiles.length} identity files checked — ${fails.length} failure(s)`);
process.exit(fails.length ? 1 : 0);
