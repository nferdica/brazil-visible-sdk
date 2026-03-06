# Brazil Visible SDK — Claude Code Instructions

> Para visao completa do projeto, arquitetura e plano de implementacao, consulte [AGENTS.md](./AGENTS.md).

## Project Overview
TypeScript SDK for unified access to 93+ Brazilian public data sources. Wraps REST APIs, CSV downloads, FTP archives and geospatial services behind a single `import { ibge, bcb } from '@brazilvisible/sdk'` interface.

## Key Commands
- `npm install` — install dependencies
- `npm run build` — build with tsup (ESM + CJS + declarations)
- `npm run dev` — watch mode for development
- `npm test` — run tests (vitest)
- `npm run test:watch` — run tests in watch mode
- `npm run lint` — lint with biome
- `npm run format` — format with biome
- `npm run typecheck` — type check with tsc --noEmit

## Tech Stack
- **Language**: TypeScript >=5.5 (strict mode)
- **Runtime**: Node.js >=18 (native fetch)
- **HTTP**: native fetch (zero deps)
- **Build**: tsup (ESM + CJS + .d.ts)
- **Test**: vitest + msw (Mock Service Worker)
- **Lint/Format**: biome
- **CSV**: csv-parse (for download sources)

## Project Structure
- `src/` — main source code
- `src/sources/` — one module per source group (ibge.ts, bcb.ts, cgu.ts, etc.)
- `src/client.ts` — shared HTTP client (fetch + retry + rate limiting)
- `src/types.ts` — shared types
- `src/errors.ts` — error hierarchy
- `src/download.ts` — download + decompression utilities
- `src/cache.ts` — local response/download cache
- `src/parsers.ts` — format parsers (CSV, JSON, XML)
- `src/config.ts` — global configuration (API keys, timeouts)
- `tests/` — vitest test suite
- `examples/` — usage examples

## Conventions
- Code language: English (function names, variables, JSDoc)
- Public docs language: PT-BR (README, examples, user-facing error messages)
- Commits: conventional commits in English (feat:, fix:, docs:, test:)
- Branches: `main` = releases, `develop` = development
- Code style: biome, double quotes, semicolons, 2-space indent
- Naming: camelCase functions/vars, PascalCase types/classes, kebab-case files
- Type safety: strict mode, no explicit `any`
- Every source module must implement the `Source` abstract class from `base.ts`
- All API responses return typed arrays `T[]` by default
- Tests must use mocked fetch (msw), never real network calls in unit tests
- Integration tests use `.integration.test.ts` suffix

## Adding a New Source
1. Create `src/sources/<name>.ts`
2. Implement `Source` subclass with typed methods
3. Re-export from `src/index.ts`
4. Add tests in `tests/sources/<name>.test.ts`
5. Add example in `examples/`
6. Run: `npm run lint`, `npm run typecheck`, `npm test`
7. Commit: `feat: add <source> module`
