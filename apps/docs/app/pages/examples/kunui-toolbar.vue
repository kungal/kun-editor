<script setup lang="ts">
import { mockNotify, mockStickerSource, mockUploadImage } from '~/utils/mockAdapters'
import type { KunEditorAdapters } from '@kungal/editor-core'
import type { KunSelectionItem, KunToolbarItem } from '@kungal/editor-vue'

const adapters: KunEditorAdapters = {
  uploadImage: mockUploadImage,
  stickerSource: mockStickerSource,
  notify: mockNotify
}

// Reordered + subset: picker first, then bold/italic, image, heading last — and
// no lists/quote/code/hr/spoiler. Apply the SAME array to every editor for a
// consistent site-wide order without rebuilding a toolbar.
const customItems: KunToolbarItem[] = [
  'picker',
  '|',
  'bold',
  'italic',
  'code',
  '|',
  'image',
  '|',
  'heading'
]
const itemsSrc = `<KunEditorToolbar
  v-bind="api"
  :items="['picker', '|', 'bold', 'italic', 'code', '|', 'image', '|', 'heading']"
/>`

// Compact editors (reply/comment) can drop 分栏 — or offer just WYSIWYG (no
// switch bar at all) — via the `views` prop.
const compactViews: ('wysiwyg' | 'source')[] = ['wysiwyg', 'source']
const viewsSrc = `<!-- 回复/评论:去掉分栏(甚至只留 ['wysiwyg'] 就没有切换条了) -->
<KunEditor v-model="md" :views="['wysiwyg', 'source']" />`

// The selection bubble: reorder / subset via an array, false to disable; style
// via the .kun-editor__bubble* class hooks.
const bubbleItems: KunSelectionItem[] = ['bold', 'italic']
const bubbleSrc = `<!-- 选区浮动菜单只留加粗/斜体;false 关闭 -->
<KunEditor v-model="md" :selection-toolbar="['bold', 'italic']" />

/* 样式(参考 kun-editor.css):.kun-editor__bubble / .kun-editor__bubble-btn */`

// Custom link-URL entry: a `linkPrompt` adapter replaces the native prompt (and
// the toolbar popover). Here it just derives a URL from the selected text; a real
// app would open its own KunModal / article picker and resolve the chosen URL.
const linkAdapters: KunEditorAdapters = {
  ...adapters,
  linkPrompt: ({ text }) =>
    Promise.resolve(`https://example.com/search?q=${encodeURIComponent(text || 'link')}`)
}
const linkPromptSrc = `const adapters = {
  // …uploadImage, notify…
  // Your own UI instead of the native prompt / popover — return the URL (or null):
  linkPrompt: async ({ text }) => await openLinkModal(text) // e.g. a KunModal
}
// One override covers the toolbar, the default toolbar, AND the selection bubble.`

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

    <h2 class="mt-8 mb-1 text-xl font-semibold">自定义按钮顺序 / 增减</h2>
    <p class="text-default-600 mb-2">
      传 <code>:items</code>(<code>KunToolbarItem[]</code>,<code>'|'</code> 是分隔线)重排或增减内置按钮 ——
      不用重写整套工具栏。把同一份 <code>items</code> 用在编辑/回复/评论,顺序就全站一致。下面是
      表情在前、去掉列表/引用等的例子:
    </p>
    <ClientOnly>
      <DemoEditor
        :kunui-toolbar="true"
        :toolbar-items="customItems"
        :adapters="adapters"
        :output="false"
        model-value="这条工具栏用 :items 重排:表情 → 加粗/斜体/代码 → 图片 → 文本大小。"
      />
    </ClientOnly>
    <Code :code="itemsSrc" lang="vue" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">限制视图(紧凑编辑器)</h2>
    <p class="text-default-600 mb-2">
      用 <code>:views</code> 控制切换条提供哪些模式。编辑话题页保留分栏,回复/评论框
      去掉它(下面只有 预览/Markdown);只给 <code>['wysiwyg']</code> 则整条切换条都不显示。
    </p>
    <ClientOnly>
      <DemoEditor
        :kunui-toolbar="true"
        :views="compactViews"
        :adapters="adapters"
        :output="false"
        model-value="紧凑模式:没有「分栏」页签。"
      />
    </ClientOnly>
    <Code :code="viewsSrc" lang="vue" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">选区浮动工具栏(定制)</h2>
    <p class="text-default-600 mb-2">
      选中文本会浮出格式菜单。<code>selectionToolbar</code> 传项目数组可重排/增减
      (<code>'|'</code> 分隔),传 <code>false</code> 关闭;样式改参考 CSS 的
      <code>.kun-editor__bubble</code> / <code>.kun-editor__bubble-btn</code>。下面这个只保留
      加粗/斜体 —— 选中下方文字试试:
    </p>
    <ClientOnly>
      <DemoEditor
        :selection-toolbar="bubbleItems"
        :output="false"
        model-value="选中这段文字,浮动菜单里只有加粗 / 斜体两项。"
      />
    </ClientOnly>
    <Code :code="bubbleSrc" lang="vue" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">自定义链接输入(linkPrompt)</h2>
    <p class="text-default-600 mb-2">
      默认「插入链接」用原生 <code>window.prompt</code>(手搓工具栏 / 选区气泡)或内置
      popover(KunUI 工具栏)。传一个 <code>linkPrompt</code> 适配器就能换成<strong>你自己的
      UI</strong>(KunModal、文章选择器…),一处覆盖工具栏 + 气泡。下面这个示例把选中文字拼进
      URL —— 选中文字点链接看看(不再弹原生框):
    </p>
    <ClientOnly>
      <DemoEditor
        :kunui-toolbar="true"
        :adapters="linkAdapters"
        model-value="选中这段文字,点链接按钮 —— 用的是 linkPrompt(不是原生弹框)。"
      />
    </ClientOnly>
    <Code :code="linkPromptSrc" lang="ts" />

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
