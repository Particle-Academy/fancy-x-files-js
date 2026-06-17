import { describe, it, expect } from "vitest";
import { RobotsTxt } from "../src/index.js";

describe("RobotsTxt", () => {
  it("renders groups with ordered allow/disallow and sitemaps at the end", () => {
    const robots = RobotsTxt.make()
      .userAgent("*")
      .disallow("/tmp")
      .allow("/public")
      .userAgent("Googlebot")
      .disallow("/no-google")
      .crawlDelay(5)
      .sitemap("https://example.test/sitemap.xml")
      .host("example.test");

    const out = robots.render();

    expect(out).toContain("User-agent: *");
    expect(out).toContain("Disallow: /tmp");
    expect(out).toContain("Allow: /public");
    expect(out).toContain("User-agent: Googlebot");
    expect(out).toContain("Crawl-delay: 5");
    expect(out).toContain("Host: example.test");
    expect(out).toContain("Sitemap: https://example.test/sitemap.xml");

    // Within the * group, Disallow /tmp precedes Allow /public.
    expect(out.indexOf("Disallow: /tmp")).toBeLessThan(out.indexOf("Allow: /public"));
    // Sitemap appears after the last group block.
    expect(out.indexOf("User-agent: Googlebot")).toBeLessThan(out.indexOf("Sitemap:"));
  });

  it("supports a userAgent array sharing one block", () => {
    const out = RobotsTxt.make().userAgent(["GPTBot", "CCBot"]).disallow("/x").render();

    expect(out).toContain("User-agent: GPTBot");
    expect(out).toContain("User-agent: CCBot");
    expect(out.split("Disallow: /x").length - 1).toBe(1);
  });

  it("renders a safe default when no groups are defined", () => {
    const out = RobotsTxt.make().render();
    expect(out).toContain("User-agent: *");
    expect(out).toContain("Disallow:");
  });

  it("builds from a JSON-friendly object via fromArray", () => {
    const out = RobotsTxt.fromArray({
      groups: [
        { userAgent: "*", disallow: ["/tmp"], allow: ["/public"] },
        { userAgent: ["GPTBot", "CCBot"], disallow: "/", crawlDelay: 10 },
      ],
      sitemaps: ["https://example.test/sitemap.xml"],
      host: "example.test",
      protect: ["/admin"],
    }).render();

    expect(out).toContain("Disallow: /tmp");
    expect(out).toContain("Crawl-delay: 10");
    expect(out).toContain("Disallow: /admin");
    expect(out).toContain("Sitemap: https://example.test/sitemap.xml");
  });

  // --- Regression: the motivating /admin leak bug ---------------------------

  it("keeps a protected path Disallowed for EVERY group and never Allowed", () => {
    const robots = RobotsTxt.make()
      .userAgent("*")
      .disallow("/")
      .allowAll()
      .userAgent("GPTBot")
      .allow("/") // a permissive per-AI-bot Allow…
      .allow("/admin") // …even an explicit attempt to allow /admin
      .protect("/admin"); // protect() must win

    const out = robots.render();

    // /admin never appears as an Allow anywhere in the file.
    expect(out).not.toMatch(/Allow:\s*\/admin\b/);

    // Each group carries a Disallow: /admin (the * group and the GPTBot group).
    expect(out.split("Disallow: /admin").length - 1).toBeGreaterThanOrEqual(2);

    // The evaluator agrees for the named AI bot and the wildcard.
    const policy = robots.policy();
    expect(policy.allowed("/admin", "GPTBot")).toBe(false);
    expect(policy.allowed("/admin", "*")).toBe(false);
  });

  it("protects paths added to groups created AFTER protect() is called", () => {
    const robots = RobotsTxt.make()
      .protect("/admin") // protect first…
      .userAgent("GPTBot") // …then add a bot group
      .allow("/admin"); // attempt to allow — must be dropped

    const out = robots.render();

    expect(out).not.toMatch(/Allow:\s*\/admin\b/);
    expect(out).toContain("Disallow: /admin");
    expect(robots.policy().allowed("/admin", "GPTBot")).toBe(false);
  });

  it("validate() is clean for a normal file and flags nothing under protect()", () => {
    const robots = RobotsTxt.make().userAgent("*").disallow("/");
    expect(robots.validate()).toEqual([]);
  });
});
