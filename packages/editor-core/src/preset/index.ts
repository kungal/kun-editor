// @kungal/editor-core/preset — the composed Milkdown bundle.
//
// `createKunEditorPlugins(adapters, features, options)` assembles the Milkdown
// baseline (commonmark + gfm + history + listener + clipboard + indent +
// trailing) with the KunEditor plugins from ../plugins, wiring each optional
// plugin only when its feature/adapter is present. This is the SINGLE call a
// render layer (@kungal/editor-vue) makes — it must never re-derive the plugin
// list itself, so the WYSIWYG and markdown-source views always agree on the
// schema. See docs/architecture.md § migration (P1).
//
// This entry pulls in @milkdown/kit and (for the katex / code-block features)
// the katex + codemirror peers, so it is intentionally SEPARATE from the light
// main entry (@kungal/editor-core), which the server can import for just the
// adapter types + MENTION_SCHEME without any peer installed.
import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { history } from '@milkdown/kit/plugin/history'
import { listener } from '@milkdown/kit/plugin/listener'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { indent } from '@milkdown/kit/plugin/indent'
import { trailing } from '@milkdown/kit/plugin/trailing'
import type { KatexOptions } from 'katex'

import type {
  KunEditorAdapters,
  KunEditorFeatures,
  KunEditorLocale
} from '../types'
import { createSpoilerPlugin } from '../plugins/spoiler'
import { createStopLinkPlugin } from '../plugins/stop-link'
import { createLinkPlugin } from '../plugins/link'
import { createHeadingPlugin } from '../plugins/heading'
import { createKatexPlugins } from '../plugins/katex'
import { createCodeBlockPlugins } from '../plugins/code-block'
import { createMentionPlugin } from '../plugins/mention'
import { createQuotePlugin } from '../plugins/quote'
import { createUploadPlugin, imageUploadPlaceholder } from '../plugins/upload'
import { createPlaceholderPlugin } from '../plugins/placeholder'

// Re-export the individual plugin factories + building blocks so advanced hosts
// can compose their own bundle instead of using the preset.
export * from '../plugins/spoiler'
export * from '../plugins/stop-link'
export * from '../plugins/link'
export * from '../plugins/heading'
export * from '../plugins/katex'
export * from '../plugins/code-block'
export * from '../plugins/mention'
export * from '../plugins/quote'
export * from '../plugins/upload'
export * from '../plugins/placeholder'

/** Extra, non-adapter options for the composed bundle. */
export interface KunEditorPluginOptions {
  /** UI language for plugin chrome (code-block toolbar labels). Default `'zh-cn'`. */
  locale?: KunEditorLocale
  /** KaTeX options forwarded to the code-block `latex` preview. */
  katexOptions?: KatexOptions
  /** Placeholder text shown when empty. Omit / empty string → no placeholder. */
  placeholder?: string
  /** `'block'` (default) shows on any empty block; `'doc'` only when empty. */
  placeholderMode?: 'doc' | 'block'
}

/**
 * Assemble the KunEditor Milkdown plugin list.
 *
 * P1 wired the pure plugins (spoiler, katex, code-block, stop-link); P2 adds the
 * adapter-driven ones — image upload (gated on the `uploadImage` adapter), the
 * mention schema, and the opt-in quote atom. Sticker has no core plugin: a
 * sticker is a plain image node, so its picker is a render-layer view (P3) that
 * consumes the `stickerSource` adapter and inserts an image.
 *
 * Feature flags default to on (except `quote`, host-specific → off); an absent
 * feature simply drops its plugins. The order matters — the baseline comes first
 * so katex's block schema can extend commonmark's code-block schema.
 */
export const createKunEditorPlugins = (
  adapters: KunEditorAdapters = {},
  features: KunEditorFeatures = {},
  options: KunEditorPluginOptions = {}
): MilkdownPlugin[] => {
  const {
    spoiler = true,
    katex = true,
    codeBlock = true,
    mention = true,
    quote = false
  } = features

  const plugins: (MilkdownPlugin | MilkdownPlugin[])[] = [
    commonmark,
    gfm,
    history,
    listener,
    clipboard,
    indent,
    trailing
  ]

  if (codeBlock) {
    plugins.push(
      createCodeBlockPlugins({
        locale: options.locale,
        katexOptions: options.katexOptions
      })
    )
  }
  if (katex) {
    plugins.push(createKatexPlugins())
  }
  if (spoiler) {
    plugins.push(createSpoilerPlugin())
  }
  // The mention SCHEMA (round-trip) is wired here; the `@` autocomplete dropdown
  // that uses `searchMentionUsers` is a render-layer view (P3). The link-URL form
  // is host policy — default `kungal-user:`, overridable per host.
  if (mention) {
    plugins.push(
      createMentionPlugin({
        toUrl: adapters.mentionToUrl,
        fromUrl: adapters.mentionFromUrl
      })
    )
  }
  // Quote is opt-in — the host inserts references via insertQuoteCommand.
  if (quote) {
    plugins.push(createQuotePlugin())
  }
  // Image upload is gated purely on the adapter: no `uploadImage` → no upload,
  // paste and drop paths (the image-free galgame 简介 editor).
  if (adapters.uploadImage) {
    plugins.push(
      createUploadPlugin(adapters.uploadImage, {
        locale: options.locale,
        notify: adapters.notify
      })
    )
    // The in-document placeholder for the TOOLBAR upload path (paste/drop already
    // gets one from Milkdown's upload plugin above). Both render the same
    // `.kun-editor__uploading` widget. Driven by startImageUpload().
    plugins.push(imageUploadPlaceholder)
  }
  // stop-link is pure chrome-free behaviour; always on.
  plugins.push(createStopLinkPlugin())
  // insert-link command (click-to-link over the commonmark link mark); always on.
  plugins.push(createLinkPlugin())
  // setHeadingCommand (absolute block-type) — powers the "text size" dropdown.
  plugins.push(createHeadingPlugin())
  // Placeholder (empty-state text) — only when the host supplies text.
  if (options.placeholder) {
    plugins.push(
      createPlaceholderPlugin({
        text: options.placeholder,
        mode: options.placeholderMode
      })
    )
  }

  return plugins.flat()
}
