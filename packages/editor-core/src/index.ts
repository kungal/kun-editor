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

// ── Planned exports (tracked in docs/architecture.md § migration) ────────────
// The following are ported from the forum's components/kun/milkdown, generalized
// to take KunEditorAdapters instead of hardcoding forum endpoints:
//
//   createKunEditorPlugins(adapters, features)  — the composed Milkdown bundle
//   kunSpoilerPlugin                            — ||spoiler|| node + $remark round-trip
//   createMentionPlugin(searchMentionUsers)     — @mention atom + kungal-user: scheme
//   createUploadPlugin(uploadImage)             — paste/drop/toolbar image upload
//   katex plugins (inline + block + input rules)
//   code-block (CodeMirror) config factory
//   stop-link keymap
//
// Each is deliberately a factory over an adapter, never a module-level singleton
// bound to one host — that is what the forum version got wrong for reuse.
