import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "prettier",
  ),
  {
    rules: {
      // Possible Problems
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "ignoreRestSiblings": true,
        "args": "after-used",
        "vars": "all",
      }],
      "no-unused-vars": "off", // Turn off the base rule as it can report incorrect errors
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-duplicate-imports": "error",
      "no-template-curly-in-string": "error",

      // Suggestions
      "arrow-body-style": ["error", "as-needed"],
      "camelcase": ["error", { "properties": "never" }],
      "curly": ["error", "multi-line"],
      "default-case": "error",
      "eqeqeq": ["error", "always"],
      "no-else-return": "error",
      "no-empty-function": "error",
      "no-var": "error",
      "prefer-const": "error",
      "prefer-template": "error",

      // Layout & Formatting
      "array-bracket-spacing": ["error", "never"],
      "arrow-spacing": "error",
      "block-spacing": "error",
      "brace-style": ["error", "1tbs"],
      "comma-dangle": ["error", "always-multiline"],
      "comma-spacing": ["error", { "before": false, "after": true }],
      "eol-last": "error",
      "indent": ["error", 2],
      "key-spacing": ["error", { "beforeColon": false, "afterColon": true }],
      "keyword-spacing": ["error", { "before": true, "after": true }],
      "no-multi-spaces": "error",
      "no-multiple-empty-lines": ["error", { "max": 1, "maxEOF": 0 }],
      "object-curly-spacing": ["error", "always"],
      "quotes": ["error", "double"],
      "semi": ["error", "always"],
      "space-before-blocks": "error",
      "space-before-function-paren": ["error", {
        "anonymous": "always",
        "named": "never",
        "asyncArrow": "always",
      }],
      "space-in-parens": ["error", "never"],
      "space-infix-ops": "error",
    },
  },
];

export default eslintConfig;
