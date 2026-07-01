<script setup lang="ts">
// The @mention autocomplete dropdown — the render-layer VIEW over the core
// mention schema. Ported from the forum's MentionDropdown.vue, with the one
// host-specific bit (the user search) lifted to the injected `searchMentionUsers`
// adapter instead of a hardcoded `kunFetch('/user/search')`.
//
// Rendered as a Milkdown slash view (trigger `@`). It reads the KunEditor
// context (provided by <KunEditor>, an ancestor of the adapter provider) to get
// the search adapter + locale, debounces the network call, and on select
// replaces the `@query` range with a `mention` atom node.
import { SlashProvider } from '@milkdown/kit/plugin/slash'
import { usePluginViewContext } from '@prosemirror-adapter/vue'
import { TextSelection } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'
import { mentionId } from '@kungal/editor-core/preset'
import type { MentionUser } from '@kungal/editor-core'
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { KUN_EDITOR_CONTEXT } from '../context'

// The @query token at the cursor: `@` followed by up to 30 non-space, non-`@`
// chars, anchored to start-of-text or a space so `foo@bar` (emails) never
// triggers. Group 1 is the query (without the `@`).
const MENTION_RE = /(?:^|\s)@([^\s@]{0,30})$/

const ctx = inject(KUN_EDITOR_CONTEXT)
const searchMentionUsers = ctx?.adapters.searchMentionUsers
const isEnglish = computed(() =>
  (ctx?.locale ?? 'zh-cn').toLowerCase().startsWith('en')
)
const hints = computed(() =>
  isEnglish.value
    ? { searching: 'Searching…', empty: 'No matching users', prompt: 'Type a username to search' }
    : { searching: '搜索中…', empty: '无匹配用户', prompt: '输入用户名以搜索' }
)

const { view, prevState } = usePluginViewContext()

const divRef = ref<HTMLElement | null>(null)
let provider: SlashProvider

const visible = ref(false)
const query = ref('')
const results = ref<MentionUser[]>([])
const activeIndex = ref(0)
const searching = ref(false)
// Doc range of the `@query` text, captured in shouldShow so selecting a user
// knows exactly what to replace with the mention node.
let range: { from: number; to: number } | null = null
// Guards a stale async response from overwriting a newer query's results.
let searchSeq = 0
let searchTimer: ReturnType<typeof setTimeout> | null = null

const reset = () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
  query.value = ''
  results.value = []
  activeIndex.value = 0
  searching.value = false
  range = null
}

// Debounce the NETWORK call only (not the dropdown) so the @query + UI stay
// responsive per keystroke while the adapter is hit at most ~5x/sec.
const search = (q: string) => {
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
  if (!q || !searchMentionUsers) {
    results.value = []
    searching.value = false
    return
  }
  searching.value = true
  searchTimer = setTimeout(async () => {
    const seq = ++searchSeq
    let data: MentionUser[] = []
    try {
      data = await searchMentionUsers(q)
    } catch {
      data = []
    }
    // A newer keystroke already fired — drop this response.
    if (seq !== searchSeq) {
      return
    }
    results.value = data ?? []
    activeIndex.value = 0
    searching.value = false
  }, 180)
}

// The text of the current textblock from its start up to the cursor — computed
// straight from the doc rather than via SlashProvider.getContent (whose default
// only matches `paragraph` blocks and layers on focus checks we don't need).
const queryBeforeCursor = (v: EditorView): string | null => {
  const { selection } = v.state
  if (!selection.empty) {
    return null
  }
  const { $from } = selection
  const before = $from.parent.textBetween(
    Math.max(0, $from.parentOffset - 100),
    $from.parentOffset,
    undefined,
    '￼'
  )
  const match = before.match(MENTION_RE)
  return match ? (match[1] ?? '') : null
}

// SlashProvider calls this on every editor update. Cheap + synchronous: detect
// the @query, capture its range, kick the search off only when the query text
// actually changed, and return whether to show.
const shouldShow = (v: EditorView): boolean => {
  const q = queryBeforeCursor(v)
  if (q === null) {
    return false
  }
  const cursor = v.state.selection.$from.pos
  // `@` + query length — the leading space (if any) is matched but NOT replaced.
  range = { from: cursor - (q.length + 1), to: cursor }
  if (q !== query.value) {
    query.value = q
    search(q)
  }
  return true
}

const selectUser = (user: MentionUser) => {
  const v = view.value
  if (!v || !range) {
    return
  }
  const type = v.state.schema.nodes[mentionId]
  if (!type) {
    return
  }
  const node = type.create({ userId: user.id, name: user.name })
  const { from, to } = range
  const tr = v.state.tr.replaceWith(from, to, node)
  // A trailing space so the caret lands clear of the atom and typing continues
  // naturally instead of nudging the chip.
  const after = from + node.nodeSize
  tr.insertText(' ', after)
  tr.setSelection(TextSelection.create(tr.doc, after + 1))
  v.dispatch(tr.scrollIntoView())
  v.focus()
  provider.hide()
}

