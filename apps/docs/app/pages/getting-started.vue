<script setup lang="ts">
const install = `pnpm add @kungal/editor-vue @kungal/editor-core vue \\
  @milkdown/kit @milkdown/prose @milkdown/vue`

const optionalPeers = `# 代码块 + Markdown 源码视图
pnpm add codemirror @codemirror/view @codemirror/state \\
  @codemirror/commands @codemirror/language @codemirror/language-data \\
  @codemirror/lang-markdown @lezer/highlight

# LaTeX 公式(记得也引入它的 CSS)
pnpm add katex`

const usage = `<script setup lang="ts">
import { KunEditor, type KunEditorAdapters } from '@kungal/editor-vue'
// 编辑器是 headless 的 —— 自带样式:拷贝本站的参考样式表(见「样式」页)
import '~/assets/kun-editor.css'
// 启用了哪个 peer 就引它的 CSS
import 'katex/dist/katex.min.css'

const markdown = ref('# Hello KunEditor')

const adapters: KunEditorAdapters = {
  uploadImage: (file) => api.uploadTopicImage(file),
  searchMentionUsers: (q) => oauth.searchUsers(q)
}
<\/script>

<template>
  <KunEditor v-model="markdown" :adapters="adapters" locale="zh-cn" />
<\/template>`
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">安装</h2>
    <p class="text-default-600 mb-3">
      安装编辑器包与 Milkdown 全家桶。Milkdown / ProseMirror
      <strong>必须在宿主里只装一份</strong>(否则会出现两份 schema
      导致节点身份错乱),所以它们是 peer 依赖。
    </p>
    <Code :code="install" lang="bash" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">可选功能的 peer</h2>
    <p class="text-default-600 mb-3">
      代码块、Markdown 源码视图、LaTeX 是可选的,按需再装它们的 peer。
    </p>
    <Code :code="optionalPeers" lang="bash" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">基础用法</h2>
    <p class="text-default-600 mb-3">
      用 <code class="text-primary">v-model</code> 绑定 markdown 字符串,用
      <code class="text-primary">adapters</code> 注入你的后端策略。
    </p>
    <Code :code="usage" lang="vue" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">效果</h2>
    <p class="text-default-600 mb-3">下面就是一个可交互的编辑器:</p>
    <DemoEditor
      model-value="# Hello KunEditor

**加粗**、*斜体*、`行内代码`,还有 ||隐藏文本|| 与 $E = mc^2$。"
      :adapters="{ searchMentionUsers: mockSearchMentionUsers, stickerSource: mockStickerSource, uploadImage: mockUploadImage }"
    />

    <div
      class="border-default-200 bg-content1/40 rounded-kun-lg mt-8 flex items-center justify-between gap-3 border p-4"
    >
      <p class="text-default-600 text-sm">接下来:给 headless 编辑器上样式。</p>
      <KunButton color="primary" href="/guide/styling">样式指南 →</KunButton>
    </div>
  </article>
</template>
