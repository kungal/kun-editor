---
'@kungal/editor-core': patch
'@kungal/editor-vue': patch
'@kungal/editor-nuxt': patch
---

Ctrl+End / Ctrl+Home 越过卡片到达文档首尾

浏览器自带的 Ctrl+End 会停在第一个 `contenteditable=false` 的块(卡片)上:一段文字后面跟着几张卡片时,按 Ctrl+End 再打字,文字落在第一张卡片后面。现在编辑器自己处理 Mod-Home / Mod-End(macOS 上是 Cmd,另加 Cmd+↑ / Cmd+↓):首尾是文本块时光标落在其开头 / 末尾;首尾是卡片(或其他块级原子节点)时落成 gap cursor,打字即在那里新建一段。按住 Shift 则从原锚点扩展选区。核心导出 `docBoundarySelection(doc, dir)`。
