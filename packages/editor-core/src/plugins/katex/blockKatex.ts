import { codeBlockSchema } from '@milkdown/kit/preset/commonmark'

/// Extends commonmark's code-block schema so a fenced block whose language is
/// `latex` serializes back to a `$$…$$` math block instead of a ``` fence. The
/// parse direction is handled by remarkMathBlock (math mdast → code node).
export const blockKatexSchema = codeBlockSchema.extendSchema((prev) => {
  return (ctx) => {
    const baseSchema = prev(ctx)
    return {
      ...baseSchema,
      toMarkdown: {
        match: baseSchema.toMarkdown.match,
        runner: (state, node) => {
          const language = node.attrs.language ?? ''
          if (language.toLowerCase() === 'latex') {
            state.addNode(
              'math',
              undefined,
              node.content.firstChild?.text || ''
            )
          } else {
            return baseSchema.toMarkdown.runner(state, node)
          }
        }
      }
    }
  }
})
