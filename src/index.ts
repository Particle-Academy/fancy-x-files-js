// Contract + registry (the single source of truth).
export type { WellKnownFile } from "./well-known-file.js";
export { Registry } from "./registry.js";

// File builders.
export { RobotsTxt, type RobotsTxtConfig } from "./files/robots-txt.js";
export {
  SecurityTxt,
  type SecurityTxtConfig,
} from "./files/security-txt.js";
export {
  LlmsTxt,
  type LlmsTxtConfig,
  type LlmsLink,
} from "./files/llms-txt.js";
export {
  HumansTxt,
  type HumansTxtConfig,
  type HumansEntry,
} from "./files/humans-txt.js";
export {
  Sitemap,
  type SitemapConfig,
  type SitemapUrlOptions,
} from "./files/sitemap.js";
export {
  AgentsTxt,
  type AgentsTxtConfig,
} from "./files/agents-txt.js";

// Robots evaluator (scraper side) + the honest guard.
export { RobotsPolicy } from "./robots/robots-policy.js";
export { HonorsRobots } from "./robots/honors-robots.js";

// Serve helpers (Node / Next / Astro / workers).
export {
  wellKnownResponse,
  toResponse,
  type WellKnownResponse,
} from "./serve.js";
