// Shared lint rules for the plain-JS packages. apps/web has its own config (Next.js rules).
import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "apps/**",
      "prototype/**",
      "design/**",
      "tools/**",
      "services/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["packages/**/*.js", "packages/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
    },
    rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^_" }] },
  },
  { files: ["packages/**/*.test.js"], languageOptions: { globals: { ...globals.jest } } },
];
