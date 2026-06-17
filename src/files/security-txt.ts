import type { WellKnownFile } from "../well-known-file.js";

/** JSON-friendly config accepted by {@link SecurityTxt.fromArray}. */
export interface SecurityTxtConfig {
  contact?: string | string[];
  expires?: Date | string;
  encryption?: string | string[];
  acknowledgments?: string | string[];
  preferredLanguages?: string | string[];
  preferred_languages?: string | string[];
  canonical?: string;
  policy?: string;
  hiring?: string;
}

/**
 * Builder for /.well-known/security.txt (RFC 9116).
 *
 * Required: at least one Contact and an Expires in the future.
 */
export class SecurityTxt implements WellKnownFile {
  private contacts: string[] = [];
  private expiresAt: Date | null = null;
  private encryptions: string[] = [];
  private acknowledgmentsList: string[] = [];
  private preferredLanguages: string[] = [];
  private canonicalValue: string | null = null;
  private policyValue: string | null = null;
  private hiringValue: string | null = null;

  static make(): SecurityTxt {
    return new SecurityTxt();
  }

  static fromArray(config: SecurityTxtConfig): SecurityTxt {
    const sec = new SecurityTxt();

    for (const c of asArray(config.contact)) sec.contact(c);
    if (config.expires !== undefined) sec.expires(config.expires);
    for (const e of asArray(config.encryption)) sec.encryption(e);
    for (const a of asArray(config.acknowledgments)) sec.acknowledgments(a);
    for (const l of asArray(config.preferredLanguages ?? config.preferred_languages)) {
      sec.preferredLanguage(l);
    }
    if (config.canonical !== undefined) sec.canonical(config.canonical);
    if (config.policy !== undefined) sec.policy(config.policy);
    if (config.hiring !== undefined) sec.hiring(config.hiring);

    return sec;
  }

  path(): string {
    return "/.well-known/security.txt";
  }

  contentType(): string {
    return "text/plain";
  }

  contact(...contacts: string[]): this {
    this.contacts.push(...contacts);
    return this;
  }

  /** @param when A Date or any string parseable by `new Date(...)`. */
  expires(when: Date | string): this {
    this.expiresAt = when instanceof Date ? when : new Date(when);
    return this;
  }

  encryption(...urls: string[]): this {
    this.encryptions.push(...urls);
    return this;
  }

  acknowledgments(...urls: string[]): this {
    this.acknowledgmentsList.push(...urls);
    return this;
  }

  preferredLanguage(...langs: string[]): this {
    this.preferredLanguages.push(...langs);
    return this;
  }

  canonical(url: string): this {
    this.canonicalValue = url;
    return this;
  }

  policy(url: string): this {
    this.policyValue = url;
    return this;
  }

  hiring(url: string): this {
    this.hiringValue = url;
    return this;
  }

  render(): string {
    const lines: string[] = [];

    for (const c of this.contacts) lines.push("Contact: " + c);
    if (this.expiresAt !== null) {
      lines.push("Expires: " + toRfc3339(this.expiresAt));
    }
    for (const e of this.encryptions) lines.push("Encryption: " + e);
    for (const a of this.acknowledgmentsList) lines.push("Acknowledgments: " + a);
    if (this.preferredLanguages.length > 0) {
      lines.push("Preferred-Languages: " + this.preferredLanguages.join(", "));
    }
    if (this.canonicalValue !== null) lines.push("Canonical: " + this.canonicalValue);
    if (this.policyValue !== null) lines.push("Policy: " + this.policyValue);
    if (this.hiringValue !== null) lines.push("Hiring: " + this.hiringValue);

    return lines.join("\n") + "\n";
  }

  validate(): string[] {
    const issues: string[] = [];

    if (this.contacts.length === 0) {
      issues.push("security.txt requires at least one Contact field");
    }

    if (this.expiresAt === null) {
      issues.push("security.txt requires an Expires field");
    } else if (this.expiresAt.getTime() <= Date.now()) {
      issues.push("security.txt Expires is in the past — update it");
    }

    return issues;
  }
}

/** RFC 3339 timestamp, e.g. 2099-01-01T00:00:00+00:00 (UTC). */
function toRfc3339(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}+00:00`
  );
}

function asArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
