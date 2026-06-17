import type { WellKnownFile } from "../well-known-file.js";

export interface SitemapUrlOptions {
  lastmod?: string;
  changefreq?: string;
  priority?: string | number;
}

type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
};

/** JSON-friendly config accepted by {@link Sitemap.fromArray}. */
export interface SitemapConfig {
  urls?: Array<{
    loc?: string;
    lastmod?: string;
    changefreq?: string;
    priority?: string | number;
  }>;
}

/** Builder for /sitemap.xml — a sitemaps.org <urlset> of URL entries. */
export class Sitemap implements WellKnownFile {
  private urls: SitemapEntry[] = [];

  static make(): Sitemap {
    return new Sitemap();
  }

  static fromArray(config: SitemapConfig): Sitemap {
    const sitemap = new Sitemap();
    for (const url of config.urls ?? []) {
      sitemap.url(url.loc ?? "", {
        lastmod: url.lastmod,
        changefreq: url.changefreq,
        priority: url.priority,
      });
    }
    return sitemap;
  }

  path(): string {
    return "/sitemap.xml";
  }

  contentType(): string {
    return "application/xml";
  }

  url(loc: string, options: SitemapUrlOptions = {}): this {
    const entry: SitemapEntry = { loc };
    if (options.lastmod !== undefined) entry.lastmod = options.lastmod;
    if (options.changefreq !== undefined) entry.changefreq = options.changefreq;
    if (options.priority !== undefined) entry.priority = String(options.priority);
    this.urls.push(entry);
    return this;
  }

  render(): string {
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

    for (const url of this.urls) {
      lines.push("  <url>");
      lines.push("    <loc>" + escapeXml(url.loc) + "</loc>");
      if (url.lastmod !== undefined) {
        lines.push("    <lastmod>" + escapeXml(url.lastmod) + "</lastmod>");
      }
      if (url.changefreq !== undefined) {
        lines.push("    <changefreq>" + escapeXml(url.changefreq) + "</changefreq>");
      }
      if (url.priority !== undefined) {
        lines.push("    <priority>" + escapeXml(url.priority) + "</priority>");
      }
      lines.push("  </url>");
    }

    lines.push("</urlset>");
    return lines.join("\n") + "\n";
  }

  validate(): string[] {
    const issues: string[] = [];

    if (this.urls.length === 0) {
      issues.push("sitemap.xml has no URLs");
    }

    this.urls.forEach((url, i) => {
      if ((url.loc ?? "") === "") {
        issues.push(`sitemap.xml url #${i + 1} is missing <loc>`);
      }
    });

    return issues;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
