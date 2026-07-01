// Code block (CodeMirror) — Milkdown's code-block component wired with the KUN
// CodeMirror theme, language list, toolbar icons, localized labels and a KaTeX
// preview for `latex` blocks.
//
// Ported from the forum's Editor.vue codeBlockConfig wiring + plugins/code/*.
// Pure mechanism: the CodeMirror packages and `katex` are (optional) peers the
// host installs when the code-block feature is on. Labels are localized via the
// `locale` option (mechanism owns the strings, the host picks the language).
import type { Ctx, MilkdownPlugin } from '@milkdown/kit/ctx'
import {
  codeBlockComponent,
  codeBlockConfig
} from '@milkdown/kit/component/code-block'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { EditorView, keymap } from '@codemirror/view'
import { languages } from '@codemirror/language-data'
import type { Extension } from '@codemirror/state'
import { basicSetup } from 'codemirror'
import katex from 'katex'
import type { KatexOptions } from 'katex'

import type { KunEditorLocale } from '../../types'
import { kunCM } from './theme'
import {
  chevronDownIcon,
  clearIcon,
  copyIcon,
  editIcon,
  searchIcon,
  visibilityOffIcon
} from './icons'

export { kunCM, kunCMTheme, kunCMHighlightStyle } from './theme'
export * from './icons'

/** Options for the code-block plugin. All optional. */
export interface CodeBlockOptions {
  /** UI language for the toolbar labels. Default: `'zh-cn'`. */
  locale?: KunEditorLocale
  /** KaTeX options for the `latex` block preview. */
  katexOptions?: KatexOptions
  /** Extra CodeMirror extensions appended after the KUN defaults. */
  extensions?: Extension[]
  /** Called when the user copies a code block. */
  onCopy?: (text: string) => void
}

interface CodeBlockLabels {
  searchPlaceholder: string
  copyText: string
  noResultText: string
  previewLoading: string
  edit: string
  hide: string
}

// The forum's playful zh-cn strings ("搜索咒文"/"复制咒文" — galgame flavor) are the
// default; en-us is the neutral fallback for other hosts.
const LABELS: Record<'zh-cn' | 'en-us', CodeBlockLabels> = {
  'zh-cn': {
    searchPlaceholder: '搜索咒文',
    copyText: '复制咒文',
    noResultText: '无结果',
    previewLoading: '加载中...',
    edit: '编辑',
    hide: '隐藏'
  },
  'en-us': {
    searchPlaceholder: 'Search language',
    copyText: 'Copy',
    noResultText: 'No results',
    previewLoading: 'Loading...',
    edit: 'Edit',
    hide: 'Hide'
  }
}

const labelsFor = (locale: KunEditorLocale | undefined): CodeBlockLabels =>
  locale && locale.toLowerCase().startsWith('en')
    ? LABELS['en-us']
    : LABELS['zh-cn']

/**
 * Applies the KUN code-block config to a Milkdown ctx: CodeMirror extensions,
 * the language list, toolbar icons, localized labels, and a KaTeX preview for
 * `latex` blocks. Call inside a plugin runner or `.config()` — after
 * `codeBlockComponent` has registered its config slice.
 */
export const applyCodeBlockConfig = (
  ctx: Ctx,
  options: CodeBlockOptions = {}
): void => {
  const labels = labelsFor(options.locale)
  const onCopy = options.onCopy ?? (() => {})

  ctx.update(codeBlockConfig.key, (prev) => ({
    ...prev,
    extensions: [
      kunCM(),
      EditorView.lineWrapping,
      keymap.of(defaultKeymap.concat(indentWithTab)),
      basicSetup,
      ...(options.extensions ?? [])
    ],
    languages,
    expandIcon: chevronDownIcon,
    searchIcon,
    clearSearchIcon: clearIcon,
    searchPlaceholder: labels.searchPlaceholder,
    copyText: labels.copyText,
    copyIcon,
    onCopy,
    noResultText: labels.noResultText,
    previewLoading: labels.previewLoading,
    // Render `latex` code blocks as rendered math; defer everything else to the
    // component default.
    renderPreview: (language, content, applyPreview) => {
      if (language.toLowerCase() === 'latex' && content.length > 0) {
        return katex.renderToString(content, {
          ...options.katexOptions,
          throwOnError: false,
          displayMode: true
        })
      }
      return prev.renderPreview(language, content, applyPreview)
    },
    previewToggleButton: (previewOnlyMode) => {
      const icon = previewOnlyMode ? editIcon : visibilityOffIcon
      const text = previewOnlyMode ? labels.edit : labels.hide
      return [icon, text].map((v) => v.trim()).join(' ')
    }
  }))
}

/** A Milkdown plugin that applies the code-block config on setup. Bundled into
 * `createCodeBlockPlugins` so the render layer needs no separate config call. */
const codeBlockConfigPlugin =
  (options: CodeBlockOptions): MilkdownPlugin =>
  (ctx) =>
  () => {
    applyCodeBlockConfig(ctx, options)
  }

/**
 * The code-block plugin bundle: Milkdown's `codeBlockComponent` plus the KUN
 * config (CodeMirror theme/languages/icons/labels + KaTeX preview). Pure — the
 * CodeMirror + katex peers must be installed when this feature is enabled.
 */
export const createCodeBlockPlugins = (
  options: CodeBlockOptions = {}
): MilkdownPlugin[] => [...codeBlockComponent, codeBlockConfigPlugin(options)]
