# Contributing to supabase-vector-gmailkb-rag

## Package Management

- Use [pnpm](https://pnpm.io/) for all Node.js dependencies.
- Install dependencies: `pnpm install`
- Add a package: `pnpm add <package>`
- Add a dev dependency: `pnpm add -D <package>`

## Conventional Commits

- All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) standard.
- Example: `chore(build): add pnpm config, Prettier, Vitest, and CI workflow`

## CI Requirements

- All PRs must pass CI before merging.
- CI runs formatting, linting, type checks, and tests.
- Format code: `pnpm run format`
- Run tests: `pnpm test`

## Deno & TypeScript

- Use Deno for Edge Functions and scripts.
- TypeScript config is in `tsconfig.json` and `deno.json`.

## Prettier

- Code formatting is enforced with Prettier. See `.prettierrc.json`.

## Questions?

- Open an issue or contact @bjornmelin.
