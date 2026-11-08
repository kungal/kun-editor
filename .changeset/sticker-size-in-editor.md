---
'@kungal/editor-core': minor
'@kungal/editor-vue': minor
'@kungal/editor-nuxt': minor
---

编辑区里的贴纸按贴纸尺寸显示,不再是全宽大图

贴纸在 markdown 里就是普通图片,编辑器之前也把它当普通图片渲染:宽度撑满,还继承宿主 prose 层的图片样式(margin、边框)。现在核心的贴纸插件给贴纸图片加上 class `kun-sticker`(节点装饰,不进 schema 也不进 markdown,序列化仍是 `![名称](src "名称")`),参考样式表 `editor.css` 按贴纸尺寸显示:内联、5rem(80px)高、垂直居中,不带边框与外边距。

- **从面板插入的贴纸**总会被识别(两套工具栏都改用新的 `insertStickerCommand({ src, name })`,本次编辑会话内同一 src 的复制粘贴也算),无需任何 adapter。
- **加载进来的 markdown**(重新编辑旧帖)由新 adapter `isSticker(src) => boolean` 判断 —— src 可能与面板给的形态不同(如论坛保存后的 `/image/<hash>_320` token),所以交给宿主按 hash 等规则判断。每次编辑对每张图片调用,须纯且快;抛错视为否。
- 宿主的判断依赖异步数据(贴纸列表加载完成)时,调用 `<KunEditor>` 模板 ref 的新方法 `refreshStickers()`(底层是 `refreshStickersCommand`)重新判断;贴纸功能关闭时是空操作。
- `features.sticker: false` 时不启用。

**核心:** 新增 `createStickerPlugin(isSticker?)`、`insertStickerCommand`、`refreshStickersCommand`、`stickerPluginKey`、`STICKER_CLASS`。
