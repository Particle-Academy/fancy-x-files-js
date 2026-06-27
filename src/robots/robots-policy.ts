type Rule = { type: "allow" | "disallow"; pattern: string };

/**
 * A default-open robots.txt evaluator — the honest implementation a scraper
 * uses to decide whether it may fetch a path.
 *
 * Precedence (matching Google's documented rules):
 *  - The most specific (longest) matching rule wins.
 *  - On a tie between an Allow and a Disallow of equal length, Allow wins.
 *  - Rules from the user-agent-specific group are used if one matches the UA;
 *    otherwise the "*" group applies.
 *  - No matching rule => allowed (default-open). An empty "Disallow:" allows all.
 *
 * Wildcards "*" (any run of characters) and "$" (end-of-path anchor) are honored.
 */
export class RobotsPolicy {
  /** Lowercased user-agent token => ordered rules. */
  private constructor(private readonly groups: Map<string, Rule[]>) {}

  static parse(robotsTxt: string): RobotsPolicy {
    const groups = new Map<string, Rule[]>();

    let currentAgents: string[] = [];
    // Whether we just saw a rule line (so a new User-agent starts a fresh block).
    let sawRule = false;

    for (const rawLine of robotsTxt.split(/\r\n|\r|\n/)) {
      // Strip a trailing "#" comment. Done with indexOf/slice rather than a
      // regex so an externally-fetched robots.txt can't trigger regex
      // backtracking (CodeQL js/polynomial-redos).
      const hash = rawLine.indexOf("#");
      const line = (hash === -1 ? rawLine : rawLine.slice(0, hash)).trim();
      if (line === "") continue;

      const colon = line.indexOf(":");
      if (colon === -1) continue;

      const field = line.slice(0, colon).trim().toLowerCase();
      const value = line.slice(colon + 1).trim();

      if (field === "user-agent") {
        if (sawRule) {
          // A User-agent line after rules begins a new group block.
          currentAgents = [];
          sawRule = false;
        }
        const agent = value.toLowerCase();
        currentAgents.push(agent);
        if (!groups.has(agent)) groups.set(agent, []);
        continue;
      }

      if (field === "allow" || field === "disallow") {
        sawRule = true;
        if (currentAgents.length === 0) {
          // Rule before any User-agent — attribute to "*".
          currentAgents = ["*"];
          if (!groups.has("*")) groups.set("*", []);
        }
        for (const agent of currentAgents) {
          (groups.get(agent) ?? []).push({ type: field, pattern: value });
        }
      }
      // Other fields (Sitemap, Host, Crawl-delay) are irrelevant to access.
    }

    return new RobotsPolicy(groups);
  }

  /** Is `path` fetchable by `userAgent`? Default-open. */
  allowed(path: string, userAgent = "*"): boolean {
    const rules = this.rulesFor(userAgent);

    let bestLen = -1;
    let bestAllow = true; // default-open

    for (const rule of rules) {
      const pattern = rule.pattern;

      // An empty Disallow value means "allow everything" — never matches a path.
      if (pattern === "") continue;
      if (!this.matches(pattern, path)) continue;

      const len = this.specificity(pattern);

      if (len > bestLen) {
        bestLen = len;
        bestAllow = rule.type === "allow";
      } else if (len === bestLen && rule.type === "allow") {
        // Equal specificity: Allow wins.
        bestAllow = true;
      }
    }

    return bestAllow;
  }

  disallowed(path: string, userAgent = "*"): boolean {
    return !this.allowed(path, userAgent);
  }

  /**
   * Resolve the rule set for a user-agent: exact match, else longest matching
   * token (substring of the UA), else the "*" group, else none.
   */
  private rulesFor(userAgent: string): Rule[] {
    const ua = userAgent.toLowerCase();

    const exact = this.groups.get(ua);
    if (exact) return exact;

    // robots.txt UA matching is by substring/prefix of the product token.
    let bestToken: string | null = null;
    let bestLen = -1;
    for (const token of this.groups.keys()) {
      if (token === "*") continue;
      if (token !== "" && ua.includes(token) && token.length > bestLen) {
        bestToken = token;
        bestLen = token.length;
      }
    }

    if (bestToken !== null) return this.groups.get(bestToken) ?? [];

    return this.groups.get("*") ?? [];
  }

  /** Specificity = length of the literal pattern (Google's "longest match"). */
  private specificity(pattern: string): number {
    return pattern.length;
  }

  /**
   * Glob-style match: "*" = any chars, "$" (trailing) = end anchor.
   * A pattern is a prefix match unless anchored with "$".
   */
  private matches(pattern: string, path: string): boolean {
    const anchored = pattern.endsWith("$");
    const core = anchored ? pattern.slice(0, -1) : pattern;

    const regex =
      "^" +
      core
        .split("*")
        .map((part) => escapeRegExp(part))
        .join(".*") +
      (anchored ? "$" : "");

    return new RegExp(regex).test(path);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
