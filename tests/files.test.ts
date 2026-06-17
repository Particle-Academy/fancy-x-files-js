import { describe, it, expect } from "vitest";
import {
  AgentsTxt,
  HumansTxt,
  LlmsTxt,
  SecurityTxt,
  Sitemap,
} from "../src/index.js";

// --- SecurityTxt -------------------------------------------------------------

describe("SecurityTxt", () => {
  it("renders security.txt fields one per line", () => {
    const inOneYear = new Date(Date.now() + 365 * 24 * 3600 * 1000);
    const sec = SecurityTxt.make()
      .contact("mailto:sec@example.test")
      .contact("https://example.test/report")
      .expires(inOneYear)
      .encryption("https://example.test/pgp.txt")
      .preferredLanguage("en", "fr")
      .canonical("https://example.test/.well-known/security.txt")
      .policy("https://example.test/policy");

    const out = sec.render();

    expect(sec.path()).toBe("/.well-known/security.txt");
    expect(out).toContain("Contact: mailto:sec@example.test");
    expect(out).toContain("Contact: https://example.test/report");
    expect(out).toContain("Expires: ");
    expect(out).toContain("Encryption: https://example.test/pgp.txt");
    expect(out).toContain("Preferred-Languages: en, fr");
    expect(out).toContain("Canonical: ");
    expect(out).toContain("Policy: https://example.test/policy");

    expect(sec.validate()).toEqual([]);
  });

  it("flags missing contact and past expiry in security.txt", () => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    const missingContact = SecurityTxt.make().expires(tomorrow);
    expect(missingContact.validate()).toContain(
      "security.txt requires at least one Contact field",
    );

    const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
    const pastExpiry = SecurityTxt.make()
      .contact("mailto:sec@example.test")
      .expires(yesterday);
    expect(pastExpiry.validate()).toContain(
      "security.txt Expires is in the past — update it",
    );
  });

  it("accepts an expires string and renders RFC3339", () => {
    const sec = SecurityTxt.make()
      .contact("mailto:x@y.z")
      .expires("2099-01-01T00:00:00+00:00");
    expect(sec.render()).toContain("Expires: 2099-01-01T00:00:00+00:00");
    expect(sec.validate()).toEqual([]);
  });
});

// --- LlmsTxt -----------------------------------------------------------------

describe("LlmsTxt", () => {
  it("renders the llms.txt markdown format", () => {
    const llms = LlmsTxt.make("Acme Docs")
      .summary("Everything an LLM needs about Acme.")
      .details("Acme builds widgets.")
      .section("Docs", [
        { title: "Guide", url: "https://example.test/guide", notes: "start here" },
        { title: "API", url: "https://example.test/api" },
      ]);

    const out = llms.render();

    expect(llms.path()).toBe("/llms.txt");
    expect(out.startsWith("# Acme Docs")).toBe(true);
    expect(out).toContain("> Everything an LLM needs about Acme.");
    expect(out).toContain("Acme builds widgets.");
    expect(out).toContain("## Docs");
    expect(out).toContain("- [Guide](https://example.test/guide): start here");
    expect(out).toContain("- [API](https://example.test/api)");

    expect(llms.validate()).toEqual([]);
  });

  it("flags a missing llms.txt title", () => {
    expect(LlmsTxt.make("").validate()).toContain("llms.txt requires a title (H1)");
  });
});

// --- HumansTxt ---------------------------------------------------------------

describe("HumansTxt", () => {
  it("renders humans.txt sections of label: value", () => {
    const humans = HumansTxt.make()
      .section("TEAM", [{ label: "Developer", value: "Ada" }])
      .line("THANKS", "Coffee", "always");

    const out = humans.render();

    expect(humans.path()).toBe("/humans.txt");
    expect(out).toContain("/* TEAM */");
    expect(out).toContain("Developer: Ada");
    expect(out).toContain("/* THANKS */");
    expect(out).toContain("Coffee: always");
  });

  it("flags an empty humans.txt", () => {
    expect(HumansTxt.make().validate()).toContain("humans.txt has no sections");
  });
});

// --- Sitemap -----------------------------------------------------------------

describe("Sitemap", () => {
  it("renders a well-formed sitemap urlset", () => {
    const sitemap = Sitemap.make()
      .url("https://example.test/", {
        lastmod: "2026-01-01",
        changefreq: "daily",
        priority: "1.0",
      })
      .url("https://example.test/about");

    const out = sitemap.render();

    expect(sitemap.path()).toBe("/sitemap.xml");
    expect(sitemap.contentType()).toBe("application/xml");
    expect(out).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(out).toContain("<loc>https://example.test/</loc>");
    expect(out).toContain("<lastmod>2026-01-01</lastmod>");
    expect(out).toContain("<changefreq>daily</changefreq>");
    expect(out).toContain("<priority>1.0</priority>");

    // Two <url> entries.
    expect(out.split("<url>").length - 1).toBe(2);

    expect(sitemap.validate()).toEqual([]);
  });

  it("escapes special characters in sitemap loc", () => {
    const out = Sitemap.make().url("https://example.test/?a=1&b=2").render();
    expect(out).toContain("https://example.test/?a=1&amp;b=2");
  });

  it("flags an empty sitemap", () => {
    expect(Sitemap.make().validate()).toContain("sitemap.xml has no URLs");
  });
});

// --- AgentsTxt ---------------------------------------------------------------

describe("AgentsTxt", () => {
  it("renders an agents manifest as markdown", () => {
    const agents = AgentsTxt.make("Acme Agents")
      .intro("What agents may do here.")
      .capability("read public docs")
      .contact("mailto:agents@example.test")
      .policy("https://example.test/agent-policy");

    const out = agents.render();

    expect(agents.path()).toBe("/ai.txt");
    expect(out.startsWith("# Acme Agents")).toBe(true);
    expect(out).toContain("What agents may do here.");
    expect(out).toContain("- Capability: read public docs");
    expect(out).toContain("- Contact: mailto:agents@example.test");
    expect(out).toContain("- Policy: https://example.test/agent-policy");
  });

  it("can serve the agents manifest at .well-known/agents.md", () => {
    expect(AgentsTxt.make("X").at("/.well-known/agents.md").path()).toBe(
      "/.well-known/agents.md",
    );
  });
});
