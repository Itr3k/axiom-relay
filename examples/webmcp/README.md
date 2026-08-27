# Axiom WebMCP reference

This folder is the sanitized, self-contained reference for Axiom's browser-agent integration. The live implementation is available at:

- <https://axiom.elevatedai.io/integrations/webmcp>
- <https://axiom.elevatedai.io/webmcp/manifest.json>

WebMCP is **Available — live experimental browser integration**. Axiom Crypto is **live Beta** and uses LI.FI as the enabled routing provider.

`register-axiom-tools.ts` shows the important implementation boundaries without publishing website credentials, operator routes, or private runtime code:

- progressive feature detection for `document.modelContext`;
- the current imperative `registerTool(tool, options)` API;
- bounded input schemas with `additionalProperties: false`;
- explicit no-sign/no-submit/no-payment results;
- same-origin access to an allowlisted public Axiom contract;
- no caller-supplied `source=webmcp` attribution.

The canonical site Worker derives a signed `interface=webmcp` observation when a WebMCP handler crosses the WebMCP-only gateway. The runtime aggregates that interface separately from acquisition source and the Internal/Test, First-party Production, and External reporting buckets.

This sample registers two representative tools. The live manifest is the authoritative inventory for all 19 contextual tools. The example is not a wallet, signer, payment executor, generic proxy, or operator client.

Receipt Explorer is an educational sample. It does not establish that a public Machine Economic Receipt v0.1 schema, verifier, or SDK has shipped.
