// Extract real prop metadata (name, type, default, required, JSDoc description)
// from <KunEditor> using vue-component-meta, so the /reference/editor props table
// is generated from the TypeScript types and can never drift.
//
//   pnpm gen:meta      # re-run after changing KunEditor's props
//
// Output: app/generated/component-meta.json (committed — the Docker build uses
// the committed file, it does not run this script).
import { createChecker } from 'vue-component-meta'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..', '..')
const vuePkg = join(root, 'packages', 'editor-vue')
// tsconfig.meta maps @kungal/editor-core to SOURCE so imported prop types print
// with real names, not the aliases tsup emits in the bundled .d.ts.
const tsconfig = join(vuePkg, 'tsconfig.meta.json')

const checker = createChecker(tsconfig, {
  forceUseTs: true,
  printer: { newLine: 1 }
})

const cleanType = (t) =>
  String(t)
    .replace(/\s+/g, ' ')
    .replace(/\s*\|\s*undefined\b/g, '')
    .trim()

const components = { KunEditor: 'src/components/KunEditor.vue' }
const out = {}
let total = 0

for (const [name, rel] of Object.entries(components)) {
  const meta = checker.getComponentMeta(join(vuePkg, rel))
  const props = meta.props
    .filter((p) => !p.global)
    .map((p) => ({
      name: p.name,
      type: cleanType(p.type),
      required: !!p.required,
      default: p.default ?? undefined,
      description:
        (p.description || '').replace(/\s+/g, ' ').trim() || undefined
    }))
    .sort(
      (a, b) =>
        Number(b.required) - Number(a.required) || a.name.localeCompare(b.name)
    )
  out[name] = { props }
  total += props.length
}

const dir = join(here, '..', 'app', 'generated')
mkdirSync(dir, { recursive: true })
writeFileSync(
  join(dir, 'component-meta.json'),
  `${JSON.stringify(out, null, 2)}\n`
)
console.log(
  `wrote component-meta.json — ${Object.keys(out).length} component(s), ${total} props`
)
