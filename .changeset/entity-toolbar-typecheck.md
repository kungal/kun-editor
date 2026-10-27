---
'@kungal/editor-core': patch
'@kungal/editor-vue': patch
'@kungal/editor-nuxt': patch
---

修复 0.39.0 的 `KunEditorToolbar.vue` 让宿主的 `vue-tsc` 报错,实体样式只作用于编辑器内

- `@kungal/editor-nuxt` 以 `.vue` 源码发布,宿主会对它做类型检查。0.39.0 在模板里直接写了 `entityPopoverEl?.close()`,而这个 `let` 只在 ref 回调里被重新赋值,TS 的流分析在模板表达式里把它收窄成 `null`,于是报 `Property 'close' does not exist on type 'never'`。现在改为调用脚本里的 `closeEntityPopover()`,行为不变。
- 参考样式表里 `.kun-entity`、`.kun-entity-card`、`.kun-entity-chip`(及其 `__body` / `__fallback` / 选中描边)改为只在 `.kun-editor__wysiwyg` 内生效。宿主在**发布后的帖子**里渲染自己的同名类时,不会再被全站引入的 `editor.css` 改样式。弹层类(`.kun-entity-menu*` / `.kun-entity-slash*` / `.kun-entity-picker*`)名字独特,保持不变。
