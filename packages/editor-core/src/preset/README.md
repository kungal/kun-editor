# preset/

The composed bundle. `createKunEditorPlugins(adapters, features)` assembles the
Milkdown baseline (`commonmark` + `gfm` + `history` + `listener` + `clipboard`
+ `indent` + `trailing`) with the KunEditor plugins from `../plugins`, wiring
each optional plugin only when its adapter/feature is present.

This is the single call a render layer (`@kungal/editor-vue`) makes — it should
never re-derive the plugin list itself, so the WYSIWYG and the markdown-source
views always agree on the schema.
