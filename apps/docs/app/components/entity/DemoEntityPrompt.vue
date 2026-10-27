<script setup lang="ts">
// A demo of host-owned entity search (`entityPrompt`): the editor hands over a
// TYPE, this opens a KunModal with its own search + the same card component
// the editor renders, and resolves the picked reference (or null on cancel).
import type { EntityHit, EntityRef, KunEditorAdapters } from '@kungal/editor-core'
import DemoEntityCard from './DemoEntityCard.vue'
import DemoEntityChip from './DemoEntityChip.vue'

const open = ref(false)
const type = ref('')
const display = ref<'card' | 'chip' | 'auto'>('auto')
const query = ref('')
const hits = ref<EntityHit[]>([])
let settle: ((ref: EntityRef | null) => void) | null = null

const finish = (ref: EntityRef | null) => {
  open.value = false
  settle?.(ref)
  settle = null
}

watch([query, type], async ([q, t]) => {
  hits.value = await mockSearchEntities(t, q, new AbortController().signal)
})

const adapters: KunEditorAdapters = {
  ...mockEntityAdapters,
  entityPrompt: (ctx) =>
    new Promise((resolve) => {
      settle = resolve
      type.value = ctx.type
      display.value = ctx.display
      query.value = ''
      open.value = true
    })
}
const label = computed(
  () => mockEntityTypes.find((item) => item.type === type.value)?.label ?? ''
)
</script>

<template>
  <DemoEditor
    model-value="在空行输入 / 选择类型(或点工具栏的条目按钮)—— 搜索交给宿主自己的弹窗。&#10;&#10;"
    :adapters="adapters"
    :entity-view="{ card: DemoEntityCard, chip: DemoEntityChip }"
    :kunui-toolbar="true"
    :toolbar-item-overrides="{ entityPicker: { icon: 'lucide:id-card', label: '插入条目卡片' } }"
  />
  <KunModal
    :model-value="open"
    :title="`插入${label}(${display === 'card' ? '卡片' : '行内'})`"
    inner-class-name="w-[min(32rem,calc(100vw-2rem))]"
    @update:model-value="(v: boolean) => !v && finish(null)"
  >
    <KunInput v-model="query" placeholder="搜索…" class="mb-3" />
    <div class="space-y-2">
      <!-- The card renders a link; a row must not navigate (and a link cannot
           sit inside a <button>), so the row is a role=button that swallows it. -->
      <div
        v-for="hit in hits"
        :key="hit.ref.url"
        role="button"
        tabindex="0"
        class="rounded-kun-lg focus-visible:ring-primary block cursor-pointer focus-visible:ring-2"
        @click.capture.prevent="finish(hit.ref)"
        @keydown.enter.prevent="finish(hit.ref)"
        @keydown.space.prevent="finish(hit.ref)"
      >
        <DemoEntityCard :entity="hit.ref" :selected="false" />
      </div>
    </div>
  </KunModal>
</template>