// The editor keeps DOM focus while the dropdown is open, so navigation keys go
// to ProseMirror. Intercept them in the capture phase (before PM sees them),
// but only while the dropdown is actually showing suggestions.
const onKeydown = (e: KeyboardEvent) => {
  if (!visible.value || !results.value.length) {
    if (visible.value && e.key === 'Escape') {
      e.preventDefault()
      provider.hide()
    }
    return
  }
  const last = results.value.length - 1
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      e.stopPropagation()
      activeIndex.value = activeIndex.value >= last ? 0 : activeIndex.value + 1
      break
    case 'ArrowUp':
      e.preventDefault()
      e.stopPropagation()
      activeIndex.value = activeIndex.value <= 0 ? last : activeIndex.value - 1
      break
    case 'Enter':
    case 'Tab': {
      const picked = results.value[activeIndex.value]
      if (picked) {
        e.preventDefault()
        e.stopPropagation()
        selectUser(picked)
      }
      break
    }
    case 'Escape':
      e.preventDefault()
      e.stopPropagation()
      provider.hide()
      break
  }
}

onMounted(() => {
  provider = new SlashProvider({
    content: divRef.value as HTMLElement,
    trigger: '@',
    shouldShow,
    // Run shouldShow on every update (no provider debounce) so the @query and
    // panel state track each keystroke; the network call is debounced in
    // search() instead.
    debounce: 0
  })
  provider.onShow = () => {
    visible.value = true
  }
  provider.onHide = () => {
    visible.value = false
    reset()
  }
  provider.update(view.value, prevState.value)
  // Capture phase so we beat ProseMirror's own keydown handling.
  window.addEventListener('keydown', onKeydown, true)
})

watch([view, prevState], () => {
  provider?.update(view.value, prevState.value)
})

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  window.removeEventListener('keydown', onKeydown, true)
  provider?.destroy()
})
</script>

<template>
  <!-- Rendered unconditionally (no v-if): the SlashProvider appendChild's this
       element out of Vue's tree, so a v-if that flips would orphan it. Visibility
       is driven by the data-show attribute the provider toggles. -->
  <div ref="divRef" class="kun-mention-dropdown" data-show="false">
    <template v-if="results.length">
      <button
        v-for="(u, i) in results"
        :key="u.id"
        type="button"
        class="kun-mention-dropdown__item"
        :data-active="i === activeIndex"
        @mousedown.prevent="selectUser(u)"
        @mouseenter="activeIndex = i"
      >
        <img
          v-if="u.avatar"
          :src="u.avatar"
          :alt="u.name"
          class="kun-mention-dropdown__avatar"
        />
        <span v-else class="kun-mention-dropdown__avatar kun-mention-dropdown__avatar--fallback">
          {{ u.name.charAt(0) }}
        </span>
        <span class="kun-mention-dropdown__name">{{ u.name }}</span>
      </button>
    </template>

    <div v-else-if="searching" class="kun-mention-dropdown__hint">
      {{ hints.searching }}
    </div>
    <div v-else-if="query" class="kun-mention-dropdown__hint">
      {{ hints.empty }}
    </div>
    <div v-else class="kun-mention-dropdown__hint">
      {{ hints.prompt }}
    </div>
  </div>
</template>

<style>
.kun-mention-dropdown {
  position: absolute;
  z-index: 30;
  display: none;
  min-width: 12rem;
  max-width: 20rem;
  max-height: 16rem;
  overflow-y: auto;
  padding: 0.25rem;
  background: var(--color-background, #fff);
  border: 1px solid var(--color-default-200, #e4e4e7);
  border-radius: 0.5rem;
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 0.1),
    0 2px 4px -2px rgb(0 0 0 / 0.1);
}

.kun-mention-dropdown[data-show='true'] {
  display: block;
}

.kun-mention-dropdown__item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.kun-mention-dropdown__item:hover,
.kun-mention-dropdown__item[data-active='true'] {
  background: var(--color-default-100, #f4f4f5);
}

.kun-mention-dropdown__avatar {
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  border-radius: 9999px;
  object-fit: cover;
}

.kun-mention-dropdown__avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-default-200, #e4e4e7);
  color: var(--color-default-600, #52525b);
  font-size: 0.75rem;
}

.kun-mention-dropdown__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
}

.kun-mention-dropdown__hint {
  padding: 0.375rem 0.5rem;
  color: var(--color-default-400, #a1a1aa);
  font-size: 0.875rem;
}
</style>
