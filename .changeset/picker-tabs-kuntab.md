---
'@kungal/editor-nuxt': minor
---

`<KunEditorToolbar>`: the emoji/sticker picker tabs are now a
`<KunTab variant="underlined" full-width>` instead of two `<KunButton>`s —
matching `<KunEditorViewSwitch>` and the forum's picker (keyboard nav, sliding
indicator, a11y). Only shown when a `stickerSource` adapter is present.
