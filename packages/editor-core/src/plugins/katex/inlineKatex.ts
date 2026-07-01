import { $nodeSchema } from '@milkdown/kit/utils'
import katex from 'katex'

export const mathInlineId = 'math_inline'

/// Schema for the inline math node. Adds support for:
///
/// ```markdown
/// $a^2 + b^2 = c^2$
/// ```
///
/// The `value` attr holds the raw LaTeX; `toDOM` renders it with KaTeX. Pure
/// mechanism — `katex` is an (optional) peer the host installs.
export const mathInlineSchema = $nodeSchema(mathInlineId, () => ({
  group: 'inline',
  inline: true,
  draggable: true,
  atom: true,
  attrs: {
    value: {
      default: ''
    }
  },
  parseDOM: [
    {
      tag: `span[data-type="${mathInlineId}"]`,
      getAttrs: (dom) => {
        return {
          value: (dom as HTMLElement).dataset.value ?? ''
        }
      }
    }
  ],
  toDOM: (node) => {
    const code: string = node.attrs.value
    const dom = document.createElement('span')
    dom.dataset.type = mathInlineId
    dom.dataset.value = code
    katex.render(code, dom, {
      throwOnError: false
    })

    return dom
  },
  parseMarkdown: {
    match: (node) => node.type === 'inlineMath',
    runner: (state, node, type) => {
      state.addNode(type, { value: node.value as string })
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === mathInlineId,
    runner: (state, node) => {
      state.addNode('inlineMath', undefined, node.attrs.value)
    }
  }
}))
