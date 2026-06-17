import type { Registry } from "./registry.js";

/** A framework-agnostic, plain-object HTTP response for a well-known file. */
export interface WellKnownResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Resolve a well-known file from the registry into a plain response object —
 * `null` when nothing is registered at that path (so the host can 404).
 *
 * Framework-agnostic: returns plain data. Use it from any Node/edge handler,
 * or {@link toResponse} for a Web-standard `Response`.
 */
export function wellKnownResponse(
  registry: Registry,
  path: string,
): WellKnownResponse | null {
  const file = registry.get(path);
  if (file === null) return null;

  return {
    status: 200,
    headers: {
      "Content-Type": file.contentType(),
      "Cache-Control": "public, max-age=3600",
    },
    body: file.render(),
  };
}

/**
 * Convenience for Web-standard hosts (Next.js route handlers, Astro endpoints,
 * Cloudflare/Deno workers): resolve a well-known file into a `Response`, or
 * `null` when the path is unknown.
 */
export function toResponse(registry: Registry, path: string): Response | null {
  const res = wellKnownResponse(registry, path);
  if (res === null) return null;

  return new Response(res.body, { status: res.status, headers: res.headers });
}
