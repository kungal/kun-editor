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
import { createKatexPlugins } from '../plugins/katex'
import { createCodeBlockPlugins } from '../plugins/code-block'

// Re-export the individual plugin factories + building blocks so advanced hosts
// can compose their own bundle instead of using the preset.
export * from '../plugins/spoiler'
export * from '../plugins/stop-link'
export * from '../plugins/katex'
export * from '../plugins/code-block'

/** Extra, non-adapter options for the composed bundle. */
export interface KunEditorPluginOptions {
  /** UI language for plugin chrome (code-block toolbar labels). Default `'zh-cn'`. */
  locale?: KunEditorLocale
  /** KaTeX options forwarded to the code-block `latex` preview. */
  katexOptions?: KatexOptions
}

/**
 * Assemble the KunEditor Milkdown plugin list.
 *
 * P1 wires the pure plugins (spoiler, katex, code-block, stop-link). The
 * `adapters` bundle is accepted now for a stable signature; the adapter-driven
 * plugins (upload / mention / sticker) land in P2 and will read it here.
 *
 * Feature flags default to on; an absent feature simply drops its plugins. The
 * order matters — the baseline comes first so katex's block schema can extend
 * commonmark's code-block schema.
 */
export const createKunEditorPlugins = (
  adapters: KunEditorAdapters = {},
  features: KunEditorFeatures = {},
  options: KunEditorPluginOptions = {}
): MilkdownPlugin[] => {
  // P2: upload / mention / sticker factories will read `adapters` here.
  void adapters

  const { spoiler = true, katex = true, codeBlock = true } = features

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
  // stop-link is pure chrome-free behaviour; always on.
  plugins.push(createStopLinkPlugin())

  return plugins.flat()
}
