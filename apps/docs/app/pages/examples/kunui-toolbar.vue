<script setup lang="ts">
import { mockNotify, mockStickerSource, mockUploadImage } from '~/utils/mockAdapters'
import type { KunEditorAdapters } from '@kungal/editor-core'

const adapters: KunEditorAdapters = {
  uploadImage: mockUploadImage,
  stickerSource: mockStickerSource,
  notify: mockNotify
}

const usage = `<script setup lang="ts">
// nuxt.config: extends ['@kungal/ui-nuxt', '@kungal/editor-nuxt']
// → <KunEditor> + <KunEditorToolbar> + <KunEditorViewSwitch> auto-import.
const md = ref('')
const adapters = { uploadImage, stickerSource, notify }
<\/script>

<template>
  <KunEditor v-model="md" :adapters="adapters">
    <!-- 预览/Markdown 切换 → 真正的 KunTab(underline) -->
    <template #view-switch="s">
      <KunEditorViewSwitch v-bind="s" />
    </template>
    <!-- 格式工具栏 → KunButton / KunIcon / KunTooltip / KunPopover -->
    <template #toolbar="api">
      <KunEditorToolbar v-bind="api" />
    </template>
  </KunEditor>
</template>`
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <p class="text-default-600 mt-4 leading-relaxed">
      <code class="text-primary">&lt;KunEditor&gt;</code> 的工具栏是可替换的。它通过
      <code>#toolbar</code> 具名插槽把命令 API(<code>KunEditorToolbarApi</code>:run /
      insertText / focus / adapters / …)传出,所以自定义工具栏活在<strong>宿主的组件树</strong>里,
      无需 <code>useInstance</code>。核心 <code>@kungal/editor-vue</code> 保持
      <strong>headless、零 UI 依赖</strong>;<code>@kungal/editor-nuxt</code>(本就假定
      KunUI)提供 <code>&lt;KunEditorToolbar&gt;</code> —— 用
      <strong>KunButton / KunIcon / KunTooltip / KunPopover</strong> 搭的工具栏,原生的 tooltip
      延迟、popover 焦点/碰撞管理都有。这是 TipTap / BlockNote 同款「headless 核心 + 可换 UI 层」范式。
    </p>

    <h2 class="mt-8 mb-1 text-xl font-semibold">演示</h2>
    <p class="text-default-600 mb-2">
      预览/Markdown 切换是真正的 <code>&lt;KunTab variant="underlined"&gt;</code>(经
      <code>#view-switch</code> 插槽),工具栏全是 KunUI 组件(悬停看 tooltip、点表情看
      KunPopover):
    </p>
    <ClientOnly>
      <DemoEditor
        :kunui-toolbar="true"
        :adapters="adapters"
        model-value="上面的工具栏是 **KunUI 组件版**。试试加粗、标题、列表、上传图片、表情/贴纸 —— 再和 [默认(手搓)工具栏](/playground) 对比。"
      />
    </ClientOnly>

    <h2 class="mt-8 mb-1 text-xl font-semibold">用法</h2>
    <Code :code="usage" lang="vue" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">为什么放在 editor-nuxt</h2>
    <ul class="text-default-600 list-disc space-y-1 pl-5">
      <li><code>@kungal/editor-vue</code> 不依赖任何 UI 库 —— 任意 Vue 应用可装,默认是零依赖手搓工具栏。</li>
      <li><code>@kungal/editor-nuxt</code> 本就 peer-dep <code>@kungal/ui-vue</code>,KunUI 组件只在这一层出现。</li>
      <li>纯自定义:不用 KunUI 也行 —— 自己在 <code>#toolbar</code> 插槽里用 <code>api</code> 搭任意工具栏。</li>
    </ul>
  </article>
</template>
