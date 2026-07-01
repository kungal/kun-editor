import { codeBlockSchema } from '@milkdown/kit/preset/commonmark'
import { nodeRule } from '@milkdown/kit/prose'
import { textblockTypeInputRule } from '@milkdown/kit/prose/inputrules'
import { $inputRule } from '@milkdown/kit/utils'
import { TextSelection } from '@milkdown/kit/prose/state'

import { mathInlineSchema } from './inlineKatex'

/// Typing `$…$` becomes an inline math atom.
export const mathInlineInputRule = $inputRule((ctx) =>
  nodeRule(/(?:\$)([^$]+)(?:\$)$/, mathInlineSchema.type(ctx), {
    getAttr: (match) => ({ value: match[1] ?? '' }),
    beforeDispatch: ({ tr, start }) => {
      // After replaceRangeWith, insert a zero-width space after the inline math
      // atom so ProseMirror doesn't need a trailing <br>, avoiding a caret
      // newline.
      const posAfter = start + 1
      tr.insertText('​', posAfter, posAfter)
      // Move selection after the ZWSP so the caret sits right after the math.
      tr.setSelection(TextSelection.create(tr.doc, posAfter + 1))
    }
  })
)

/// Typing `$$` + Enter/Space opens a LaTeX code block (rendered as a math block).
export const mathBlockInputRule = $inputRule((ctx) =>
  textblockTypeInputRule(/^\$\$[\s\n]$/, codeBlockSchema.type(ctx), () => ({
    language: 'LaTeX'
  }))
)
