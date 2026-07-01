<script setup lang="ts">
const md = `markdown 形式(与服务端共用):

[@Alice](kungal-user:1)`
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />

    <h2 class="mt-10 mb-1 text-xl font-semibold">语法</h2>
    <Code :code="md" lang="markdown" />

    <h2 class="mt-8 mb-1 text-xl font-semibold">要点</h2>
    <ul class="text-default-600 list-disc space-y-1 pl-5">
      <li>schema 是纯的,保证 <code>[@name](kungal-user:id)</code> 往返;由 <code>features.mention</code> 控制(默认开)。</li>
      <li><code>@</code> 自动补全下拉消费 <code>searchMentionUsers</code> 适配器 —— 缺它则无下拉。</li>
      <li>scheme 常量 <code>MENTION_SCHEME = 'kungal-user:'</code> 与服务端共享。</li>
    </ul>

    <h2 class="mt-8 mb-1 text-xl font-semibold">演示</h2>
    <p class="text-default-600 mb-3">输入 <code>@a</code> 触发下拉(Alice / Alicia):</p>
    <DemoEditor
      model-value="输入 @a 试试提及自动补全 —— "
      :adapters="{ searchMentionUsers: mockSearchMentionUsers }"
    />
  </article>
</template>
