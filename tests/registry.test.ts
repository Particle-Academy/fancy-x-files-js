import { describe, it, expect } from "vitest";
import {
  HumansTxt,
  Registry,
  RobotsTxt,
  Sitemap,
  wellKnownResponse,
  toResponse,
} from "../src/index.js";

describe("Registry", () => {
  it("adds, gets, renders, and lists paths", () => {
    const registry = new Registry()
      .add(RobotsTxt.make().userAgent("*").disallow("/x"))
      .add(HumansTxt.make().section("TEAM", [{ label: "Dev", value: "Ada" }]));

    expect(registry.paths()).toContain("/robots.txt");
    expect(registry.paths()).toContain("/humans.txt");
    expect(registry.get("/robots.txt")).toBeInstanceOf(RobotsTxt);
    // normalizes a leading slash
    expect(registry.get("robots.txt")).toBeInstanceOf(RobotsTxt);
    expect(registry.has("/humans.txt")).toBe(true);
    expect(registry.get("/missing.txt")).toBeNull();
    expect(registry.render("/robots.txt")).toContain("Disallow: /x");
    expect(registry.render("/missing.txt")).toBeNull();
    expect(registry.all()).toHaveLength(2);
  });

  it("validates the whole registry and reports per-file issues", () => {
    const registry = new Registry().add(Sitemap.make()); // empty => invalid
    const issues = registry.validate();

    expect(issues).toHaveProperty("/sitemap.xml");
    expect(issues["/sitemap.xml"]).toContain("sitemap.xml has no URLs");
  });

  it("reports an empty registry", () => {
    expect(new Registry().validate()).toHaveProperty("");
  });
});

describe("serve helpers", () => {
  const registry = new Registry().add(
    RobotsTxt.make().userAgent("*").disallow("/private"),
  );

  it("wellKnownResponse returns body, content-type, and cache header", () => {
    const res = wellKnownResponse(registry, "/robots.txt");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(200);
    expect(res!.headers["Content-Type"]).toBe("text/plain");
    expect(res!.headers["Cache-Control"]).toContain("max-age");
    expect(res!.body).toContain("Disallow: /private");
  });

  it("wellKnownResponse normalizes a leading slash", () => {
    expect(wellKnownResponse(registry, "robots.txt")).not.toBeNull();
  });

  it("wellKnownResponse returns null for an unknown path", () => {
    expect(wellKnownResponse(registry, "/nope.txt")).toBeNull();
  });

  it("toResponse returns a Web-standard Response", async () => {
    const res = toResponse(registry, "/robots.txt");
    expect(res).toBeInstanceOf(Response);
    expect(res!.status).toBe(200);
    expect(res!.headers.get("Content-Type")).toBe("text/plain");
    expect(await res!.text()).toContain("Disallow: /private");
  });

  it("toResponse returns null for an unknown path", () => {
    expect(toResponse(registry, "/nope.txt")).toBeNull();
  });
});
