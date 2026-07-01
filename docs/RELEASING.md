# Releasing KunEditor

KunEditor uses [changesets](https://github.com/changesets/changesets) and
publishes to npm via **OIDC trusted publishing** (no `NPM_TOKEN`, with
provenance) — the same pipeline as `kun-ui`.

## Lockstep versioning

The three packages are a `fixed` group in
[`.changeset/config.json`](../.changeset/config.json): `@kungal/editor-core`,
`@kungal/editor-vue`, `@kungal/editor-nuxt` always share **one version**. A
single ProseMirror schema spans core + vue, so a version skew between them is
exactly the kind of mismatch that breaks node identity — moving them together
removes the failure mode.

## Day-to-day

1. Make your change.
2. `pnpm changeset` → pick `patch`/`minor`/`major`, write a one-line summary
   (becomes the CHANGELOG entry). Any package you pick bumps all three.
3. Commit the generated `.changeset/*.md` alongside the code.

## On push to `main`

The [Release workflow](../.github/workflows/release.yml) runs `changeset
version` (applies bumps, writes CHANGELOGs, drops the `.changeset/*.md`),
commits the bump back to `main` with `[skip ci]`, then `changeset publish`
builds and publishes via OIDC. A push carrying **no** changeset is a cheap no-op
— nothing is published (expected for docs/CI-only changes). One GitHub Release
is cut on the `@kungal/editor-vue` tag (it covers all three).

## First publish checklist

Before the very first `changeset publish`:

- Create the `kungal/kun-editor` GitHub repo and push `main`.
- Configure npm **trusted publishing** for each `@kungal/editor-*` package
  (npmjs.com → package → Settings → Trusted Publisher → this repo + the Release
  workflow). Until the packages exist, the first publish may need a one-time
  manual `npm publish --access public` per package to establish the name, then
  OIDC takes over.
- Confirm the `@kungal` org grants publish rights to the repo's OIDC identity.

## Local dry run

```bash
pnpm install
pnpm build              # all three packages must build clean
pnpm typecheck
pnpm changeset status   # what would be released
```
