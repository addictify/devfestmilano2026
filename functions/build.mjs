// Bundles the Next route handlers into a single Cloud Function.
//
// The handlers are reused verbatim rather than reimplemented here: they're
// already plain (Request) => Response functions. Only the Next-specific imports
// are swapped out, so there is exactly one copy of every rule about who may do
// what — a second copy would drift.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");

await build({
  entryPoints: [resolve(here, "src/index.ts")],
  outfile: resolve(here, "lib/index.js"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  // Provided by the runtime; bundling them would bloat the deploy.
  external: ["firebase-admin", "firebase-admin/*", "firebase-functions", "firebase-functions/*"],
  alias: {
    "@": resolve(repo, "src"),
    // Next's bundler guard: throws in plain Node, means nothing here.
    "server-only": resolve(here, "src/shims/empty.ts"),
    "next/server": resolve(here, "src/shims/next-server.ts"),
    "next/cache": resolve(here, "src/shims/next-cache.ts"),
  },
  banner: {
    js: "import{createRequire}from'node:module';const require=createRequire(import.meta.url);",
  },
  logLevel: "info",
});
