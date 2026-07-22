# AGENTS.md

## Quick Rules

- **Always use `bun`, never `npm`/`yarn`.** `packageManager` is `bun@1.3.14`.
- Engines: `node >= 24`, `bun >= 1.3.0`.
- Workspaces: `packages/**`, `apps/**`, `examples/**` (defined in `package.json`).
- Internal deps use workspace protocol: `"@kumix/other": "workspace:*"`.
- `bun install` runs `prepare` → installs Husky hooks (v9, `.husky/_/`, gitignored).
- `typescript` is pinned via bun catalog (`6.0.3` in `package.json` `workspaces.catalog`). Use `"typescript": "catalog:"` — not a version string — when adding it as a dep.

## Workspace Layout

- `packages/*` — libs: `@kumix/core`, `@kumix/main`, `@kumix/mcp`. All currently `"private": true` (template placeholders) — nothing publishes until you remove that flag.
- `@kumix/main` depends on `@kumix/core` (`workspace:*`) → core must build before main (turbo `^build` handles ordering).
- `@kumix/mcp` is in changeset `ignore` (`.changeset/config.json`) — excluded from versioning even if made public.
- `apps/*` (`docs`, `web`) and `examples/*` (`next`, `vite`) are empty `.gitkeep` placeholders.
- `scripts/publish.sh` only scans `packages/**` for `package.json`, skips `"private": true`, and is **idempotent** — skips versions already on the registry (`npm view`). Runs `changeset tag` after publishing.

## Commands

```bash
bun install                 # also installs husky hooks
bun run build               # turbo build (dependsOn: ^build)
bun run types:check         # turbo types:check (dependsOn: ^build)
bun run lint                # biome check (root-level, NOT turbo)
bun run lint:fix            # biome check --write --unsafe
bun run format              # biome format --write
bun run dev                 # turbo dev (persistent)
bun run test                # turbo test (vitest run per package)
bun run test:watch          # turbo test:watch (persistent)
bun run test:coverage       # turbo test:coverage (vitest run --coverage)
bun run clean               # turbo clean
bun run clean:all           # turbo clean:all && rm -rf .turbo bun.lock .husky/_ node_modules
bunx changeset              # create a changeset
bun run version             # changeset version && bun update
bun run release             # bash scripts/publish.sh (packages/** only, not apps/ or examples/)
```

Filter to a single workspace:

```bash
bun run build --filter=@kumix/core
bun run types:check --filter=@kumix/main
bun run test --filter=@kumix/core
bun add <pkg> --filter=@kumix/core
```

## Package Build & Test Quirks

- `@kumix/core` and `@kumix/main`: `build` = `tsc -p tsconfig.build.json`, `types:check` = `tsc --noEmit -p tsconfig.json`. Both configs exclude `test/` and `dist/`; the only real difference is emit vs no-emit. Both extend external `@kumix/tsconfig/node`, output to `dist/`.
- `@kumix/main` has no `tsconfig.build.json` of its own beyond the same pattern — when editing, keep both `tsconfig.json` and `tsconfig.build.json` in sync.
- `@kumix/mcp` is structurally different: `build` = plain `tsc` (no `tsconfig.build.json`), `dev` = `bun src/index.ts`, `start` = `node dist/index.js`, `test` = `node dist/index.js --test` (**requires `build` first**; the `--test` flag short-circuits the MCP server in `src/index.ts`). No vitest, no coverage config.
- Vitest (core + main only): `test/**/*.test.ts`, `globals: true`, node env. Coverage thresholds enforced: **lines 90%, branches 85%** — dropping below fails `test:coverage`.

## Pipeline (turbo.json)

- `build`, `types:check`, `test`, `test:coverage` all depend on `^build` (upstream packages build first).
- `dev`, `start`, `test:watch` are persistent (long-running, not cached).
- `clean`/`clean:all` not cached.
- `build`/`test`/`test:coverage` inputs include `.env*` — env file changes bust the cache.
- `test`/`test:coverage` pass through `NODE_ENV` and `CI`.
- `lint`/`format`/`lint:fix` run Biome directly at root, NOT via turbo.

## Pre-commit Hooks (Husky v9)

- `pre-commit` → `bunx lint-staged`:
  - `*.{js,jsx,ts,tsx,cjs,mjs,cts,mts}` → `biome check --write --no-errors-on-unmatched`
  - `*.{md,yml,yaml}` → `prettier --write`
  - `*.{json,jsonc,html}` → `biome format --write --no-errors-on-unmatched`
- `commit-msg` → `commitlint --edit`.

## Commit Convention

Commitlint enforces types: `feat`, `feature`, `fix`, `refactor`, `docs`, `build`, `test`, `ci`, `chore` (`.commitlintrc.cjs`). Format: `type(scope?): message`.

## Changesets

- Repo: `kumixlabs/template`.
- `commit: false` — changeset PRs are auto-committed by CI, not locally.
- `access: public`, `baseBranch: main`, `bumpVersionsWithWorkspaceProtocolOnly: true`.
- `ignore: ["@kumix/mcp"]`, `updateInternalDependencies: "patch"`.

## CI

- **Lint** (`.github/workflows/lint.yml`): PRs to `main` → `bun install --frozen-lockfile` → build → lint → types:check → test.
- **Release** (`.github/workflows/release.yml`): push to `main` touching `.changeset/**` or `packages/**` → same checks → `changesets/action@v1` (version PR or publish). Git user set manually (`setupGitUser: false`). Uses `GH_PAT || GITHUB_TOKEN` and `NPM_TOKEN`.

## Other

- Biome extends `@kumix/biome-config/base` (`biome.jsonc`).
- `CLAUDE.md` points here as the single source of truth — keep both in sync.
- CodeRabbit auto-reviews PRs to `main`, `canary`, `fix/*`, `chore/*`, `feat/*` (`.coderabbit.yaml`).
- Dependabot: weekly npm (root + per-package) and github-actions updates; commit prefixes `build(deps)`, `build(deps-dev)`, `ci(deps)`.
