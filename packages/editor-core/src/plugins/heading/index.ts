// Absolute block-type command for a "text size" dropdown.
//
// commonmark ships `wrapInHeadingCommand` (a TOGGLE) but no "set paragraph"
// command, so a heading dropdown (Paragraph / H1–H6, where each option sets one
// exact level and Paragraph resets) can't be built from it. `setHeadingCommand`
// sets the block type ABSOLUTELY: level 0 → paragraph, 1–6 → heading — the same
// `setBlockType` approach the forum's header dropdown uses, exposed as a proper
// command so a headless or KunUI toolbar drives it via `run(setHeadingCommand.key,
// level)`. It's idempotent (re-selecting the current level is a no-op), unlike the
// toggle which would flip a heading back to a paragraph.
import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import { $command } from '@milkdown/kit/utils'
import { setBlockType } from '@milkdown/kit/prose/commands'
import { headingSchema, paragraphSchema } from '@milkdown/kit/preset/commonmark'

/** Set the current block to a paragraph (`level` 0, the default) or a heading
 * (`level` 1–6). */
export const setHeadingCommand = $command(
  'SetHeadingKun',
  (ctx) =>
    (level: number = 0) =>
      level >= 1 && level <= 6
        ? setBlockType(headingSchema.type(ctx), { level })
        : setBlockType(paragraphSchema.type(ctx))
)

/** The heading command bundle — no schema (commonmark owns paragraph/heading). */
export const createHeadingPlugin = (): MilkdownPlugin[] =>
  [setHeadingCommand].flat()
