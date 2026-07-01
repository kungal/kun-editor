// KaTeX plugin set — inline `$…$` and block `$$…$$` LaTeX.
//
// Ported from the forum's plugins/katex/*. Pure mechanism; `katex` is an
// (optional) peer and `remark-math` a runtime dependency. The plugins must be
// used AFTER the commonmark preset (blockKatex extends its code-block schema),
// which createKunEditorPlugins guarantees.
import type { MilkdownPlugin } from '@milkdown/kit/ctx'

import { blockKatexSchema } from './blockKatex'
import { toggleLatexCommand } from './command'
import { mathInlineSchema } from './inlineKatex'
import { mathBlockInputRule, mathInlineInputRule } from './inputRule'
import { remarkMathBlockPlugin, remarkMathPlugin } from './remark'

export { blockKatexSchema } from './blockKatex'
export { toggleLatexCommand } from './command'
export { mathInlineId, mathInlineSchema } from './inlineKatex'
export { mathBlockInputRule, mathInlineInputRule } from './inputRule'
export { remarkMathBlockPlugin, remarkMathPlugin } from './remark'

/**
 * The KaTeX plugin bundle, in dependency order: remark parse/serialize, the
 * inline math node, the `$…$` / `$$` input rules, the block-LaTeX serializer
 * and the toggle command. Pure — no adapter needed.
 */
export const createKatexPlugins = (): MilkdownPlugin[] =>
  [
    remarkMathPlugin,
    remarkMathBlockPlugin,
    mathInlineSchema,
    mathInlineInputRule,
    mathBlockInputRule,
    blockKatexSchema,
    toggleLatexCommand
  ].flat() as MilkdownPlugin[]
