import type { WellKnownFile } from "../well-known-file.js";

type AgentsLine = { label: string; value: string };

/** JSON-friendly config accepted by {@link AgentsTxt.fromArray}. */
export interface AgentsTxtConfig {
  title?: string;
  path?: string;
  intro?: string;
  capabilities?: string | string[];
  contact?: string | string[];
  policy?: string;
  lines?: Array<{ label?: string; value?: string }>;
}

/**
 * Builder for an agents / AI manifest — the llms.txt-adjacent file that tells
 * autonomous agents what they may do, how to identify themselves, and where the
 * policy lives. Served at /ai.txt by default; the path is configurable so a host
 * can also expose it at /.well-known/agents.md.
 */
export class AgentsTxt implements WellKnownFile {
  private titleValue: string;
  private introValue: string | null = null;
  private pathValue = "/ai.txt";
  private lines: AgentsLine[] = [];

  constructor(title = "Agent manifest") {
    this.titleValue = title;
  }

  static make(title = "Agent manifest"): AgentsTxt {
    return new AgentsTxt(title);
  }

  static fromArray(config: AgentsTxtConfig): AgentsTxt {
    const agents = new AgentsTxt(config.title ?? "Agent manifest");
    if (config.path !== undefined) agents.at(config.path);
    if (config.intro !== undefined) agents.intro(config.intro);
    for (const c of asArray(config.capabilities)) agents.capability(c);
    for (const c of asArray(config.contact)) agents.contact(c);
    if (config.policy !== undefined) agents.policy(config.policy);
    for (const line of config.lines ?? []) {
      agents.line(line.label ?? "", line.value ?? "");
    }
    return agents;
  }

  /** Set the serving path (e.g. "/ai.txt" or "/.well-known/agents.md"). */
  at(path: string): this {
    this.pathValue = "/" + path.replace(/^\/+/, "");
    return this;
  }

  path(): string {
    return this.pathValue;
  }

  contentType(): string {
    return "text/markdown";
  }

  title(title: string): this {
    this.titleValue = title;
    return this;
  }

  intro(intro: string): this {
    this.introValue = intro;
    return this;
  }

  line(label: string, value: string): this {
    this.lines.push({ label, value });
    return this;
  }

  capability(...values: string[]): this {
    for (const v of values) this.line("Capability", v);
    return this;
  }

  contact(...values: string[]): this {
    for (const v of values) this.line("Contact", v);
    return this;
  }

  policy(url: string): this {
    return this.line("Policy", url);
  }

  render(): string {
    const out: string[] = [];
    out.push("# " + this.titleValue);

    if (this.introValue !== null && this.introValue !== "") {
      out.push("");
      out.push(this.introValue);
    }

    if (this.lines.length > 0) {
      out.push("");
      for (const line of this.lines) {
        out.push("- " + line.label + ": " + line.value);
      }
    }

    return out.join("\n") + "\n";
  }

  validate(): string[] {
    if (this.titleValue.trim() === "") {
      return ["agents manifest requires a title"];
    }
    return [];
  }
}

function asArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
