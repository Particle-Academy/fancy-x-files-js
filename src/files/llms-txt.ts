import type { WellKnownFile } from "../well-known-file.js";

export interface LlmsLink {
  title: string;
  url: string;
  notes?: string;
}

type LlmsSection = { name: string; links: LlmsLink[] };

/** JSON-friendly config accepted by {@link LlmsTxt.fromArray}. */
export interface LlmsTxtConfig {
  title?: string;
  summary?: string;
  details?: string;
  sections?: Array<{ name?: string; links?: LlmsLink[] }>;
}

/**
 * Builder for /llms.txt (the llms.txt markdown convention): an H1 title, an
 * optional summary blockquote, free-form details, then sections of curated
 * links.
 */
export class LlmsTxt implements WellKnownFile {
  private titleValue: string;
  private summaryValue: string | null = null;
  private detailsValue: string | null = null;
  private sections: LlmsSection[] = [];

  constructor(title = "") {
    this.titleValue = title;
  }

  static make(title = ""): LlmsTxt {
    return new LlmsTxt(title);
  }

  static fromArray(config: LlmsTxtConfig): LlmsTxt {
    const llms = new LlmsTxt(config.title ?? "");
    if (config.summary !== undefined) llms.summary(config.summary);
    if (config.details !== undefined) llms.details(config.details);

    for (const section of config.sections ?? []) {
      const links = (section.links ?? []).map((l) => {
        const link: LlmsLink = { title: l.title ?? "", url: l.url ?? "" };
        if (l.notes !== undefined) link.notes = l.notes;
        return link;
      });
      llms.section(section.name ?? "", links);
    }

    return llms;
  }

  path(): string {
    return "/llms.txt";
  }

  contentType(): string {
    return "text/markdown";
  }

  title(title: string): this {
    this.titleValue = title;
    return this;
  }

  summary(summary: string): this {
    this.summaryValue = summary;
    return this;
  }

  details(details: string): this {
    this.detailsValue = details;
    return this;
  }

  section(name: string, links: LlmsLink[]): this {
    this.sections.push({ name, links });
    return this;
  }

  render(): string {
    const out: string[] = [];
    out.push("# " + this.titleValue);

    if (this.summaryValue !== null && this.summaryValue !== "") {
      out.push("");
      out.push("> " + this.summaryValue);
    }

    if (this.detailsValue !== null && this.detailsValue !== "") {
      out.push("");
      out.push(this.detailsValue);
    }

    for (const section of this.sections) {
      out.push("");
      out.push("## " + section.name);
      out.push("");
      for (const link of section.links) {
        let line = `- [${link.title}](${link.url})`;
        if (link.notes !== undefined && link.notes !== "") {
          line += ": " + link.notes;
        }
        out.push(line);
      }
    }

    return out.join("\n") + "\n";
  }

  validate(): string[] {
    const issues: string[] = [];

    if (this.titleValue.trim() === "") {
      issues.push("llms.txt requires a title (H1)");
    }

    for (const section of this.sections) {
      for (const link of section.links) {
        if ((link.url ?? "") === "") {
          issues.push(
            `llms.txt link "${link.title ?? ""}" in section "${section.name}" has no url`,
          );
        }
      }
    }

    return issues;
  }
}
