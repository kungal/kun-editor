<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">语法</h2>
    <Code code="用 ||双竖线|| 把内容藏起来,点击揭示。" lang="markdown" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">要点</h2>
    <ul class="text-default-600 list-disc space-y-1 pl-5">
      <li>纯插件,<strong>无需 adapter</strong>;由 <code>features.spoiler</code> 控制(默认开)。</li>
      <li>markdown 形式与服务端渲染器共用同一 <code>||…||</code> 语法。</li>
      <li>输入 <code>||文本||</code> 会即时变成 spoiler 节点。</li>
    </ul>

    <h2 class="mt-8 mb-1 text-xl font-semibold">演示</h2>
    <DemoEditor model-value="点击揭示:||这是隐藏的剧透|| —— 试试自己敲 ||秘密||。" />
  </article>
</template>
