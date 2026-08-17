import { editorViewCtx } from '@milkdown/kit/core'
import { listenerCtx } from '@milkdown/kit/plugin/listener'
import {
  emphasisSchema,
  inlineCodeSchema,
  strongSchema
} from '@milkdown/kit/preset/commonmark'
import { strikethroughSchema } from '@milkdown/kit/preset/gfm'
import { useInstance } from '@milkdown/vue'
import { reactive, watch } from 'vue'
import type { KunToggleMark } from '../types'

// The mark schema behind each toggle mark, so a toolbar can report whether the
// mark is active at the cursor.
const toggleMarkSchemas = {
  bold: strongSchema,
  italic: emphasisSchema,
  strike: strikethroughSchema,
  code: inlineCodeSchema
} as const

// Reactive active state for the toggle marks (bold / italic / strikethrough /
// inline code). A mark is active when it is in the stored marks (empty
// selection) or covers the whole selection range. Recomputes on selection and
// doc changes once the editor exists; callers that toggle via a command should
// also call `refresh` (a stored-mark toggle neither moves the selection nor
// changes the doc, so the listener alone would miss it).
export const useActiveMarks = () => {
  const [loading, getEditor] = useInstance()

  const activeMarks = reactive<Record<KunToggleMark, boolean>>({
    bold: false,
    italic: false,
    strike: false,
    code: false
  })

  const refresh = (): void => {
    getEditor()?.action((c) => {
      const state = c.get(editorViewCtx).state
      const { from, $from, to, empty } = state.selection
      ;(Object.keys(toggleMarkSchemas) as KunToggleMark[]).forEach((name) => {
        const type = toggleMarkSchemas[name].type(c)
        activeMarks[name] = empty
          ? !!type.isInSet(state.storedMarks ?? $from.marks())
          : state.doc.rangeHasMark(from, to, type)
      })
    })
  }

  watch(
    loading,
    (isLoading) => {
      if (isLoading) {
        return
      }
      getEditor()?.action((c) => {
        const listener = c.get(listenerCtx)
        listener.selectionUpdated(refresh)
        listener.updated(refresh)
      })
      refresh()
    },
    { immediate: true }
  )

  return { activeMarks, refresh }
}
