<script setup lang="ts">
import { marked } from 'marked'
// Imported at build time; the three packages move in lockstep, so editor-vue's
// changelog covers the release history.
import changelog from '../../../../packages/editor-vue/CHANGELOG.md?raw'

const html = marked.parse(changelog, { async: false }) as string
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <DocTitle />
    <DocIntro />
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="kun-prose mt-8 max-w-none" v-html="html" />
  </article>
</template>
