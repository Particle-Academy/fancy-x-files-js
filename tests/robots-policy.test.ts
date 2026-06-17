import { describe, it, expect } from "vitest";
import { RobotsPolicy, HonorsRobots } from "../src/index.js";

describe("RobotsPolicy", () => {
  it("is default-open when nothing matches", () => {
    const policy = RobotsPolicy.parse("User-agent: *\nDisallow: /private\n");
    expect(policy.allowed("/anything")).toBe(true);
    expect(policy.allowed("/private")).toBe(false);
  });

  it("treats an empty robots.txt as fully open", () => {
    const policy = RobotsPolicy.parse("");
    expect(policy.allowed("/anything")).toBe(true);
  });

  it("treats an empty Disallow as allow-all", () => {
    const policy = RobotsPolicy.parse("User-agent: *\nDisallow:\n");
    expect(policy.allowed("/admin")).toBe(true);
  });

  it("lets the longest matching rule win", () => {
    const policy = RobotsPolicy.parse("User-agent: *\nDisallow: /a\nAllow: /a/b\n");
    // /a/b/c matches both; Allow /a/b is longer => allowed.
    expect(policy.allowed("/a/b/c")).toBe(true);
    // /a/x only matches Disallow /a => blocked.
    expect(policy.allowed("/a/x")).toBe(false);
  });

  it("lets Allow beat Disallow at equal specificity (Google rule)", () => {
    const policy = RobotsPolicy.parse("User-agent: *\nDisallow: /page\nAllow: /page\n");
    expect(policy.allowed("/page")).toBe(true);
  });

  it("uses the UA-specific group over * when the UA matches", () => {
    const policy = RobotsPolicy.parse(
      "User-agent: *\nDisallow:\n\nUser-agent: GPTBot\nDisallow: /\n",
    );
    expect(policy.allowed("/x", "GPTBot")).toBe(false);
    expect(policy.allowed("/x", "Googlebot")).toBe(true);
    expect(policy.allowed("/x")).toBe(true);
  });

  it("honors $ end-anchors and * wildcards", () => {
    const policy = RobotsPolicy.parse("User-agent: *\nDisallow: /*.pdf$\n");
    expect(policy.allowed("/files/report.pdf")).toBe(false);
    expect(policy.allowed("/files/report.pdf?v=2")).toBe(true);
    expect(policy.allowed("/files/report.txt")).toBe(true);
  });

  it("exposes one honest robots guard for scrapers (HonorsRobots)", () => {
    const robots = "User-agent: *\nDisallow: /private\n";

    expect(HonorsRobots.allows(robots, "/public")).toBe(true);
    expect(HonorsRobots.allows(robots, "/private")).toBe(false);

    const guard = HonorsRobots.forRobotsTxt(robots);
    expect(guard.mayFetch("/public")).toBe(true);
    expect(guard.mayFetch("/private")).toBe(false);
  });
});
