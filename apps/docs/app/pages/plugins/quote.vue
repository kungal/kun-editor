<script setup lang="ts">
const md = `markdown 形式(refId 不透明,由宿主定义):

[#5](kungal-reply:123)`

const insert = `import { callCommand } from '@milkdown/kit/utils'
import { insertQuoteCommand } from '@kungal/editor-core/preset'

// 宿主在某个「引用」按钮里调用
editor.action(callCommand(insertQuoteCommand.key, {
  refId: String(reply.id),   // 不透明,含义由你决定
  label: \`#\${reply.floor}\`  // chip 上显示什么
}))`
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">语法</h2>
    <Code :code="md" lang="markdown" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">要点</h2>
    <ul class="text-default-600 list-disc space-y-1 pl-5">
      <li>宿主专属,<strong>默认关</strong> —— 用 <code>:features="{ quote: true }"</code> 开启。</li>
      <li>引用被泛化为不透明的 <code>{ refId, label }</code>:编辑器渲染这个原子,含义由宿主决定。</li>
      <li>没有 <code>@</code> 那样的下拉;通过 <code>insertQuoteCommand</code> 插入。</li>
      <li>scheme 常量 <code>QUOTE_SCHEME = 'kungal-reply:'</code> 与服务端共享。</li>
    </ul>

    <h2 class="mt-8 mb-1 text-xl font-semibold">插入</h2>
    <Code :code="insert" lang="ts" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">演示</h2>
    <p class="text-default-600 mb-3">
      下面开启了 <code>features.quote</code>,种子内容里含一个引用链接,会被解析成引用 chip:
    </p>
    <DemoEditor
      model-value="回复 [#5](kungal-reply:123) 说得对。"
      :features="{ quote: true }"
    />
  </article>
</template>
