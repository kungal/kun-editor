<script setup lang="ts">
const syntax = `行内公式:$E = mc^2$

块级公式:

$$
\\int_0^\\infty e^{-x}\\,dx = 1
$$`
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">语法</h2>
    <Code :code="syntax" lang="markdown" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">要点</h2>
    <ul class="text-default-600 list-disc space-y-1 pl-5">
      <li>由 <code>features.katex</code> 控制(默认开);<code>katex</code> 是可选 peer。</li>
      <li>宿主需引入 KaTeX 的 CSS:<code>import 'katex/dist/katex.min.css'</code>。</li>
      <li>输入 <code>$…$</code> 成行内公式;<code>$$</code> + 回车开一个公式块。</li>
    </ul>

    <h2 class="mt-8 mb-1 text-xl font-semibold">演示</h2>
    <DemoEditor
      model-value="质能方程 $E = mc^2$,以及一个积分:

$$
\int_0^\infty e^{-x}\,dx = 1
$$"
    />
  </article>
</template>
