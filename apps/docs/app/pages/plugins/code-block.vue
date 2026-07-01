<script setup lang="ts">
const syntax = '```ts\nconst answer = 42\n```'
const demo = `选择语言、语法高亮由 CodeMirror 提供:

\`\`\`ts
function greet(name: string) {
  return \`Hello, \${name}!\`
}
\`\`\``
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">语法</h2>
    <Code :code="syntax" lang="markdown" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">要点</h2>
    <ul class="text-default-600 list-disc space-y-1 pl-5">
      <li>由 <code>features.codeBlock</code> 控制(默认开);需要 CodeMirror 相关 peer。</li>
      <li>工具栏可切换语言、搜索;标签文案可通过 <code>locale</code> 本地化。</li>
      <li>语言为 <code>latex</code> 的代码块会渲染公式预览(复用 KaTeX)。</li>
      <li>与 Markdown 源码视图共用同一套 <code>kunCM</code> CodeMirror 主题。</li>
    </ul>

    <h2 class="mt-8 mb-1 text-xl font-semibold">演示</h2>
    <DemoEditor :model-value="demo" />
  </article>
</template>
