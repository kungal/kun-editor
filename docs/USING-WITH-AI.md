# Using KunEditor with an AI tool

Working on KunEditor (or integrating it) with Claude Code / Cursor / etc.? Paste
the block below into the project's `AGENTS.md` / `CLAUDE.md` so the agent has the
non-obvious rules up front.

```md
## KunEditor rules

- KunEditor = a Milkdown editor split into @kungal/editor-{core,vue,nuxt},
  published under the @kungal npm scope (kungal org, AGPL-3.0-only). Mirrors
  kun-ui's core→vue→nuxt layering. See docs/architecture.md.
- THE principle: the editor ships MECHANISM (ProseMirror nodes/keymaps/
  serialization); the host injects POLICY via KunEditorAdapters (uploadImage,
  searchMentionUsers, stickerSource, notify). Never hardcode a host endpoint
  in a plugin — write a factory over an adapter.
- editor-core is framework-agnostic: it must NEVER import vue/react.
- Milkdown/ProseMirror (@milkdown/kit, @milkdown/prose, @milkdown/vue) are
  peerDependencies and `external` in the builds — ProseMirror MUST be a single
  runtime instance or node identity breaks. katex/codemirror are optional peers.
- The three packages version in LOCKSTEP (changesets `fixed` group). One
  changeset bumps all three.
- An "image-free" editor = omit the uploadImage adapter, not a boolean flag.
- KunEditor does NOT sanitize HTML — the host renders + sanitizes markdown
  server-side (same as the forum).
- Reference implementation being ported: kun-galgame-forum
  apps/web/app/components/kun/milkdown/. Keep parity with it; it stays the
  source of truth until each piece is proven here (see docs/architecture.md
  § migration).
```

For deeper context, point the tool at [`architecture.md`](./architecture.md)
(design + plugin inventory + migration plan) and
[`INTEGRATION.md`](./INTEGRATION.md) (the adapter contract).
