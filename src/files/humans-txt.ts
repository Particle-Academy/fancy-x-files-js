import type { WellKnownFile } from "../well-known-file.js";

export interface HumansEntry {
  label: string;
  value: string;
}

type HumansSection = { name: string; entries: HumansEntry[] };

/** JSON-friendly config accepted by {@link HumansTxt.fromArray}. */
export interface HumansTxtConfig {
  sections?: Array<{
    name?: string;
    /** Either a label=>value map, or a list of {label, value} entries. */
    entries?: Record<string, string> | HumansEntry[];
  }>;
}

/**
 * Builder for /humans.txt — simple sections (TEAM, THANKS, SITE) of
 * `label: value` lines.
 */
export class HumansTxt implements WellKnownFile {
  private sections: HumansSection[] = [];

  static make(): HumansTxt {
    return new HumansTxt();
  }

  static fromArray(config: HumansTxtConfig): HumansTxt {
    const humans = new HumansTxt();

    for (const section of config.sections ?? []) {
      const entries: HumansEntry[] = [];
      const raw = section.entries ?? {};
      if (Array.isArray(raw)) {
        for (const e of raw) {
          entries.push({ label: String(e.label), value: String(e.value ?? "") });
        }
      } else {
        for (const [label, value] of Object.entries(raw)) {
          entries.push({ label: String(label), value: String(value) });
        }
      }
      humans.section(section.name ?? "", entries);
    }

    return humans;
  }

  path(): string {
    return "/humans.txt";
  }

  contentType(): string {
    return "text/plain";
  }

  section(name: string, entries: HumansEntry[]): this {
    this.sections.push({ name, entries });
    return this;
  }

  line(sectionName: string, label: string, value: string): this {
    const existing = this.sections.find((s) => s.name === sectionName);
    if (existing) {
      existing.entries.push({ label, value });
      return this;
    }
    return this.section(sectionName, [{ label, value }]);
  }

  render(): string {
    const out: string[] = [];

    this.sections.forEach((section, index) => {
      if (index > 0) out.push("");
      out.push("/* " + section.name + " */");
      for (const entry of section.entries) {
        out.push(entry.label + ": " + entry.value);
      }
    });

    return out.join("\n") + "\n";
  }

  validate(): string[] {
    if (this.sections.length === 0) {
      return ["humans.txt has no sections"];
    }
    return [];
  }
}
