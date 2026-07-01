---
'@kungal/editor-core': minor
---

Make the @mention link URL form injectable (host policy).

The mention markdown form was hardcoded to `[@name](kungal-user:<id>)`. But the
URL shape is a server contract — different hosts render/parse it differently — so
it's host policy, not editor mechanism. Two new (optional) `KunEditorAdapters`
fields let a host define it:

- `mentionToUrl(userId) => string` — build the link URL (default `kungal-user:<id>`)
- `mentionFromUrl(url) => number | null` — parse a link back to a user id, or
  null if it isn't a mention (default: the `kungal-user:` scheme)

`createMentionPlugin(config?)` now takes `{ toUrl, fromUrl }`; the preset threads
the adapters through. Omit them for the unchanged default — fully backward
compatible, no data migration.

This unblocks downstream adoption (e.g. moyu, whose mentions are real
`/user/<id>/resource` links): the host passes its own `mentionToUrl` /
`mentionFromUrl`, existing content keeps working, and its server + goldmark
renderer stay untouched. `insertMentionCommand` now resolves the node type by id
from the live schema, so it works with any mention config.
