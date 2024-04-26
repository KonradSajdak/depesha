// @ts-check

import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import prettier from "eslint-config-prettier"
import unusedImports from "eslint-plugin-unused-imports"

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: [
      "./src/**/*.ts",
      "./src/**/*.js",
      "./tests/**/*.ts",
      "./tests/**/*.js",
    ],
    plugins: { unusedImports },
    rules: {
      indent: ["error", 2],
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "double"],
      semi: ["error", "never"],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": { fixToUnknown: true },
      "unusedImports/no-unused-imports": "error",
    },
  },
  prettier,
]
