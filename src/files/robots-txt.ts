import type { WellKnownFile } from "../well-known-file.js";
import { RobotsPolicy } from "../robots/robots-policy.js";

type RobotsRule = { type: "allow" | "disallow"; path: string };

type RobotsGroup = {
  agents: string[];
  rules: RobotsRule[];
  crawlDelay?: number;
};

/** JSON-friendly config accepted by {@link RobotsTxt.fromArray}. */
export interface RobotsTxtConfig {
  groups?: Array<{
    userAgent?: string | string[];
    user_agent?: string | string[];
    allow?: string | string[];
    disallow?: string | string[];
    crawlDelay?: number;
    crawl_delay?: number;
  }>;
  sitemaps?: string[];
  host?: string;
  protect?: string[];
}

/**
 * Fluent, JSON-friendly builder for robots.txt.
 *
 * Output contract: one block per group (its `User-agent:` lines followed by the
 * group's ordered `Allow:` / `Disallow:` rules), then any `Host:` line, then all
 * `Sitemap:` lines at the end.
 *
 * Leak guarantee: {@link RobotsTxt.protect} appends a Disallow to EVERY group
 * (current and future) and refuses to ever emit an Allow for a protected path.
 * So an admin path registered via protect() can never be Allowed for one bot by
 * accident — the motivating robots.txt leak bug becomes structurally impossible.
 */
export class RobotsTxt implements WellKnownFile {
  private groups: RobotsGroup[] = [];
  private sitemaps: string[] = [];
  private hostValue: string | null = null;
  /** Paths force-disallowed across every group. */
  private protectedPaths: string[] = [];
  /** Index of the group most recently targeted by userAgent(), for chaining. */
  private cursor: number | null = null;

  static make(): RobotsTxt {
    return new RobotsTxt();
  }

  /**
   * Build from a JSON-friendly object. Shape:
   * {
   *   groups: [{ userAgent: '*'|[...], allow: [...], disallow: [...], crawlDelay }],
   *   sitemaps: [...], host: '...', protect: [...],
   * }
   */
  static fromArray(config: RobotsTxtConfig): RobotsTxt {
    const robots = new RobotsTxt();

    for (const group of config.groups ?? []) {
      const agents = group.userAgent ?? group.user_agent ?? "*";
      robots.userAgent(agents);
      for (const path of asArray(group.disallow)) robots.disallow(path);
      for (const path of asArray(group.allow)) robots.allow(path);
      const delay = group.crawlDelay ?? group.crawl_delay;
      if (delay !== undefined) robots.crawlDelay(delay);
    }

    for (const url of config.sitemaps ?? []) robots.sitemap(url);
    if (config.host !== undefined) robots.host(config.host);
    for (const path of config.protect ?? []) robots.protect(path);

    return robots;
  }

  path(): string {
    return "/robots.txt";
  }

  contentType(): string {
    return "text/plain";
  }

  /** Start (or re-target) a group for one or more user-agents. */
  userAgent(agents: string | string[]): this {
    let list = (Array.isArray(agents) ? agents : [agents]).map(String);
    if (list.length === 0) list = ["*"];

    const rules: RobotsRule[] = this.protectedPaths.map((p) => ({
      type: "disallow",
      path: p,
    }));

    this.groups.push({ agents: list, rules });
    this.cursor = this.groups.length - 1;
    return this;
  }

  /** Alias reading naturally as `.forAgent(...)`. */
  forAgent(agents: string | string[]): this {
    return this.userAgent(agents);
  }

  disallow(...paths: string[]): this {
    const group = this.ensureGroup();
    for (const path of paths) {
      this.groups[group]!.rules.push({ type: "disallow", path });
    }
    return this;
  }

  allow(...paths: string[]): this {
    const group = this.ensureGroup();
    for (const path of paths) {
      // A protected path can never be Allowed — silently dropped so a
      // copy-pasted allow list can't reopen /admin for one bot.
      if (this.isProtected(path)) continue;
      this.groups[group]!.rules.push({ type: "allow", path });
    }
    return this;
  }

  crawlDelay(seconds: number): this {
    const group = this.ensureGroup();
    this.groups[group]!.crawlDelay = seconds;
    return this;
  }

  disallowAll(): this {
    return this.disallow("/");
  }

  allowAll(): this {
    // An empty Disallow value is the canonical "allow everything".
    const group = this.ensureGroup();
    this.groups[group]!.rules.push({ type: "disallow", path: "" });
    return this;
  }

  /**
   * Protect one or more paths: add a Disallow to EVERY group — those already
   * defined and any added later — and bar them from ever being Allowed. This is
   * how an admin path is kept out of every bot's Allow list.
   */
  protect(...paths: string[]): this {
    for (const path of paths) {
      if (path === "" || this.protectedPaths.includes(path)) continue;
      this.protectedPaths.push(path);

      for (const group of this.groups) {
        // Drop any existing Allow for this path…
        group.rules = group.rules.filter(
          (rule) => !(rule.type === "allow" && rule.path === path),
        );
        // …and ensure a Disallow exists.
        const hasDisallow = group.rules.some(
          (rule) => rule.type === "disallow" && rule.path === path,
        );
        if (!hasDisallow) {
          group.rules.unshift({ type: "disallow", path });
        }
      }
    }
    return this;
  }

  sitemap(url: string): this {
    if (!this.sitemaps.includes(url)) this.sitemaps.push(url);
    return this;
  }

  host(host: string): this {
    this.hostValue = host;
    return this;
  }

  render(): string {
    const lines: string[] = [];

    if (this.groups.length === 0) {
      // A useful, safe default: allow everyone everything.
      lines.push("User-agent: *");
      lines.push("Disallow:");
    }

    this.groups.forEach((group, index) => {
      if (index > 0) lines.push("");
      for (const agent of group.agents) lines.push("User-agent: " + agent);
      for (const rule of group.rules) {
        const label = rule.type === "allow" ? "Allow" : "Disallow";
        lines.push(label + ": " + rule.path);
      }
      if (group.crawlDelay !== undefined) {
        lines.push("Crawl-delay: " + group.crawlDelay);
      }
    });

    if (this.hostValue !== null) {
      lines.push("");
      lines.push("Host: " + this.hostValue);
    }

    if (this.sitemaps.length > 0) {
      lines.push("");
      for (const url of this.sitemaps) lines.push("Sitemap: " + url);
    }

    return lines.join("\n") + "\n";
  }

  /**
   * Round-trip: get a {@link RobotsPolicy} evaluator for the rendered file, so
   * the same source of truth answers "may a scraper fetch this?".
   */
  policy(): RobotsPolicy {
    return RobotsPolicy.parse(this.render());
  }

  validate(): string[] {
    const issues: string[] = [];

    if (this.groups.length === 0) {
      issues.push("robots.txt has no user-agent groups");
    }

    for (const group of this.groups) {
      if (group.agents.length === 0) {
        issues.push("a robots.txt group has no User-agent");
      }
    }

    // Defensive: a protected path must never surface as an Allow.
    for (const group of this.groups) {
      for (const rule of group.rules) {
        if (rule.type === "allow" && this.isProtected(rule.path)) {
          issues.push(`protected path "${rule.path}" leaked into an Allow rule`);
        }
      }
    }

    return issues;
  }

  private ensureGroup(): number {
    if (this.cursor === null) this.userAgent("*");
    return this.cursor ?? this.groups.length - 1;
  }

  private isProtected(path: string): boolean {
    return this.protectedPaths.includes(path);
  }
}

function asArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
