// Shared pieces of the entity UI — the paste popover / display bubble, the `/`
// menu and the toolbar picker: their labels, how a floating panel is placed,
// and the debounced, abortable search all three run against the host's
// `searchEntities` adapter.
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size
} from '@floating-ui/dom'
import type { Placement, ReferenceElement } from '@floating-ui/dom'
import type {
  EntityHit,
  EntityTypeItem,
  KunEditorAdapters,
  KunEditorLocale
} from '@kungal/editor-core'
import { editorViewCtx } from '@milkdown/kit/core'
import type { EditorView } from '@milkdown/kit/prose/view'
import { useInstance } from '@milkdown/vue'
import { onBeforeUnmount, ref, shallowRef } from 'vue'

export const entityLabels = (locale: KunEditorLocale | undefined) => {
  const en = (locale ?? 'zh-cn').toLowerCase().startsWith('en')
  return en
    ? {
        card: 'Card',
        chip: 'Inline',
        link: 'Link',
        remove: 'Remove',
        display: 'Show reference as',
        insert: 'Insert reference',
        search: (label: string) => `Search ${label}…`,
        searching: 'Searching…',
        empty: 'No results',
        failed: 'Search failed',
        prompt: 'Type to search',
        types: 'Reference type',
        noTypes: 'No matching reference types',
        drag: 'Drag to move (Alt+↑ / Alt+↓)',
        chipLocked: 'A link alone on its line always shows as a card'
      }
    : {
        card: '卡片',
        chip: '行内',
        link: '链接',
        remove: '删除',
        display: '引用显示为',
        insert: '插入引用',
        search: (label: string) => `搜索${label}…`,
        searching: '搜索中…',
        empty: '无结果',
        failed: '搜索失败',
        prompt: '输入关键词搜索',
        types: '引用类型',
        noTypes: '没有匹配的卡片类型',
        drag: '拖动以移动(Alt+↑ / Alt+↓)',
        chipLocked: '单独一行的链接总是显示为卡片'
      }
}

/**
 * Keep `floating` next to `reference` — below it by default, flipped above
 * when there is no room, and shifted to stay 8px inside the viewport (a phone
 * screen is narrow). Follows scrolling and resizing until the returned cleanup
 * runs. `floating` must be `position: absolute` (the reference stylesheet
 * gives every entity panel that).
 *
 * The room left on the chosen side is published as `--kun-float-max-height`,
 * so a list inside can take its natural height and scroll only when the
 * viewport is too short for it.
 */
export const floatNear = (
  reference: ReferenceElement,
  floating: HTMLElement,
  placement: Placement = 'bottom-start'
): (() => void) => {
  const place = () => {
    void computePosition(reference, floating, {
      placement,
      middleware: [
        offset(6),
        flip({ padding: 8 }),
        shift({ padding: 8 }),
        size({
          padding: 8,
          apply: ({ availableHeight, elements }) => {
            elements.floating.style.setProperty(
              '--kun-float-max-height',
              `${Math.max(120, Math.floor(availableHeight))}px`
            )
          }
        })
      ]
    }).then(({ x, y }) => {
      Object.assign(floating.style, { left: `${x}px`, top: `${y}px` })
    })
  }
  return autoUpdate(reference, floating, place)
}

/** A type row as the menus show it: where the query matched, for the
 * highlight (`[start, end)` in the label, or in the command). */
export interface EntityTypeMatch {
  item: EntityTypeItem
  label?: [number, number]
  command?: [number, number]
}

/**
 * Filter types by what was typed after `/` — on the label and the command,
 * case-insensitive. Prefix matches rank first, then substring matches, each
 * group in host order. An empty query keeps every type.
 */
export const filterEntityTypes = (
  items: EntityTypeItem[],
  query: string
): EntityTypeMatch[] => {
  const q = query.trim().toLowerCase()
  if (!q) {
    return items.map((item) => ({ item }))
  }
  const ranked: { match: EntityTypeMatch; rank: number }[] = []
  for (const item of items) {
    const label = item.label.toLowerCase().indexOf(q)
    const command = (item.command ?? '').toLowerCase().indexOf(q)
    if (label < 0 && command < 0) {
      continue
    }
    ranked.push({
      match: {
        item,
        label: label >= 0 ? [label, label + q.length] : undefined,
        command: command >= 0 ? [command, command + q.length] : undefined
      },
      rank: label === 0 || command === 0 ? 0 : 1
    })
  }
  return ranked
    .sort((a, b) => a.rank - b.rank)
    .map(({ match }) => match)
}

/** Split `text` around a `[start, end)` match, for a highlight. */
export const splitMatch = (text: string, range?: [number, number]) =>
  range
    ? [
        { text: text.slice(0, range[0]), hit: false },
        { text: text.slice(range[0], range[1]), hit: true },
        { text: text.slice(range[1]), hit: false }
      ].filter((part) => part.text)
    : [{ text, hit: false }]

/** The search state behind the `/` menu and the picker: debounced, aborted
 * when superseded (a stale answer is dropped even if the host ignores the
 * signal), with loading / failed flags for the empty states. */
export const useEntitySearch = (adapters: () => KunEditorAdapters) => {
  const results = shallowRef<EntityHit[]>([])
  const loading = ref(false)
  const failed = ref(false)
  let controller: AbortController | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    controller?.abort()
    controller = null
  }

  const clear = () => {
    cancel()
    results.value = []
    loading.value = false
    failed.value = false
  }

  /** Search `query` in `type`. An empty query clears. */
  const search = (type: string, query: string) => {
    cancel()
    const searchEntities = adapters().searchEntities
    const q = query.trim()
    if (!q || !searchEntities) {
      results.value = []
      loading.value = false
      failed.value = false
      return
    }
    loading.value = true
    timer = setTimeout(async () => {
      timer = null
      const mine = new AbortController()
      controller = mine
      try {
        const hits = await searchEntities(type, q, mine.signal)
        if (controller !== mine) {
          return
        }
        results.value = Array.isArray(hits) ? hits : []
        failed.value = false
      } catch {
        if (controller !== mine) {
          return
        }
        results.value = []
        failed.value = !mine.signal.aborted
      }
      controller = null
      loading.value = false
    }, 200)
  }

  onBeforeUnmount(cancel)
  return { results, loading, failed, search, clear }
}

/**
 * The LIVE EditorView, for a plugin view.
 *
 * @prosemirror-adapter hands a plugin view a SNAPSHOT of the view on every
 * update (`Object.assign(Object.create(proto), view)`, so Vue sees a new
 * object). Dispatching through the snapshot reaches the real view (its
 * `dispatch` is bound), but the snapshot's `state` stays what it was: read it
 * after a dispatch, or after an `await`, and it is stale — a transaction built
 * from it is "mismatched", and its `focus()` writes the stale selection back
 * into the DOM. Reading the snapshot inside `update` is fine (it is fresh
 * there); anything that dispatches and then reads, focuses or waits uses this.
 * Must be called in a component under <MilkdownProvider>.
 */
export const useLiveView = (): (() => EditorView | undefined) => {
  const [, getEditor] = useInstance()
  return () => {
    let view: EditorView | undefined
    getEditor()?.action((ctx) => {
      view = ctx.get(editorViewCtx)
    })
    return view
  }
}

/** A short unique id prefix for `aria-activedescendant` targets. */
let idSeed = 0
export const entityDomId = (prefix: string) => `${prefix}-${(idSeed += 1)}`
