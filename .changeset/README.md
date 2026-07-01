# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets).
It is how KunEditor versions and publishes its packages.

## How to release (day-to-day)

1. Make your code change on a branch.
2. Run `pnpm changeset` and answer the prompts:
   - All three packages share **one locked version** (the `fixed` group in
     `config.json`), so picking a bump for any of them bumps them all together.
     A single ProseMirror schema spans core + vue; shipping them at mismatched
     versions is the kind of skew that breaks node identity, so they move as one.
   - Choose `patch` / `minor` / `major` and write a short summary — it becomes
     the CHANGELOG entry.
3. Commit the generated `.changeset/*.md` file alongside your code.
4. On push to `main`, the **Release** workflow applies the bump, writes
   CHANGELOGs, commits back, and publishes to npm via OIDC trusted publishing
   (no token, with provenance).

A push with no changeset publishes nothing — that's expected for docs/CI-only
changes.
