<script setup lang="ts">
import { mockNotify, mockStickerSource, mockUploadImage } from '~/utils/mockAdapters'
import type { KunEditorAdapters } from '@kungal/editor-core'
import type { KunHeading } from '@kungal/editor-vue'

const adapters: KunEditorAdapters = {
  uploadImage: mockUploadImage,
  stickerSource: mockStickerSource,
  notify: mockNotify
}

// Long-ish content so jumping is visible in the bounded editor.
const para = ('正文段落,填充一些内容让编辑器可以滚动。'.repeat(6) + '\n\n').repeat(2)
const md = ref(
  [
    '# 引言',
    para,
    '## 背景',
    para,
    '### 由来',
    para,
    '## 设计',
    para,
    '### 数据模型',
    para,
    '### 交互',
    para,
    '## 结论',
    para
  ].join('\n\n')
)

const headings = ref<KunHeading[]>([])
const editor = ref<{ scrollToHeading: (i: number) => void } | null>(null)
const jump = (i: number) => editor.value?.scrollToHeading(i)

const src = `<script setup lang="ts">
import type { KunHeading } from '@kungal/editor-vue'
const md = ref('')
const headings = ref<KunHeading[]>([])
const editor = ref()
<\/script>

<template>
  <div class="flex gap-4">
    <!-- 左侧浅色大纲(有标题才显示) -->
    <nav v-if="headings.length" class="w-48 shrink-0">
      <button
        v-for="(h, i) in headings"
        :key="i"
        class="toc-item"
        :style="{ paddingInlineStart: (h.level - 1) * 12 + 'px' }"
        @click="editor?.scrollToHeading(i)"
      >{{ h.text }}</button>
    </nav>

    <KunEditor
      ref="editor"
      v-model="md"
      class="min-w-0 flex-1"
      @update:headings="headings = $event"
    />
  </div>
</template>`
</script>

<template>
  <article class="mx-auto max-w-4xl">
    <DocTitle />
    <DocIntro />

    <p class="text-default-600 mt-4 leading-relaxed">
      TOC 是<strong>宿主的 UI</strong>,编辑器只出两样能力:
      <code>@update:headings</code>(标题大纲 <code>{ level, text }[]</code>,随内容变化)
      和 <code>ref.scrollToHeading(i)</code>(在<strong>当前视图</strong>——所见即所得 / 源码 /
      分栏——跳到第 i 个标题并落光标)。颜色、缩进、左侧留白、分栏布局都由你写。切到「分栏」
      再点大纲,会滚动<strong>可编辑的源码侧</strong>。
    </p>

    <h2 class="mt-8 mb-1 text-xl font-semibold">演示</h2>
    <ClientOnly>
      <div class="flex gap-4">
        <nav v-if="headings.length" class="w-44 shrink-0 self-start">
          <button
            v-for="(h, i) in headings"
            :key="i"
            type="button"
            class="text-default-400 hover:text-primary block w-full truncate rounded px-2 py-1 text-left text-sm transition-colors"
            :style="{ paddingInlineStart: (h.level - 1) * 12 + 8 + 'px' }"
            @click="jump(i)"
          >
            {{ h.text }}
          </button>
        </nav>

        <div class="toc-demo min-w-0 flex-1">
          <KunEditor
            ref="editor"
            v-model="md"
            :adapters="adapters"
            @update:headings="headings = $event"
          >
            <template #view-switch="s">
              <KunEditorViewSwitch v-bind="s" />
            </template>
            <template #toolbar="api">
              <KunEditorToolbar v-bind="api" />
            </template>
          </KunEditor>
        </div>
      </div>
    </ClientOnly>

    <h2 class="mt-8 mb-1 text-xl font-semibold">用法</h2>
    <Code :code="src" lang="vue" />
  </article>
</template>

<style scoped>
/* Bound the editor's height so a TOC jump scrolls WITHIN the editor. A host that
   wants page-level scrolling can skip this — scrollToHeading uses the element's
   nearest scroll container either way. */
.toc-demo :deep(.kun-editor__wysiwyg),
.toc-demo :deep(.cm-scroller) {
  max-height: 55vh;
  overflow: auto;
}
</style>
