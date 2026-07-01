// @kungal/editor-core — public entry.
//
// STATUS: scaffold. The adapter contracts (the stable public surface) are
// defined and exported now; the Milkdown plugin ports land incrementally per
// docs/architecture.md § migration. Consumers should code against the types
// below — those are the contract that will not churn as plugins move over.

export * from './types'

// Markdown scheme used to encode an @mention as a plain link the server can
// render + parse: `[@name](kungal-user:<id>)`. Lives here (not the plugin) so
// hosts and the server can share the exact string. See the forum's
// mentionPlugin.ts, which this core will absorb.
export const MENTION_SCHEME = 'kungal-user:'

export const KUN_EDITOR_CORE_VERSION = '0.0.0'

// ── The Milkdown plugins live in the `./preset` subpath ──────────────────────
// This main entry stays light on purpose: types + MENTION_SCHEME, ZERO runtime
// deps, so the server (which only needs the @mention scheme string) can import
// it without installing @milkdown/kit / katex / codemirror.
//
// The composed Milkdown bundle and the individual plugin factories are exported
// from `@kungal/editor-core/preset` (they pull in the peer deps):
//
//   import { createKunEditorPlugins } from '@kungal/editor-core/preset'
//
// P1 landed (docs/architecture.md § migration): spoiler, katex, code-block,
// stop-link — each a factory (createXxxPlugin), never a host-bound singleton.
// P2 adds the adapter-driven plugins (upload / mention / sticker).
