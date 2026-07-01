<script setup lang="ts">
const usage = `<KunEditor
  v-model="markdown"
  :adapters="adapters"
  :features="{ katex: false, quote: true }"
/>`

const rows = [
  { name: 'spoiler', type: 'boolean', default: 'true', description: '||隐藏文本|| 行内节点。' },
  { name: 'mention', type: 'boolean', default: 'true', description: '@提及 schema(往返)。@ 下拉另需 searchMentionUsers。' },
  { name: 'quote', type: 'boolean', default: 'false', description: '行内引用原子。宿主专属,默认关。' },
  { name: 'katex', type: 'boolean', default: 'true', description: '行内 / 块级 LaTeX(需 katex peer)。' },
  { name: 'codeBlock', type: 'boolean', default: 'true', description: 'CodeMirror 代码块(需 codemirror peers)。' },
  { name: 'sticker', type: 'boolean', default: 'true', description: '贴纸 / 表情弹层(emoji 内置;贴纸标签页需 stickerSource)。' }
]
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">用法</h2>
    <p class="text-default-600 mb-3">
      <code class="text-primary">features</code> 显式开关可选插件。默认大多为
      <code>true</code>(<code>quote</code> 例外,宿主专属默认关)。
    </p>
    <Code :code="usage" lang="vue" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">开关一览</h2>
    <PropsTable head="feature" :rows="rows" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">缺席的 adapter 会盖过开关</h2>
    <p class="text-default-600">
      功能同时受 adapter 约束:即便 <code>features.sticker</code> 为
      <code>true</code>,没有 <code>stickerSource</code>
      也不会出现贴纸标签页(emoji 仍在,因为它不需要 adapter)。<code>mention</code>
      的 schema 会保留(保证已有 <code>[@x](kungal-user:1)</code>
      往返),只是没有自动补全下拉。
    </p>

    <h2 class="mt-8 mb-1 text-xl font-semibold">只留 spoiler + 公式</h2>
    <DemoEditor
      model-value="只开了 spoiler 和 katex:||秘密|| 与 $a^2 + b^2 = c^2$。没有代码块、提及、贴纸。"
      :features="{ codeBlock: false, mention: false, sticker: false }"
    />
  </article>
</template>
