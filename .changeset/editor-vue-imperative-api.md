---
'@kungal/editor-vue': minor
---

Add an imperative handle to `<KunEditor>` for cursor-level inserts.

A `<KunEditor>` template ref now exposes `KunEditorExpose`:

- `insertQuote({ refId, label })` — insert a reference atom
  (`[label](kungal-reply:refId)`) at the caret (requires `features.quote`)
- `insertMention({ userId, name })` — insert an @mention atom at the caret
- `focus()` — focus the WYSIWYG editor

```ts
const editor = ref<InstanceType<typeof KunEditor>>()
editor.value?.insertMention({ userId: 1, name: 'Alice' })
editor.value?.insertQuote({ refId: '101', label: '#1' })
```

This is what the forum's per-floor 「引用」 needs — a live, cursor-level insert of
`@author #floor` (each command inserts with a trailing space), rather than
editing the markdown string. Works in either view (the WYSIWYG editor stays
mounted in source mode too). Exported type: `KunEditorExpose`.
