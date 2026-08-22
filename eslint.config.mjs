import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored agent-skill scripts — not our code, and they drown the real
    // warnings (397 of them came from here).
    ".claude/**",
    ".cursor/**",
    ".gemini/**",
    ".impeccable/**",
    // esbuild output, not hand-written source.
    "functions/lib/**",
  ]),
  {
    rules: {
      // `const { uid, ...rest } = obj` is how you omit a key — the discarded
      // sibling isn't dead code. Underscore-prefixed names stay opt-out too.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { ignoreRestSiblings: true, argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
