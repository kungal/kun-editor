---
'@kungal/editor-core': minor
---

`mentionFromUrl` now also receives the link text.

The mention-detection hook was `fromUrl(url)` — URL only — so a host couldn't
replicate a text-based guard. moyu's server treats `/user/<id>` as a mention only
when the link text starts with `@`; without the text, kun-editor would wrongly
turn a real link like `[see here](/user/5/x)` into a mention.

`mentionFromUrl` / `MentionUrlConfig['fromUrl']` are now
`(url: string, text: string) => number | null` — the remark transform passes the
link's plain text (concatenated across children). Backward compatible: existing
`(url) => …` handlers still type-check and behave the same; the default
`kungal-user:` scheme ignores the text.

```ts
mentionFromUrl: (url, text) => {
  if (!text.startsWith('@')) return null // reproduce moyu's guard
  const m = url.match(/^\/user\/(\d+)/)
  return m ? Number(m[1]) : null
}
```
