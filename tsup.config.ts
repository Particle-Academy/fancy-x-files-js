import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  // Pure, dependency-free, isomorphic core — no node builtins, runs in the
  // browser, workers, Next/Astro route handlers, and Node alike.
  platform: "neutral",
  treeshake: true,
});
