import type { Node } from '@milkdown/kit/transformer'
import { $remark } from '@milkdown/kit/utils'
import remarkMath from 'remark-math'
import { visit } from 'unist-util-visit'

/// The remark-math plugin: parses `$…$` / `$$…$$` into mdast `inlineMath` /
/// `math` nodes and stringifies them back. Both directions come from remark-math.
export const remarkMathPlugin = $remark<'remarkMath', undefined>(
  'remarkMath',
  () => remarkMath
)

const visitMathBlock = (ast: Node) => {
  return visit(
    ast,
    'math',
    (
      node: Node & { value: string },
      index: number,
      parent: Node & { children: Node[] }
    ) => {
      const { value } = node as Node & { value: string }
      const newNode = {
        type: 'code',
        lang: 'LaTeX',
        value
      }
      parent.children.splice(index, 1, newNode as unknown as Node)
    }
  )
}

/// Rewrites block `math` mdast nodes into `code` nodes with lang `LaTeX` on
/// parse, so a `$$…$$` block enters the editor as a code block. blockKatex
/// serializes it back to `math` (→ `$$…$$`).
export const remarkMathBlockPlugin = $remark(
  'remarkMathBlock',
  () => () => visitMathBlock
)
