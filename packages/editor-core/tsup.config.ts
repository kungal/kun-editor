import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // Milkdown / ProseMirror / CodeMirror / katex are peerDependencies — never
  // bundle them. ProseMirror in particular MUST be a single runtime instance;
  // inlining a copy here would give the host a second prosemirror-model and
  // silently break schema/node identity. See docs/architecture.md § singleton.
  external: [/^@milkdown\//, /^@codemirror\//, 'codemirror', 'katex', 'unist-util-visit'],
})
