import type { WellKnownFile } from "./well-known-file.js";

/**
 * The single source of truth: a set of {@link WellKnownFile} instances keyed by
 * path.
 *
 * Apps register their well-known files into one Registry and everything else —
 * routing, rendering, validation — reads from it, so robots.txt and friends are
 * defined once and served consistently.
 */
export class Registry {
  private files = new Map<string, WellKnownFile>();

  add(file: WellKnownFile): this {
    this.files.set(file.path(), file);
    return this;
  }

  get(path: string): WellKnownFile | null {
    return this.files.get(this.normalize(path)) ?? null;
  }

  has(path: string): boolean {
    return this.files.has(this.normalize(path));
  }

  all(): WellKnownFile[] {
    return [...this.files.values()];
  }

  paths(): string[] {
    return [...this.files.keys()];
  }

  render(path: string): string | null {
    return this.get(path)?.render() ?? null;
  }

  /**
   * Validate every registered file. Returns a map of path => issues, containing
   * only the files that have issues. An empty object means all valid; an empty
   * registry reports a single `""` key.
   */
  validate(): Record<string, string[]> {
    if (this.files.size === 0) {
      return { "": ["registry is empty: no well-known files registered"] };
    }

    const issues: Record<string, string[]> = {};
    for (const [path, file] of this.files) {
      const fileIssues = file.validate();
      if (fileIssues.length > 0) {
        issues[path] = fileIssues;
      }
    }
    return issues;
  }

  /** Normalize a path so "robots.txt" and "/robots.txt" resolve identically. */
  private normalize(path: string): string {
    return "/" + path.replace(/^\/+/, "");
  }
}
