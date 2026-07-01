import { defineConfig } from 'tsup'

export default defineConfig({
  // Two entries: the light main entry (types + MENTION_SCHEME, zero runtime
  // deps) and the heavy `./preset` bundle (the Milkdown plugins). Keeping them
  // separate lets the server import the main entry without any peer installed.
  entry: ['src/index.ts', 'src/preset/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // Milkdown / ProseMirror / CodeMirror / katex / remark are peerDependencies or
  // deps — never bundle them. ProseMirror in particular MUST be a single runtime
  // instance; inlining a copy here would give the host a second prosemirror-model
  // and silently break schema/node identity. See docs/architecture.md § singleton.
  external: [
    /^@milkdown\//,
    /^@codemirror\//,
    /^@lezer\//,
    'codemirror',
    'katex',
    /^remark/,
    /^unist/,
    /^mdast/,
    /^micromark/
  ]
})
