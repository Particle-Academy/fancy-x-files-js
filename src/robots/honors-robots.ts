import { RobotsPolicy } from "./robots-policy.js";

/**
 * One honest robots guard for scrapers — a thin convenience wrapper over
 * {@link RobotsPolicy} so a crawler can obey a target site's robots.txt with
 * correct, default-open precedence.
 */
export class HonorsRobots {
  private constructor(private readonly policy: RobotsPolicy) {}

  /** Build a reusable guard from a robots.txt body. */
  static forRobotsTxt(robotsTxt: string): HonorsRobots {
    return new HonorsRobots(RobotsPolicy.parse(robotsTxt));
  }

  /** One-shot, framework-free: may `userAgent` fetch `path`? */
  static allows(robotsTxt: string, path: string, userAgent = "*"): boolean {
    return RobotsPolicy.parse(robotsTxt).allowed(path, userAgent);
  }

  mayFetch(path: string, userAgent = "*"): boolean {
    return this.policy.allowed(path, userAgent);
  }
}
