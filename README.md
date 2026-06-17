# @particle-academy/fancy-x-files

The Node/TypeScript mirror of the PHP **particle-academy/fancy-x-files**.

Headless manager for the **well-known files** every modern web app owes both
bots *and* agents — `robots.txt`, `.well-known/security.txt`, `llms.txt`,
`humans.txt`, `sitemap.xml`, and an agents/AI manifest (`ai.txt`). Define them
**once** in code, serve them consistently from any host, and validate them in CI.

- **Zero runtime dependencies.** Pure, isomorphic TypeScript — runs in Node,
  edge runtimes / workers, Next.js route handlers, and Astro endpoints alike.
- **A default-open robots evaluator** (`RobotsPolicy`) so your scraper can
  *honor* a target site's robots.txt with correct precedence.
- **A leak-proof `robots.txt` builder.** `protect('/admin')` makes it
  *structurally impossible* to accidentally `Allow:` a protected path for one
  bot. (See the guarantee below — the bug this package was born from.)

## Install

```bash
npm install @particle-academy/fancy-x-files
```

## Build the files

Each file is a small fluent builder implementing `WellKnownFile`
(`path()`, `contentType()`, `render()`, `validate()`). Collect them in a
`Registry` — the single source of truth.

```ts
import {
  Registry,
  RobotsTxt,
  SecurityTxt,
  LlmsTxt,
} from "@particle-academy/fancy-x-files";

const registry = new Registry();

registry.add(
  RobotsTxt.make()
    .userAgent("*").disallow("/").allowAll()
    .userAgent("GPTBot").allow("/")        // be generous to the AI bot…
    .protect("/admin", "/internal")        // …but /admin can NEVER leak
    .sitemap("https://example.com/sitemap.xml"),
);

registry.add(
  SecurityTxt.make()
    .contact("mailto:security@example.com")
    .expires(new Date("2099-01-01"))       // required, must be future
    .policy("https://example.com/security-policy"),
);

registry.add(
  LlmsTxt.make("Example")
    .summary("Machine-readable index of this site for LLMs.")
    .section("Docs", [
      { title: "Getting started", url: "https://example.com/docs", notes: "start here" },
      { title: "API reference", url: "https://example.com/api" },
    ]),
);

console.log(registry.render("/robots.txt"));
```

Renders:

```
User-agent: *
Disallow: /internal
Disallow: /admin
Disallow: /
Disallow:

User-agent: GPTBot
Disallow: /internal
Disallow: /admin
Allow: /

Sitemap: https://example.com/sitemap.xml
```

Every group — including the permissive `GPTBot` one — carries a `Disallow:` for
each protected path, and `/admin` never appears as an `Allow`.

Other builders: `HumansTxt`, `Sitemap` (valid `<urlset>` XML), `AgentsTxt`
(served at `/ai.txt`, or `.at("/.well-known/agents.md")`). Every builder also
has a JSON-friendly `fromArray(config)` for agent-emittable construction.

## The `/admin` can't leak — guaranteed

The motivating bug: a hand-rolled `robots.txt` listed permissive per-AI-bot
`Allow:` blocks and `/admin` slipped into one of them, exposing it to a crawler.

`RobotsTxt.protect(...paths)` makes that impossible:

- It adds a `Disallow:` for each protected path to **every** group — those
  already defined **and** any group added later.
- It **drops** any existing `Allow:` for a protected path and **refuses** to add
  new ones (`.allow("/admin")` after `.protect("/admin")` is a silent no-op).
- `validate()` flags any protected path that somehow surfaced as an `Allow`.

So even a copy-pasted "allow everything" block for `GPTBot` can't reopen
`/admin`. The robots **precedence rule** (longest match wins; `Allow` beats
`Disallow` at equal length) means a blanket `Allow: /` would otherwise override
a shorter `Disallow` — `protect()` adds an equally-or-more specific `Disallow`
to neutralize that, and the evaluator (`robots.policy()`) agrees.

## Scraper side: honor a target's robots.txt

Use `RobotsPolicy` (or the `HonorsRobots` guard) so your crawler obeys robots
correctly and **default-open** (no matching rule ⇒ allowed):

```ts
import { RobotsPolicy, HonorsRobots } from "@particle-academy/fancy-x-files";

const policy = RobotsPolicy.parse(targetRobotsTxt);
if (policy.allowed("/some/page", "MyCrawler")) {
  // fetch it
}

// one-shot guard, framework-free:
HonorsRobots.allows(targetRobotsTxt, "/some/page", "MyCrawler"); // boolean
```

Precedence implemented: most-specific (longest) matching rule wins; `Allow`
beats `Disallow` at equal specificity (Google's rule); a UA-specific group
overrides `*`; `*` and trailing `$` wildcards are honored.

## Serve helpers (Node / Next / Astro / workers)

Framework-agnostic. `wellKnownResponse` returns a plain object (or `null` so the
host can 404); `toResponse` returns a Web-standard `Response`.

```ts
import { toResponse, wellKnownResponse } from "@particle-academy/fancy-x-files";

// Next.js App Router — app/[...file]/route.ts
export function GET(_req: Request, { params }: { params: { file: string[] } }) {
  const res = toResponse(registry, "/" + params.file.join("/"));
  return res ?? new Response("Not found", { status: 404 });
}

// Astro endpoint — src/pages/robots.txt.ts
export function GET() {
  return toResponse(registry, "/robots.txt")!;
}

// Plain Node http handler
const res = wellKnownResponse(registry, req.url ?? "/");
if (res === null) {
  serverRes.writeHead(404).end("Not found");
} else {
  serverRes.writeHead(res.status, res.headers).end(res.body);
}
```

## Validate everything in CI

```ts
const issues = registry.validate(); // Record<path, string[]>, empty => all valid
if (Object.keys(issues).length > 0) {
  console.error(issues);
  process.exit(1);
}
```

- `SecurityTxt`: requires ≥1 `Contact` and a future `Expires` (RFC 3339).
- `Sitemap`: every URL needs a `<loc>`.
- `RobotsTxt`: needs at least one group; flags a leaked protected `Allow`.
- `LlmsTxt` / `AgentsTxt`: require a title.

## License

MIT.
