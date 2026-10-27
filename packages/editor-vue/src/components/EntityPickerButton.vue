<script setup lang="ts">
// The headless toolbar's entity button: a toolbar button + a panel (the same
// click-outside popover pattern as LinkInput). With the host's `entityPrompt`
// the panel is the type menu (<EntityTypePicker>) and a pick hands off to the
// host's modal; otherwise it is <EntityPicker>, the inline search. Focus
// moves into the picker's search box; ProseMirror keeps its selection across
// the blur, so the pick lands where the caret was — a card in an empty
// paragraph, a chip anywhere else — and focus goes back to the editor.
import { callCommand } from '@milkdown/kit/utils'
import { editorViewCtx } from '@milkdown/kit/core'
import { useInstance } from '@milkdown/vue'
import { insertEntityCommand, promptForEntity } from '@kungal/editor-core/preset'
import type { EntityHit, EntityTypeItem } from '@kungal/editor-core'
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { KUN_EDITOR_CONTEXT } from '../context'
import { entityLabels, floatNear } from '../entity-shared'
import { TOOLBAR_ICONS as I } from '../toolbar-icons'
import EntityPicker from './EntityPicker.vue'
import EntityTypePicker from './EntityTypePicker.vue'

const [, getEditor] = useInstance()
const ctx = inject(KUN_EDITOR_CONTEXT)
const t = computed(() => entityLabels(ctx?.locale))

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

// Kept inside the viewport (flip + shift), wherever the button sits.
let stopFloating: (() => void) | null = null
watch(open, async (isOpen) => {
  stopFloating?.()
  stopFloating = null
  await nextTick()
  if (isOpen && triggerRef.value && panelRef.value) {
    stopFloating = floatNear(triggerRef.value, panelRef.value)
  }
})
onBeforeUnmount(() => stopFloating?.())

const closeAndFocus = () => {
  open.value = false
  getEditor()?.action((c) => c.get(editorViewCtx).focus())
}

const onPick = (hit: EntityHit) => {
  getEditor()?.action(callCommand(insertEntityCommand.key, { ref: hit.ref }))
  closeAndFocus()
}

const onPickType = (item: EntityTypeItem) => {
  const prompt = ctx?.adapters.entityPrompt
  open.value = false
  if (prompt) {
    getEditor()?.action((c) => {
      void promptForEntity(c.get(editorViewCtx), prompt, item.type)
    })
  }
}

const onDocClick = (e: MouseEvent) => {
  if (open.value && rootRef.value && !rootRef.value.contains(e.target as Node)) {
    open.value = false
  }
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="rootRef" class="kun-editor__entity">
    <button
      ref="triggerRef"
      type="button"
      class="kun-editor__tool"
      :title="t.insert"
      :aria-label="t.insert"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="kun-editor__icon" v-html="I.entity" />
    </button>
    <div v-if="open" ref="panelRef" class="kun-editor__entity-panel">
      <EntityTypePicker
        v-if="ctx?.adapters.entityPrompt"
        :types="ctx.adapters.entityTypes ?? []"
        :locale="ctx.locale"
        @pick="onPickType"
        @close="closeAndFocus"
      />
      <EntityPicker
        v-else
        :adapters="ctx?.adapters ?? {}"
        :locale="ctx?.locale"
        @pick="onPick"
        @close="closeAndFocus"
      />
    </div>
  </div>
</template>
