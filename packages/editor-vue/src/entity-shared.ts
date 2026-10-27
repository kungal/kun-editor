// Shared pieces of the entity UI — the paste popover / display bubble, the `/`
// menu and the toolbar picker: their labels, how a floating panel is placed,
// and the debounced, abortable search all three run against the host's
// `searchEntities` adapter.
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift
} from '@floating-ui/dom'
import type { Placement, ReferenceElement } from '@floating-ui/dom'
import type { EntityHit, KunEditorAdapters, KunEditorLocale } from '@kungal/editor-core'
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
        types: 'Reference type'
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
        types: '引用类型'
      }
}

/**
 * Keep `floating` next to `reference` — below it by default, flipped above
 * when there is no room, and shifted to stay 8px inside the viewport (a phone
 * screen is narrow). Follows scrolling and resizing until the returned cleanup
 * runs. `floating` must be `position: absolute` (the reference stylesheet
 * gives every entity panel that).
 */
export const floatNear = (
  reference: ReferenceElement,
  floating: HTMLElement,
  placement: Placement = 'bottom-start'
): (() => void) => {
  const place = () => {
    void computePosition(reference, floating, {
      placement,
      middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })]
    }).then(({ x, y }) => {
      Object.assign(floating.style, { left: `${x}px`, top: `${y}px` })
    })
  }
  return autoUpdate(reference, floating, place)
}

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

/** A short unique id prefix for `aria-activedescendant` targets. */
let idSeed = 0
export const entityDomId = (prefix: string) => `${prefix}-${(idSeed += 1)}`
