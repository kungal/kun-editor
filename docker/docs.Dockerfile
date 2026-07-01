#
# Build + run the KunEditor docs site (apps/docs) — Nuxt 4, Nitro node-server.
#
# Build context MUST be the repo root: the docs app consumes the @kungal/editor-*
# workspace packages (imports @kungal/editor-vue + @kungal/editor-core/preset),
# so those must be present and BUILT before the docs build. The @kungal/ui-*
# packages come from npm (regular deps), installed in the deps stage.
#
# Mirrors kun-ui's docker/docs.Dockerfile: deps → build → slim run stage with
# only Node + the self-contained .output.
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-trixie-slim AS base
RUN corepack enable
WORKDIR /repo

# ---- deps: copy manifests, install the docs subgraph (+ workspace deps) ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/editor-core/package.json packages/editor-core/package.json
COPY packages/editor-vue/package.json  packages/editor-vue/package.json
COPY apps/docs/package.json            apps/docs/package.json
# --ignore-scripts: no lifecycle build needs to run at install time here; the
# later `nuxt build` runs its own prepare.
RUN pnpm install --frozen-lockfile --ignore-scripts --filter "@kungal/editor-docs..."

# ---- build: build the workspace packages, then the docs site ----
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/docs apps/docs
# editor-core (tsup) + editor-vue (vite + vue-tsc) must be built so the docs can
# import their dist (and resolve types). Then prerender the docs.
RUN pnpm --filter @kungal/editor-core build \
 && pnpm --filter @kungal/editor-vue build \
 && pnpm --filter @kungal/editor-docs build

# ---- run: just Node + the self-contained .output ----
FROM node:${NODE_VERSION}-trixie-slim AS run
ENV NODE_ENV=production HOST=0.0.0.0 NITRO_PORT=6899
WORKDIR /app
COPY --from=build /repo/apps/docs/.output ./.output
USER node
EXPOSE 6899
CMD ["node", ".output/server/index.mjs"]
