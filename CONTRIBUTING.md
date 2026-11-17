# Contributing to @particle-academy/fancy-x-files

Notes for anyone, human or agent, working ON this package's code. How to USE the
package is in [AGENTS.md](./AGENTS.md); what it is, is in [README.md](./README.md).
`CLAUDE.md` is a symlink to this file, so Claude Code reads these notes when it
works in this repo.

This is the Node / TypeScript mirror of the PHP `particle-academy/fancy-x-files`.

## Layout

- `src/well-known-file.ts` — the `WellKnownFile` contract (`path()`,
  `contentType()`, `render()`, `validate()`).
- `src/files/` — the builders: `robots-txt`, `security-txt`, `llms-txt`,
  `humans-txt`, `sitemap`, `agents-txt`, each with a `fromArray(config)`.
- `src/registry.ts` — the `Registry`.
- `src/robots/` — `RobotsPolicy` (the default-open evaluator) and `HonorsRobots`.
- `src/serve.ts` — `wellKnownResponse` / `toResponse`.
- `tests/` — vitest suites.

Zero runtime dependencies, and isomorphic: it must keep running in Node, edge
runtimes / workers, Next.js route handlers and Astro endpoints.

## Build and test

```bash
npm run build   # tsup
npm run lint    # tsc --noEmit
npm test        # vitest run
```

## Changelog

Update `CHANGELOG.md` in the same commit as the change.
