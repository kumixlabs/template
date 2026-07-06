# Bun Package Template

**A minimal, production-ready Bun monorepo template for building and publishing TypeScript/Node packages.**

This template provides a ready-to-use setup for multi-package repositories with Bun as the package manager, Turborepo for task orchestration, Biome for linting/formatting, Changesets for versioning and releases, and GitHub Actions for CI.

## Features

- Monorepo workspaces: `packages/**`, `apps/**`, `examples/**`
- Bun-first workflows: `bun install`, `bun run <script>`
- Turborepo pipelines for `dev`, `build`, `start`, `types:check`, `test`, `test:watch`, `test:coverage`, `clean`
- Biome-based lint and format with consistent project style
- Vitest for unit testing with coverage thresholds
- Versioning and publishing via Changesets
- CI workflows for linting and releases

## Getting Started

```bash
# Install dependencies
bun install

# Development
bun run dev

# Build all workspaces
bun run build

# Type-check
bun run types:check

# Lint (check)
bun run lint

# Lint (auto-fix)
bun run lint:fix

# Format code
bun run format

# Run tests
bun run test

# Run tests with coverage
bun run test:coverage

# Watch mode tests
bun run test:watch

# Clean build artifacts
bun run clean

# Deep clean (removes node_modules, lockfile, etc.)
bun run clean:all
```

## Workspace Layout

- `packages/` – Each published or internal package lives here
- `apps/` – Applications (e.g., docs, demos) consuming packages
- `examples/` – Example implementations (e.g., Next.js, Vite)

Example package structure:

```
packages/your-package/
├── src/
│   ├── index.ts
│   └── ...
├── package.json
├── tsconfig.json  # builds with tsc
└── README.md
```

## Releases

This template uses Changesets.

```bash
# Create a changeset describing your changes
bunx changeset

# Version packages (CI will also do this)
bun run version

# Publish updated packages (CI release workflow)
bun run release
```

Ensure `NPM_TOKEN` is configured in CI for publishing.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) and follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

Please report vulnerabilities privately as described in [SECURITY.md](./SECURITY.md). Replace the contact email with your own when using this template.

## License

MIT License – see [LICENSE](./LICENSE).

By contributing to this template, you agree that your contributions will be licensed under the MIT License.
