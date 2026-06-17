/**
 * A single "well-known" file served at a fixed path.
 *
 * Implementations are framework-agnostic value builders: they own their path,
 * their content type, and how to render their body. The {@link Registry}
 * collects them and any host (Next, Astro, a worker, plain Node) serves them.
 */
export interface WellKnownFile {
  /**
   * The request path this file is served at, with a leading slash.
   * Examples: "/robots.txt", "/.well-known/security.txt", "/sitemap.xml".
   */
  path(): string;

  /** The MIME content type for the rendered body, e.g. "text/plain". */
  contentType(): string;

  /** Render the file body as a string. */
  render(): string;

  /**
   * Validate the file; return a list of human-readable issue strings.
   * An empty array means the file is valid.
   */
  validate(): string[];
}
